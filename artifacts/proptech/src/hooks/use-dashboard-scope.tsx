import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	type ReactNode,
} from "react";
import { useLocation, useSearch } from "wouter";
import {
	EMPTY_DASHBOARD_SCOPE,
	parseScopeFromSearch,
	scopeToSearchParams,
	type DashboardScopeState,
} from "@/lib/dashboard-scope";
import { parseDashboardTabFromSearch } from "@/lib/dashboard-access";

type DashboardScopeContextValue = {
	scope: DashboardScopeState;
	setScope: (patch: Partial<DashboardScopeState>) => void;
	resetScope: () => void;
};

const DashboardScopeContext = createContext<DashboardScopeContextValue | null>(
	null,
);

export function DashboardScopeProvider({ children }: { children: ReactNode }) {
	const search = useSearch();
	const [, setLocation] = useLocation();

	const scope = useMemo(() => parseScopeFromSearch(search), [search]);

	const setScope = useCallback(
		(patch: Partial<DashboardScopeState>) => {
			const next: DashboardScopeState = { ...scope, ...patch };
			const qs = scopeToSearchParams(next);
			const tab = parseDashboardTabFromSearch(search) ?? "control";
			qs.set("tab", tab);
			setLocation(`/dashboard?${qs.toString()}`);
		},
		[scope, search, setLocation],
	);

	const resetScope = useCallback(() => {
		const qs = new URLSearchParams(
			search.startsWith("?") ? search.slice(1) : search,
		);
		qs.delete("projectId");
		qs.delete("legalEntityId");
		qs.delete("period");
		qs.delete("from");
		qs.delete("to");
		if (!qs.get("tab")) qs.set("tab", "control");
		setLocation(`/dashboard?${qs.toString()}`);
	}, [search, setLocation]);

	const value = useMemo(
		() => ({ scope, setScope, resetScope }),
		[scope, setScope, resetScope],
	);

	return (
		<DashboardScopeContext.Provider value={value}>
			{children}
		</DashboardScopeContext.Provider>
	);
}

export function useDashboardScope() {
	const ctx = useContext(DashboardScopeContext);
	if (!ctx) {
		return {
			scope: EMPTY_DASHBOARD_SCOPE,
			setScope: () => {},
			resetScope: () => {},
		};
	}
	return ctx;
}
