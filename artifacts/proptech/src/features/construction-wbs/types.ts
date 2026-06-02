export interface WbsStage {
	id: number;
	projectId: number;
	parentStageId?: number | null;
	name: string;
	description?: string;
	status: string;
	progress: number;
	startDate?: string | null;
	plannedEndDate?: string | null;
	actualEndDate?: string | null;
	budgetAmount?: string | null;
	sortOrder: number;
	createdAt: string;
}

export interface WbsTaskSummary {
	id: number;
	stageId?: number | null;
	status: string;
	dueDate?: string | null;
	blockedByCount?: number;
}

export interface WbsExpenseRow {
	id: number;
	projectId: number;
	stageId?: number | null;
	amountKgs?: string | null;
	amount?: string | null;
}

export interface WbsStageMetrics {
	budgetKgs: number;
	spentKgs: number;
	remainderKgs: number;
	deviationKgs: number;
	planPct: number;
	factPct: number;
	taskCount: number;
	issueCount: number;
	childCount: number;
	/** Ролled-up from descendants when own progress is 0 */
	effectiveProgress: number;
}

export interface FlatWbsNode {
	id: number;
	stage: WbsStage;
	depth: number;
	parentId: number | null;
	wbsCode: string;
	childrenCount: number;
	metrics: WbsStageMetrics;
}

export type WbsViewMode = "wbs" | "cards" | "table" | "gantt";

export type WbsStatusKey =
	| "not_started"
	| "in_progress"
	| "on_track"
	| "at_risk"
	| "behind"
	| "over_budget"
	| "completed";

/** Payload for AI / analytics extensions */
export interface WbsAiSignals {
	stageId: number;
	delayRiskScore: number;
	budgetOverrunPct: number;
	isOnCriticalPath: boolean;
	forecastEndDate?: string | null;
}

export type DialogState =
	| WbsStage
	| null
	| "new"
	| { parentStageId: number; projectId: number };

export interface ProjectOption {
	id: number;
	name: string;
}
