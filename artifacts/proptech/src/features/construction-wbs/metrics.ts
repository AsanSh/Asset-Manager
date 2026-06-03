import { inferStageStatus } from "./status";
import { buildChildrenMap, stageParentId } from "./tree";
import type {
	FlatWbsNode,
	WbsExpenseRow,
	WbsStage,
	WbsStageMetrics,
	WbsTaskSummary,
} from "./types";

function parseKgs(v?: string | null): number {
	return parseFloat(v || "0") || 0;
}

function isTaskIssue(t: WbsTaskSummary): boolean {
	if (t.status === "done") return false;
	if (Number(t.blockedByCount) > 0) return true;
	if (t.dueDate && new Date(t.dueDate) < new Date()) return true;
	return false;
}

export function computeStageMetricsMap(
	stages: WbsStage[],
	tasks: WbsTaskSummary[],
	expenses: WbsExpenseRow[],
): Map<number, WbsStageMetrics> {
	const stageIds = new Set(stages.map((s) => s.id));
	const childrenMap = buildChildrenMap(stages);

	const directTasks = new Map<number, WbsTaskSummary[]>();
	for (const t of tasks) {
		const sid = t.stageId != null ? Number(t.stageId) : null;
		if (sid == null || !stageIds.has(sid)) continue;
		const arr = directTasks.get(sid) ?? [];
		arr.push(t);
		directTasks.set(sid, arr);
	}

	const directSpent = new Map<number, number>();
	for (const e of expenses) {
		const sid = e.stageId != null ? Number(e.stageId) : null;
		if (sid == null || !stageIds.has(sid)) continue;
		directSpent.set(sid, (directSpent.get(sid) ?? 0) + parseKgs(e.amountKgs ?? e.amount));
	}

	const metrics = new Map<number, WbsStageMetrics>();

	function rollup(stageId: number): WbsStageMetrics {
		const cached = metrics.get(stageId);
		if (cached) return cached;

		const stage = stages.find((s) => s.id === stageId)!;
		const childStages = childrenMap.get(stageId) ?? [];
		const childRollups = childStages.map((c) => rollup(c.id));

		const taskList = directTasks.get(stageId) ?? [];
		const taskCount =
			taskList.length + childRollups.reduce((s, c) => s + c.taskCount, 0);
		const issueCount =
			taskList.filter(isTaskIssue).length +
			childRollups.reduce((s, c) => s + c.issueCount, 0);

		const budgetKgs =
			parseKgs(stage.budgetAmount) +
			childRollups.reduce((s, c) => s + c.budgetKgs, 0);
		const spentKgs =
			(directSpent.get(stageId) ?? 0) +
			childRollups.reduce((s, c) => s + c.spentKgs, 0);
		const remainderKgs = budgetKgs - spentKgs;
		const deviationKgs = spentKgs - budgetKgs;

		const ownProgress = Number(stage.progress) || 0;
		const childProgress =
			childRollups.length > 0
				? Math.round(
						childRollups.reduce((s, c) => s + c.effectiveProgress, 0) /
							childRollups.length,
					)
				: 0;
		const effectiveProgress =
			ownProgress > 0 ? ownProgress : childRollups.length > 0 ? childProgress : 0;

		const planPct = effectiveProgress;
		// Не ограничиваем 100% — Гант и таблица показывают перерасход (>100%)
		const factPct =
			budgetKgs > 0 ? Math.round((spentKgs / budgetKgs) * 100) : spentKgs > 0 ? 100 : 0;

		const row: WbsStageMetrics = {
			budgetKgs,
			spentKgs,
			remainderKgs,
			deviationKgs,
			planPct,
			factPct,
			taskCount,
			issueCount,
			childCount: childStages.length,
			effectiveProgress,
		};
		metrics.set(stageId, row);
		return row;
	}

	for (const s of stages) rollup(s.id);
	return metrics;
}

export function computeProjectDashboard(
	stages: WbsStage[],
	flat: FlatWbsNode[],
	tasks: WbsTaskSummary[],
) {
	const roots = stages.filter((s) => stageParentId(s) == null);
	const metricsList = flat.map((n) => n.metrics);

	const budgetKgs = metricsList
		.filter((_, i) => flat[i].depth === 0)
		.reduce((s, m) => s + m.budgetKgs, 0);
	const spentKgs = metricsList
		.filter((_, i) => flat[i].depth === 0)
		.reduce((s, m) => s + m.spentKgs, 0);

	const avgProgress = roots.length
		? Math.round(
				roots.reduce((s, r) => {
					const m = flat.find((n) => n.id === r.id)?.metrics;
					return s + (m?.effectiveProgress ?? r.progress ?? 0);
				}, 0) / roots.length,
			)
		: 0;

	const planProgress = avgProgress;
	const factProgress = budgetKgs > 0 ? Math.round((spentKgs / budgetKgs) * 100) : avgProgress;
	const lagPct = Math.max(0, planProgress - factProgress);

	const risks = flat.filter((n) => {
		const st = inferStageStatus(n.stage, n.metrics);
		return st === "at_risk" || st === "behind" || st === "over_budget";
	}).length;

	const budgetOverruns = flat.filter(
		(n) => n.metrics.budgetKgs > 0 && n.metrics.deviationKgs > 0,
	).length;

	const overdueTasks = tasks.filter(isTaskIssue).length;

	return {
		totalStages: stages.length,
		rootStages: roots.length,
		avgProgress,
		planProgress,
		factProgress,
		lagPct,
		budgetKgs,
		spentKgs,
		remainderKgs: budgetKgs - spentKgs,
		risks,
		budgetOverruns,
		overdueTasks,
	};
}
