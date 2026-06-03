import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeStageMetricsMap } from "./metrics";
import { inferStageStatus } from "./status";
import type { WbsExpenseRow, WbsStage, WbsTaskSummary } from "./types";

const stage = (partial: Partial<WbsStage> & Pick<WbsStage, "id" | "name">): WbsStage => ({
	projectId: 1,
	status: "in_progress",
	progress: 40,
	budgetAmount: "100000",
	...partial,
});

describe("computeStageMetricsMap", () => {
	it("суммирует расходы по stageId и показывает перерасход >100%", () => {
		const stages: WbsStage[] = [
			stage({ id: 1, name: "Фундамент", budgetAmount: "100000" }),
		];
		const expenses: WbsExpenseRow[] = [
			{ id: 1, projectId: 1, stageId: 1, amountKgs: "150000", amount: "150000" },
		];
		const metrics = computeStageMetricsMap(stages, [], expenses);
		const m = metrics.get(1)!;
		assert.equal(m.spentKgs, 150_000);
		assert.equal(m.remainderKgs, -50_000);
		assert.equal(m.deviationKgs, 50_000);
		assert.equal(m.factPct, 150);
		assert.equal(inferStageStatus(stages[0], m), "over_budget");
	});

	it("rollup: расход на подэтапе входит в бюджет родителя", () => {
		const stages: WbsStage[] = [
			stage({ id: 10, name: "Корпус", budgetAmount: "500000" }),
			stage({ id: 11, name: "Кровля", parentStageId: 10, budgetAmount: "100000" }),
		];
		const expenses: WbsExpenseRow[] = [
			{ id: 1, projectId: 1, stageId: 11, amountKgs: "80000" },
		];
		const metrics = computeStageMetricsMap(stages, [], expenses);
		assert.equal(metrics.get(11)?.spentKgs, 80_000);
		assert.equal(metrics.get(10)?.spentKgs, 80_000);
		assert.equal(metrics.get(10)?.remainderKgs, 520_000);
	});

	it("игнорирует расходы без stageId", () => {
		const stages: WbsStage[] = [stage({ id: 1, name: "Этап" })];
		const expenses: WbsExpenseRow[] = [
			{ id: 1, projectId: 1, stageId: null, amountKgs: "50000" },
		];
		const metrics = computeStageMetricsMap(stages, [], expenses);
		assert.equal(metrics.get(1)?.spentKgs, 0);
	});
});

describe("inferStageStatus budget", () => {
	it("over_budget при deviationKgs > 0 даже при низком progress", () => {
		const s = stage({ id: 2, name: "Отделка", progress: 10, budgetAmount: "200000" });
		const metrics = {
			issueCount: 0,
			deviationKgs: 1,
			budgetKgs: 200_000,
		};
		assert.equal(inferStageStatus(s, metrics), "over_budget");
	});
});
