/** Фильтр Dashboard: проект, ОсОО и период. */

import {
	defaultPeriod,
	type PeriodPreset,
	type PeriodValue,
} from "@/components/period-picker";

export type DashboardScopeState = {
	projectId: number | null;
	legalEntityId: number | null;
	period: PeriodValue;
};

export const EMPTY_DASHBOARD_SCOPE: DashboardScopeState = {
	projectId: null,
	legalEntityId: null,
	period: defaultPeriod("all"),
};

export function parseScopeFromSearch(search: string): DashboardScopeState {
	const qs = new URLSearchParams(
		search.startsWith("?") ? search.slice(1) : search,
	);
	const projectRaw = qs.get("projectId");
	const legalRaw = qs.get("legalEntityId");
	const projectId =
		projectRaw && projectRaw !== "all" ? parseInt(projectRaw, 10) : null;
	const legalEntityId =
		legalRaw && legalRaw !== "all" ? parseInt(legalRaw, 10) : null;

	const from = qs.get("from");
	const to = qs.get("to");
	const presetRaw = qs.get("period") as PeriodPreset | null;
	const preset: PeriodPreset =
		presetRaw && presetRaw.length > 0 ? presetRaw : "all";
	const period: PeriodValue =
		from && to ? { preset, from, to } : defaultPeriod("all");

	return {
		projectId: Number.isFinite(projectId) ? projectId : null,
		legalEntityId: Number.isFinite(legalEntityId) ? legalEntityId : null,
		period,
	};
}

export function scopeToSearchParams(
	scope: DashboardScopeState,
	base?: URLSearchParams,
): URLSearchParams {
	const qs = new URLSearchParams(base?.toString() ?? "");
	if (scope.projectId != null) qs.set("projectId", String(scope.projectId));
	else qs.delete("projectId");
	if (scope.legalEntityId != null) {
		qs.set("legalEntityId", String(scope.legalEntityId));
	} else qs.delete("legalEntityId");
	if (scope.period.preset !== "all") {
		qs.set("period", scope.period.preset);
		qs.set("from", scope.period.from);
		qs.set("to", scope.period.to);
	} else {
		qs.delete("period");
		qs.delete("from");
		qs.delete("to");
	}
	return qs;
}

export function scopeToApiParams(scope: DashboardScopeState): Record<string, string> {
	const params: Record<string, string> = {};
	if (scope.projectId != null) params.projectId = String(scope.projectId);
	if (scope.legalEntityId != null) {
		params.legalEntityId = String(scope.legalEntityId);
	}
	if (scope.period.preset !== "all") {
		params.from = scope.period.from;
		params.to = scope.period.to;
	}
	return params;
}

export function matchesProjectScope(
	projectId: number | null | undefined,
	scope: DashboardScopeState,
): boolean {
	if (scope.projectId == null) return true;
	return Number(projectId) === scope.projectId;
}

export function matchesLegalEntityOnProject(
	project: { legalEntityId?: number | null },
	scope: DashboardScopeState,
): boolean {
	if (scope.legalEntityId == null) return true;
	return Number(project.legalEntityId) === scope.legalEntityId;
}
