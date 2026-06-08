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
	const { allowedTabs, defaultTab, isLoading, hasDashboard } = useDashboardAccess();
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

	const ActivePanel = TAB_PANELS[activeTab];

	return (
		<DashboardScopeProvider>
			<div className="space-y-4 -mt-1">
			<div className="sr-only">
				<h1>Обзор</h1>
				<p>{DASHBOARD_TAB_LABELS[activeTab]}</p>
			</div>

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
