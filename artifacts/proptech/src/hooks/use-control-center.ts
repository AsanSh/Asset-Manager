import { useQuery } from "@tanstack/react-query";
import { useDashboardScope } from "@/hooks/use-dashboard-scope";
import { api } from "@/lib/api";
import { scopeToApiParams } from "@/lib/dashboard-scope";

export type ControlCenterData = {
	attentionItems: Array<{
		id: string;
		severity: "critical" | "warning" | "info";
		title: string;
		subtitle?: string;
		href: string;
	}>;
	kpis: {
		projectCount: number;
		criticalProjects: number;
		budgetOverruns: number;
		overdueAmount: number;
		tasksOverdue: number;
		salesPct: number;
		unitsSold: number;
		unitsTotal: number;
	};
	tasksSummary: { todo: number; overdue: number; done: number };
	overdueTasksPreview: Array<{ id: number; title: string }>;
	activeTasksPreview: Array<{ id: number; title: string; status: string | null }>;
	recentOps: Array<{
		id: number;
		description?: string | null;
		date: string;
		type?: string | null;
		amountKgs: string;
	}>;
	projectRows: Array<{
		id: number;
		name: string;
		status?: string | null;
		income: number;
		expense: number;
		profit: number;
		unitsTotal: number;
		unitsSold: number;
		salesSum: number;
		paidSum: number;
		overdue: number;
		budget: number;
		budgetUsedPct: number;
		riskLevel: "critical" | "warning" | "ok";
	}>;
};

export function useControlCenter() {
	const { scope } = useDashboardScope();
	return useQuery({
		queryKey: ["dashboard-control-center", scopeToApiParams(scope)],
		queryFn: () =>
			api
				.get<ControlCenterData>("/dashboard/control-center", {
					params: scopeToApiParams(scope),
				})
				.then((r) => r.data),
		staleTime: 60_000,
	});
}
