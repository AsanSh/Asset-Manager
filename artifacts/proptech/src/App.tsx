import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { PlatformAdminLayout } from "@/components/platform-admin-layout";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useModuleAccess } from "@/hooks/use-module-access";
import NotFound from "@/pages/not-found";

class PageErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ error: Error | null }
> {
	constructor(props: any) {
		super(props);
		this.state = { error: null };
	}
	static getDerivedStateFromError(error: Error) {
		return { error };
	}
	render() {
		if (this.state.error) {
			return (
				<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
					<div className="text-4xl">⚠️</div>
					<h2 className="text-lg font-semibold text-gray-800">
						Страница не загрузилась
					</h2>
					<p className="text-sm text-gray-500 max-w-md">
						{this.state.error.message}
					</p>
					<button
						onClick={() => this.setState({ error: null })}
						className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
					>
						Попробовать снова
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

import ActivityLog from "@/pages/activity-log";
import ChessBoard from "@/pages/ChessBoard";
import Companies from "@/pages/companies";
import ConstructionAccounts from "@/pages/construction/accounts";
import ConstructionAccruals from "@/pages/construction/accruals";
import AIChat from "@/pages/construction/ai/chat";
import AIContractorAnalytics from "@/pages/construction/ai/contractor-analytics";
import AIPhotoReport from "@/pages/construction/ai/photo-report";
import AISnipCheck from "@/pages/construction/ai/snip-check";
import AIEstimates from "@/pages/construction/ai/estimates";
import AITelegram from "@/pages/construction/ai/telegram";
import AITools from "@/pages/construction/ai/tools";
import ConstructionCashflow from "@/pages/construction/analytics/cashflow";
import ConstructionDebt from "@/pages/construction/analytics/debt";
import ConstructionExpenseAnalysis from "@/pages/construction/analytics/expenses";
import ConstructionPnL from "@/pages/construction/analytics/pnl";
import ConstructionBudget from "@/pages/construction/budget";
import ConstructionCashier from "@/pages/construction/cashier";
import ConstructionChess from "@/pages/construction/chess";
import ConstructionContractors from "@/pages/construction/contractors";
import ConstructionContractsSales from "@/pages/construction/contracts-sales";
import ConstructionCounterparties from "@/pages/construction/counterparties";
import ConstructionDashboard from "@/pages/construction/dashboard";
import ConstructionEmployees from "@/pages/construction/employees";
import ConstructionExpenses from "@/pages/construction/expenses";
import ConstructionMaterials from "@/pages/construction/materials";
import ConstructionOperations from "@/pages/construction/operations";
import ConstructionApprovals from "@/pages/construction/planning/approvals";
import ConstructionBroadcast from "@/pages/construction/planning/broadcast";
import ConstructionForecast from "@/pages/construction/planning/forecast";
import ConstructionOverdue from "@/pages/construction/planning/overdue";
import ConstructionProjects from "@/pages/construction/projects";
import ConstructionReports from "@/pages/construction/reports";
import ConstructionSettings from "@/pages/construction/settings";
import ConstructionStages from "@/pages/construction/stages";
import ConstructionTasks from "@/pages/construction/tasks";
import TaskChat from "@/pages/construction/task-chat";
import ConsolidatedModule from "@/pages/consolidated";
import ConstructionWorkers from "@/pages/construction/workers";
import Counterparties from "@/pages/counterparties";
import CrmClients from "@/pages/crm/clients";
// CRM/PropTech module
import CrmDashboard from "@/pages/crm/dashboard";
import CrmDeals from "@/pages/crm/deals";
import CrmLeads from "@/pages/crm/leads";
import CrmSalesContracts from "@/pages/crm/sales-contracts";
import CrmSalesProperties from "@/pages/crm/sales-properties";
import Dashboard from "@/pages/dashboard";
import ImportCenter from "@/pages/import-center";
import Login from "@/pages/login";
import ResetPassword from "@/pages/reset-password";
import InvestorPortal from "@/pages/portal/investor";
import TenantPortal from "@/pages/portal/tenant";
import ContractorPortal from "@/pages/portal/contractor";
import SupplierPortal from "@/pages/portal/supplier";
import BuyerPortal from "@/pages/portal/buyer";
import Properties from "@/pages/properties";
import Register from "@/pages/register";
import RentalAccounts from "@/pages/rental/accounts";
import Accruals from "@/pages/rental/accruals";
import RentalOperationsLog from "@/pages/rental/admin/log";
import RentalAnalyticsCashflow from "@/pages/rental/analytics/cashflow";
import RentalAnalyticsDebt from "@/pages/rental/analytics/debt";
import RentalAnalyticsHistory from "@/pages/rental/analytics/history";
import RentalODDS from "@/pages/rental/analytics/odds";
import RentalPlanFact from "@/pages/rental/analytics/plan-fact";
import RentalOPU from "@/pages/rental/analytics/opu";
import RentalAnalyticsOwners from "@/pages/rental/analytics/owners";
import RentalAnalyticsSummary from "@/pages/rental/analytics/summary";
import Deposits from "@/pages/rental/deposits";
import Distributions from "@/pages/rental/distributions";
import RentalEmployees from "@/pages/rental/employees";
import Expenses from "@/pages/rental/expenses";
import Investments from "@/pages/rental/investments";
import InvestorDetail from "@/pages/rental/investor-detail";
import Investors from "@/pages/rental/investors";
import RentalContracts from "@/pages/rental/leases";
import Payments from "@/pages/rental/payments";
import RentalPlanningBroadcast from "@/pages/rental/planning/broadcast";
import RentalPlanningForecast from "@/pages/rental/planning/forecast";
import RentalPlanningOverdue from "@/pages/rental/planning/overdue";
import RentalDashboard from "@/pages/rental/rental-dashboard";
import RentalOverview from "@/pages/rental/overview";
import RentalProperties from "@/pages/rental/rental-properties";
import RentalSettings from "@/pages/rental/settings";
import OwnerStatements from "@/pages/rental/statements";
import TenantDetail from "@/pages/rental/tenant-detail";
import RentalTenants from "@/pages/rental/tenants";
import CashflowReport from "@/pages/reports/CashflowReport";
import DebtReport from "@/pages/reports/DebtReport";
import PaymentsReport from "@/pages/reports/PaymentsReport";
import RentalSummaryReport from "@/pages/reports/RentalSummaryReport";
import Settings from "@/pages/settings";
import SettingsCategories from "@/pages/settings/categories";
import SettingsLegal from "@/pages/settings/legal-entities";
import SettingsPeriods from "@/pages/settings/periods";
import SettingsRoles from "@/pages/settings/roles";
import SettingsSystemAccounts from "@/pages/settings/system-accounts";
import Users from "@/pages/users";
import WarehouseCompanies from "@/pages/warehouse/companies";
import WarehouseCosts from "@/pages/warehouse/costs";
import WarehouseCounterparties from "@/pages/warehouse/counterparties";
import RentalCounterparties from "@/pages/rental/counterparties";
import CrmCounterparties from "@/pages/crm/counterparties";
// Warehouse module
import WarehouseDashboard from "@/pages/warehouse/dashboard";
import WarehouseEmployees from "@/pages/warehouse/employees";
import WarehouseIncoming from "@/pages/warehouse/incoming";
import WarehouseInventory from "@/pages/warehouse/inventory";
import WarehouseItems from "@/pages/warehouse/items";
import WarehouseOrders from "@/pages/warehouse/orders";
import WarehouseOutgoing from "@/pages/warehouse/outgoing";
import WarehouseReports from "@/pages/warehouse/reports";
import WarehouseRequests from "@/pages/warehouse/requests";
import WarehouseSettings from "@/pages/warehouse/settings";
import WarehouseSuppliers from "@/pages/warehouse/suppliers";
import PlatformAdminDashboard from "@/pages/platform-admin/dashboard";
import PlatformAdminCompanies from "@/pages/platform-admin/companies";
import PlatformAdminCompanyDetail from "@/pages/platform-admin/company-detail";

const queryClient = new QueryClient();

function Spinner() {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="flex flex-col items-center gap-3">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
				<span className="text-sm text-gray-500">Загрузка...</span>
			</div>
		</div>
	);
}

function ProtectedRoute({ component: Component, ...rest }: any) {
	const { isAuthenticated, isLoading, user } = useAuth();
	const { canAccess, homePath, isLoading: accessLoading } = useModuleAccess();
	const [location] = useLocation();
	const role = (user as any)?.role;

	if (isLoading || accessLoading) return <Spinner />;
	if (!isAuthenticated) return <Redirect to="/login" />;

	// Portal users see their own portal, not the main app
	if (role === "investor") return <Redirect to="/investor-portal" />;
	if (role === "tenant") return <Redirect to="/tenant-portal" />;
	if (role === "contractor") return <Redirect to="/contractor-portal" />;
	if (role === "supplier") return <Redirect to="/supplier-portal" />;
	if (role === "buyer") return <Redirect to="/buyer-portal" />;
	if (role === "super_admin") return <Redirect to="/platform-admin" />;

	if (!canAccess(location)) return <Redirect to={homePath} />;

	return (
		<Layout>
			<PageErrorBoundary>
				<Component {...rest} />
			</PageErrorBoundary>
		</Layout>
	);
}

function HomeRedirect() {
	const { isAuthenticated, isLoading, user } = useAuth();
	const { homePath, isLoading: accessLoading } = useModuleAccess();
	const role = (user as any)?.role;

	if (isLoading || accessLoading) return <Spinner />;
	if (!isAuthenticated) return <Redirect to="/login" />;
	if (role === "investor") return <Redirect to="/investor-portal" />;
	if (role === "tenant") return <Redirect to="/tenant-portal" />;
	if (role === "contractor") return <Redirect to="/contractor-portal" />;
	if (role === "supplier") return <Redirect to="/supplier-portal" />;
	if (role === "buyer") return <Redirect to="/buyer-portal" />;
	if (role === "super_admin") return <Redirect to="/platform-admin" />;
	return <Redirect to={homePath} />;
}

function PortalRoute({
	component: Component,
}: {
	component: React.ComponentType;
}) {
	const { isAuthenticated, isLoading } = useAuth();
	if (isLoading) return <Spinner />;
	if (!isAuthenticated) return <Redirect to="/login" />;
	return <Component />;
}

function PlatformAdminRoute({
	component: Component,
}: {
	component: React.ComponentType;
}) {
	const { isAuthenticated, isLoading, user } = useAuth();
	if (isLoading) return <Spinner />;
	if (!isAuthenticated) return <Redirect to="/login" />;
	if (user?.role !== "super_admin") return <Redirect to="/dashboard" />;
	return (
		<PlatformAdminLayout>
			<PageErrorBoundary>
				<Component />
			</PageErrorBoundary>
		</PlatformAdminLayout>
	);
}

function Router() {
	return (
		<Switch>
			<Route path="/login" component={Login} />
			<Route path="/reset-password" component={ResetPassword} />
			<Route path="/register" component={Register} />
			<Route path="/investor-portal">
				<PortalRoute component={InvestorPortal} />
			</Route>
			<Route path="/tenant-portal">
				<PortalRoute component={TenantPortal} />
			</Route>
			<Route path="/contractor-portal">
				<PortalRoute component={ContractorPortal} />
			</Route>
			<Route path="/supplier-portal">
				<PortalRoute component={SupplierPortal} />
			</Route>
			<Route path="/buyer-portal">
				<PortalRoute component={BuyerPortal} />
			</Route>
			<Route path="/admin/portal/buyer/:buyerId">
				{(params) => (
					<ProtectedRoute
						component={() => <BuyerPortal previewBuyerId={parseInt(params.buyerId)} />}
					/>
				)}
			</Route>

			{/* ── Админ-панель платформы (super_admin) ── */}
			<Route path="/platform-admin/companies/:id">
				<PlatformAdminRoute component={PlatformAdminCompanyDetail} />
			</Route>
			<Route path="/platform-admin/companies">
				<PlatformAdminRoute component={PlatformAdminCompanies} />
			</Route>
			<Route path="/platform-admin">
				<PlatformAdminRoute component={PlatformAdminDashboard} />
			</Route>

			<Route path="/">
				<HomeRedirect />
			</Route>

			{/* ── Сводное (consolidated) ── */}
			<Route path="/consolidated">
				<ProtectedRoute component={ConsolidatedModule} />
			</Route>
			<Route path="/dashboard">
				<ProtectedRoute component={Dashboard} />
			</Route>
			<Route path="/companies">
				<ProtectedRoute component={Companies} />
			</Route>
			<Route path="/users">
				<ProtectedRoute component={Users} />
			</Route>
			<Route path="/counterparties">
				<ProtectedRoute component={Counterparties} />
			</Route>
			<Route path="/properties/chess">
				<ProtectedRoute component={ChessBoard} />
			</Route>
			<Route path="/properties">
				<ProtectedRoute component={Properties} />
			</Route>
			<Route path="/import">
				<ProtectedRoute component={ImportCenter} />
			</Route>
			<Route path="/activity">
				<ProtectedRoute component={ActivityLog} />
			</Route>
			<Route path="/settings">
				<ProtectedRoute component={Settings} />
			</Route>
			<Route path="/reports/debt">
				<ProtectedRoute component={DebtReport} />
			</Route>
			<Route path="/reports/rental">
				<ProtectedRoute component={RentalSummaryReport} />
			</Route>
			<Route path="/reports/cashflow">
				<ProtectedRoute component={CashflowReport} />
			</Route>
			<Route path="/reports/payments">
				<ProtectedRoute component={PaymentsReport} />
			</Route>

			{/* ── Аренда ── */}
			<Route path="/rental/dashboard">
				<ProtectedRoute component={RentalDashboard} />
			</Route>
			<Route path="/rental/overview">
				<ProtectedRoute component={RentalOverview} />
			</Route>
			<Route path="/rental/properties">
				<ProtectedRoute component={RentalProperties} />
			</Route>
			<Route path="/rental/tenants/:id">
				<ProtectedRoute component={TenantDetail} />
			</Route>
			<Route path="/rental/tenants">
				<ProtectedRoute component={RentalTenants} />
			</Route>
			<Route path="/rental/contracts">
				<ProtectedRoute component={RentalContracts} />
			</Route>
			<Route path="/rental/accruals">
				<ProtectedRoute component={Accruals} />
			</Route>
			<Route path="/rental/payments">
				<ProtectedRoute component={Payments} />
			</Route>
			<Route path="/rental/deposits">
				<ProtectedRoute component={Deposits} />
			</Route>
			<Route path="/rental/expenses">
				<ProtectedRoute component={Expenses} />
			</Route>
			<Route path="/rental/statements">
				<ProtectedRoute component={OwnerStatements} />
			</Route>
			<Route path="/rental/accounts">
				<ProtectedRoute component={RentalAccounts} />
			</Route>
			<Route path="/rental/employees">
				<ProtectedRoute component={RentalEmployees} />
			</Route>
			<Route path="/rental/investors/:id">
				<ProtectedRoute component={InvestorDetail} />
			</Route>
			<Route path="/rental/investors">
				<ProtectedRoute component={Investors} />
			</Route>
			<Route path="/rental/investments">
				<ProtectedRoute component={Investments} />
			</Route>
			<Route path="/rental/distributions">
				<ProtectedRoute component={Distributions} />
			</Route>

			{/* ── Контроль строительства ── */}
			<Route path="/construction/dashboard">
				<ProtectedRoute component={ConstructionDashboard} />
			</Route>
			<Route path="/construction/projects">
				<ProtectedRoute component={ConstructionProjects} />
			</Route>
			<Route path="/construction/stages">
				<ProtectedRoute component={ConstructionStages} />
			</Route>
			<Route path="/construction/tasks">
				<ProtectedRoute component={ConstructionTasks} />
			</Route>
			<Route path="/construction/tasks/:id">
				{(params) => <ProtectedRoute component={() => <TaskChat taskId={parseInt(params.id)} />} />}
			</Route>
			<Route path="/construction/workers">
				<ProtectedRoute component={ConstructionWorkers} />
			</Route>
			<Route path="/construction/contractors">
				<ProtectedRoute component={ConstructionContractors} />
			</Route>
			<Route path="/construction/materials">
				<ProtectedRoute component={ConstructionMaterials} />
			</Route>
			<Route path="/construction/budget">
				<ProtectedRoute component={ConstructionBudget} />
			</Route>
			<Route path="/construction/expenses">
				<ProtectedRoute component={ConstructionExpenses} />
			</Route>
			<Route path="/construction/chess">
				<ProtectedRoute component={ConstructionChess} />
			</Route>
			<Route path="/construction/reports">
				<ProtectedRoute component={ConstructionReports} />
			</Route>
			<Route path="/construction/counterparties">
				<ProtectedRoute component={ConstructionCounterparties} />
			</Route>
			<Route path="/construction/employees">
				<ProtectedRoute component={ConstructionEmployees} />
			</Route>
			<Route path="/construction/operations">
				<ProtectedRoute component={ConstructionOperations} />
			</Route>
			<Route path="/construction/contracts-sales">
				<ProtectedRoute component={ConstructionContractsSales} />
			</Route>
			<Route path="/construction/accruals">
				<ProtectedRoute component={ConstructionAccruals} />
			</Route>
			<Route path="/construction/cashier">
				<ProtectedRoute component={ConstructionCashier} />
			</Route>
			<Route path="/construction/accounts">
				<ProtectedRoute component={ConstructionAccounts} />
			</Route>
			<Route path="/construction/analytics/cashflow">
				<ProtectedRoute component={ConstructionCashflow} />
			</Route>
			<Route path="/construction/analytics/pnl">
				<ProtectedRoute component={ConstructionPnL} />
			</Route>
			<Route path="/construction/analytics/expenses">
				<ProtectedRoute component={ConstructionExpenseAnalysis} />
			</Route>
			<Route path="/construction/analytics/debt">
				<ProtectedRoute component={ConstructionDebt} />
			</Route>
			<Route path="/construction/planning/forecast">
				<ProtectedRoute component={ConstructionForecast} />
			</Route>
			<Route path="/construction/planning/overdue">
				<ProtectedRoute component={ConstructionOverdue} />
			</Route>
			<Route path="/construction/planning/approvals">
				<ProtectedRoute component={ConstructionApprovals} />
			</Route>
			<Route path="/construction/planning/broadcast">
				<ProtectedRoute component={ConstructionBroadcast} />
			</Route>

			<Route path="/construction/settings">
				<ProtectedRoute component={ConstructionSettings} />
			</Route>

			{/* ── AI-инструменты ── */}
			<Route path="/construction/ai/chat">
				<ProtectedRoute component={AIChat} />
			</Route>
			<Route path="/construction/ai/snip-check">
				<ProtectedRoute component={AISnipCheck} />
			</Route>
			<Route path="/construction/ai/tools">
				<ProtectedRoute component={AITools} />
			</Route>
			<Route path="/construction/ai/photo-report">
				<ProtectedRoute component={AIPhotoReport} />
			</Route>
			<Route path="/construction/ai/telegram">
				<ProtectedRoute component={AITelegram} />
			</Route>
			<Route path="/construction/ai/contractor-analytics">
				<ProtectedRoute component={AIContractorAnalytics} />
			</Route>
			<Route path="/construction/ai/estimates">
				<ProtectedRoute component={AIEstimates} />
			</Route>

			{/* ── CRM / Продажи ── */}
			<Route path="/crm/dashboard">
				<ProtectedRoute component={CrmDashboard} />
			</Route>
			<Route path="/crm/leads">
				<ProtectedRoute component={CrmLeads} />
			</Route>
			<Route path="/crm/clients">
				<ProtectedRoute component={CrmClients} />
			</Route>
			<Route path="/crm/deals">
				<ProtectedRoute component={CrmDeals} />
			</Route>
			<Route path="/crm/sales-contracts">
				<ProtectedRoute component={CrmSalesContracts} />
			</Route>
			<Route path="/crm/sales-properties">
				<ProtectedRoute component={CrmSalesProperties} />
			</Route>

			{/* Редиректы с proptech на crm */}
			<Route path="/proptech/dashboard">
				<Redirect to="/crm/dashboard" />
			</Route>
			<Route path="/proptech/:rest*">
				<Redirect to="/crm/dashboard" />
			</Route>
			<Route path="/sales/:rest*">
				<Redirect to="/crm/dashboard" />
			</Route>

			{/* ── Аренда (дополнительно) ── */}
			<Route path="/rental/analytics/debt">
				<ProtectedRoute component={RentalAnalyticsDebt} />
			</Route>
			<Route path="/rental/analytics/summary">
				<ProtectedRoute component={RentalAnalyticsSummary} />
			</Route>
			<Route path="/rental/analytics/cashflow">
				<ProtectedRoute component={RentalAnalyticsCashflow} />
			</Route>
			<Route path="/rental/analytics/history">
				<ProtectedRoute component={RentalAnalyticsHistory} />
			</Route>
			<Route path="/rental/analytics/owners">
				<ProtectedRoute component={RentalAnalyticsOwners} />
			</Route>
			<Route path="/rental/analytics/opu">
				<ProtectedRoute component={RentalOPU} />
			</Route>
			<Route path="/rental/analytics/odds">
				<ProtectedRoute component={RentalODDS} />
			</Route>
			<Route path="/rental/analytics/plan-fact">
				<ProtectedRoute component={RentalPlanFact} />
			</Route>
			<Route path="/rental/planning/forecast">
				<ProtectedRoute component={RentalPlanningForecast} />
			</Route>
			<Route path="/rental/planning/overdue">
				<ProtectedRoute component={RentalPlanningOverdue} />
			</Route>
			<Route path="/rental/planning/broadcast">
				<ProtectedRoute component={RentalPlanningBroadcast} />
			</Route>
			<Route path="/rental/settings">
				<ProtectedRoute component={RentalSettings} />
			</Route>
			<Route path="/rental/admin/log">
				<ProtectedRoute component={RentalOperationsLog} />
			</Route>

			{/* ── Закуп / Снабжение ── */}
			<Route path="/warehouse/dashboard">
				<ProtectedRoute component={WarehouseDashboard} />
			</Route>
			<Route path="/warehouse/items">
				<ProtectedRoute component={WarehouseItems} />
			</Route>
			<Route path="/warehouse/suppliers">
				<ProtectedRoute component={WarehouseSuppliers} />
			</Route>
			<Route path="/warehouse/orders">
				<ProtectedRoute component={WarehouseOrders} />
			</Route>
			<Route path="/warehouse/companies">
				<ProtectedRoute component={WarehouseCompanies} />
			</Route>
			<Route path="/warehouse/requests">
				<ProtectedRoute component={WarehouseRequests} />
			</Route>
			<Route path="/warehouse/incoming">
				<ProtectedRoute component={WarehouseIncoming} />
			</Route>
			<Route path="/warehouse/outgoing">
				<ProtectedRoute component={WarehouseOutgoing} />
			</Route>
			<Route path="/warehouse/inventory">
				<ProtectedRoute component={WarehouseInventory} />
			</Route>
			<Route path="/warehouse/costs">
				<ProtectedRoute component={WarehouseCosts} />
			</Route>
			<Route path="/warehouse/reports">
				<ProtectedRoute component={WarehouseReports} />
			</Route>
			<Route path="/warehouse/counterparties">
				<ProtectedRoute component={WarehouseCounterparties} />
			</Route>
			<Route path="/rental/counterparties">
				<ProtectedRoute component={RentalCounterparties} />
			</Route>
			<Route path="/crm/counterparties">
				<ProtectedRoute component={CrmCounterparties} />
			</Route>
			<Route path="/warehouse/employees">
				<ProtectedRoute component={WarehouseEmployees} />
			</Route>
			<Route path="/warehouse/settings">
				<ProtectedRoute component={WarehouseSettings} />
			</Route>

			{/* ── Системные настройки ── */}
			<Route path="/settings/legal">
				<ProtectedRoute component={SettingsLegal} />
			</Route>
			<Route path="/settings/accounts">
				<ProtectedRoute component={SettingsSystemAccounts} />
			</Route>
			<Route path="/settings/roles">
				<ProtectedRoute component={SettingsRoles} />
			</Route>
			<Route path="/settings/categories">
				<ProtectedRoute component={SettingsCategories} />
			</Route>
			<Route path="/settings/periods">
				<ProtectedRoute component={SettingsPeriods} />
			</Route>

			<Route component={NotFound} />
		</Switch>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<AuthProvider>
					<WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
						<Router />
					</WouterRouter>
					<Toaster />
				</AuthProvider>
			</TooltipProvider>
		</QueryClientProvider>
	);
}

export default App;
