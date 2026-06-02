import type { WbsStage, WbsStageMetrics, WbsStatusKey } from "./types";

export const WBS_STATUS_OPTS: {
	value: WbsStatusKey;
	label: string;
	badge: string;
	dot: string;
}[] = [
	{
		value: "not_started",
		label: "Не начат",
		badge: "bg-gray-100 text-gray-600 border-gray-200",
		dot: "bg-gray-400",
	},
	{
		value: "in_progress",
		label: "В работе",
		badge: "bg-blue-100 text-blue-700 border-blue-200",
		dot: "bg-blue-500",
	},
	{
		value: "on_track",
		label: "В графике",
		badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
		dot: "bg-emerald-500",
	},
	{
		value: "at_risk",
		label: "Под риском",
		badge: "bg-amber-100 text-amber-700 border-amber-200",
		dot: "bg-amber-500",
	},
	{
		value: "behind",
		label: "Отстаёт",
		badge: "bg-rose-100 text-rose-700 border-rose-200",
		dot: "bg-rose-500",
	},
	{
		value: "over_budget",
		label: "Перерасход",
		badge: "bg-rose-100 text-rose-800 border-rose-300",
		dot: "bg-rose-600",
	},
	{
		value: "completed",
		label: "Завершён",
		badge: "bg-blue-100 text-blue-800 border-blue-200",
		dot: "bg-blue-600",
	},
];

const LEGACY_MAP: Record<string, WbsStatusKey> = {
	planned: "not_started",
	active: "in_progress",
	paused: "at_risk",
	completed: "completed",
};

export function normalizeWbsStatus(raw: string): WbsStatusKey {
	if (WBS_STATUS_OPTS.some((o) => o.value === raw)) return raw as WbsStatusKey;
	return LEGACY_MAP[raw] ?? "not_started";
}

export function inferWbsStatus(stage: WbsStage, issueCount: number): WbsStatusKey {
	const explicit = normalizeWbsStatus(stage.status);
	if (explicit !== "not_started" || stage.status !== "planned") {
		if (explicit === "completed" || stage.status === "completed") return "completed";
		if (explicit !== "not_started") return explicit;
	}

	const progress = Number(stage.progress) || 0;
	if (progress >= 100 || stage.actualEndDate) return "completed";
	if (progress <= 0 && !stage.startDate) return "not_started";

	const end = stage.plannedEndDate;
	if (end && progress < 100) {
		const due = new Date(end);
		const now = new Date();
		if (due < now) return "behind";
		if (issueCount > 0) return "at_risk";
	}

	if (progress > 0) return issueCount > 0 ? "at_risk" : "on_track";
	return "not_started";
}

export function statusMeta(key: WbsStatusKey) {
	return WBS_STATUS_OPTS.find((o) => o.value === key) ?? WBS_STATUS_OPTS[0];
}

/** Статус этапа с учётом графика и освоения бюджета (расходы по stageId). */
export function inferStageStatus(
	stage: WbsStage,
	metrics: Pick<WbsStageMetrics, "issueCount" | "deviationKgs" | "budgetKgs">,
): WbsStatusKey {
	if (metrics.budgetKgs > 0 && metrics.deviationKgs > 0) return "over_budget";
	return inferWbsStatus(stage, metrics.issueCount);
}
