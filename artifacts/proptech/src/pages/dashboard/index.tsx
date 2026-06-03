import { lazy, Suspense, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { DashboardScopeBar } from "@/components/dashboard/DashboardScopeBar";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardScopeProvider } from "@/hooks/use-dashboard-scope";
import { useDashboardAccess } from "@/hooks/use-dashboard-access";
import {
	DASHBOARD_TAB_LABELS,
	parseDashboardTabFromSearch,
	type DashboardTabId,
} from "@/lib/dashboard-access";
import { parseScopeFromSearch, scopeToSearchParams } from "@/lib/dashboard-scope";
import { cn } from "@/lib/utils";

const ControlCenterTab = lazy(() => import("../consolidated-dashboard"));
const ConstructionOpsTab = lazy(() => import("./tabs/construction-ops-tab"));
const FinanceTab = lazy(() => import("../construction/dashboard"));
const SupplyTab = lazy(() => import("../warehouse/dashboard"));
const SalesTab = lazy(() => import("../crm/dashboard"));
const InvestorsTab = lazy(() => import("./tabs/investors-tab"));
const RentalTab = lazy(() => import("../rental/rental-dashboard"));
const AnalyticsTab = lazy(() => import("./tabs/analytics-tab"));

function TabFallback() {
	return <Skeleton className="h-64 w-full rounded-xl" />;
}

const TAB_PANELS: Record<DashboardTabId, React.ComponentType> = {
	control: ControlCenterTab,
	construction: ConstructionOpsTab,
	finance: FinanceTab,
	supply: SupplyTab,
	sales: SalesTab,
	investors: InvestorsTab,
	rental: RentalTab,
	analytics: AnalyticsTab,
};

export default function UnifiedDashboard() {
	const { allowedTabs, primaryTabs, defaultTab, isLoading, hasDashboard } = useDashboardAccess();
	const search = useSearch();
	const [, setLocation] = useLocation();

	const requested = parseDashboardTabFromSearch(search);
	const activeTab: DashboardTabId =
		requested && allowedTabs.includes(requested) ? requested : defaultTab;

	useEffect(() => {
		if (isLoading || !hasDashboard) return;
		if (!requested || !allowedTabs.includes(requested)) {
			const qs = scopeToSearchParams(parseScopeFromSearch(search));
			qs.set("tab", activeTab);
			setLocation(`/dashboard?${qs.toString()}`, { replace: true });
		}
	}, [isLoading, hasDashboard, requested, allowedTabs, activeTab, search, setLocation]);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full max-w-3xl" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	if (!hasDashboard) {
		return (
			<div className="py-16 text-center text-gray-500">
				<p className="text-sm">Нет доступа к обзору. Обратитесь к администратору.</p>
			</div>
		);
	}

	const visibleTabs = primaryTabs.length > 0 ? primaryTabs : allowedTabs;

	const setTab = (tab: DashboardTabId) => {
		const qs = scopeToSearchParams(parseScopeFromSearch(search));
		qs.set("tab", tab);
		setLocation(`/dashboard?${qs.toString()}`);
	};

	const ActivePanel = TAB_PANELS[activeTab];

	return (
		<DashboardScopeProvider>
			<div className="space-y-4 -mt-1">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Обзор</h1>
				<p className="text-sm text-gray-500 mt-0.5">
					{DASHBOARD_TAB_LABELS[activeTab]}
					{visibleTabs.length === 1
						? " · рабочий экран по вашей роли"
						: " · выберите раздел"}
				</p>
			</div>

			{visibleTabs.length > 1 && (
				<div
					className="flex gap-1 border-b border-gray-200 pb-0 overflow-x-auto scrollbar-thin -mx-1 px-1"
					role="tablist"
				>
					{visibleTabs.map((tab) => (
						<button
							key={tab}
							type="button"
							role="tab"
							aria-selected={activeTab === tab}
							onClick={() => setTab(tab)}
							className={cn(
								"px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px whitespace-nowrap transition-colors",
								activeTab === tab
									? "border-amber-500 text-amber-700 bg-amber-50/80"
									: "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50",
							)}
						>
							{DASHBOARD_TAB_LABELS[tab]}
						</button>
					))}
				</div>
			)}

			{activeTab === "control" && <DashboardScopeBar />}

			<div role="tabpanel" className="min-h-[320px]">
				<Suspense fallback={<TabFallback />}>
					<ActivePanel />
				</Suspense>
			</div>
		</div>
		</DashboardScopeProvider>
	);
}
