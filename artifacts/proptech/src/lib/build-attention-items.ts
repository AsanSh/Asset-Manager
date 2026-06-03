import type { DashboardScopeState } from "@/lib/dashboard-scope";
import {
	matchesLegalEntityOnProject,
	matchesProjectScope,
} from "@/lib/dashboard-scope";

export type AttentionSeverity = "critical" | "warning" | "info";

export type AttentionItem = {
	id: string;
	severity: AttentionSeverity;
	title: string;
	subtitle?: string;
	href: string;
};

function fmtSom(n: number) {
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(Math.round(n))} сом`;
}

type ProjectLike = {
	id: number;
	name: string;
	legalEntityId?: number | null;
	totalBudget?: string;
};

export function buildAttentionItems(input: {
	scope: DashboardScopeState;
	projects: ProjectLike[];
	accruals: Array<{
		contractId?: number;
		status?: string;
		dueDate?: string;
		remainingAmount?: string;
	}>;
	contracts: Array<{
		id: number;
		projectId?: number;
		buyerName?: string;
		totalAmount?: string;
		paidAmount?: string;
	}>;
	tasks: Array<{
		id: number;
		title: string;
		projectId?: number;
		dueDate?: string;
		status?: string;
	}>;
	projectExpenses: Map<number, number>;
	payrollPending: Array<{ id: number; employeeName?: string; amount?: string }>;
	supplyPending: Array<{ id: number; notes?: string; projectId?: number }>;
	marketplacePending: number;
}): AttentionItem[] {
	const today = new Date().toISOString().slice(0, 10);
	const items: AttentionItem[] = [];

	const scopedProjects = input.projects.filter(
		(p) =>
			matchesProjectScope(p.id, input.scope) &&
			matchesLegalEntityOnProject(p, input.scope),
	);
	const scopedProjectIds = new Set(scopedProjects.map((p) => p.id));

	for (const p of scopedProjects) {
		const budget = parseFloat(p.totalBudget || "0");
		const expense = input.projectExpenses.get(p.id) ?? 0;
		if (budget > 0 && expense > budget) {
			const over = expense - budget;
			items.push({
				id: `budget-${p.id}`,
				severity: "critical",
				title: `Перерасход бюджета · ${p.name}`,
				subtitle: `+${fmtSom(over)} сверх плана`,
				href: "/construction/projects",
			});
		}
	}

	const contractById = new Map(input.contracts.map((c) => [c.id, c]));

	for (const a of input.accruals) {
		if (a.status === "paid") continue;
		if (!a.dueDate || a.dueDate.slice(0, 10) >= today) continue;
		const contract = contractById.get(Number(a.contractId));
		if (contract?.projectId != null && !scopedProjectIds.has(contract.projectId)) {
			continue;
		}
		const amt = parseFloat(a.remainingAmount || "0");
		if (amt <= 0) continue;
		items.push({
			id: `accrual-${a.contractId}-${a.dueDate}`,
			severity: "critical",
			title: `Просрочен платёж · ${contract?.buyerName || "покупатель"}`,
			subtitle: fmtSom(amt),
			href: "/construction/accruals",
		});
	}

	for (const c of input.contracts) {
		if (c.projectId != null && !scopedProjectIds.has(c.projectId)) continue;
		const total = parseFloat(c.totalAmount || "0");
		const paid = parseFloat(c.paidAmount || "0");
		if (total <= 0) continue;
		const remaining = total - paid;
		if (remaining <= 0) continue;
		if (paid / total >= 0.3) continue;
		items.push({
			id: `debt-${c.id}`,
			severity: "warning",
			title: `Дебиторка · ${c.buyerName || "клиент"}`,
			subtitle: `${fmtSom(remaining)} осталось (${Math.round((paid / total) * 100)}% погашено)`,
			href: "/construction/contracts-sales",
		});
	}

	for (const t of input.tasks) {
		if (t.status === "done") continue;
		if (!t.dueDate || t.dueDate.slice(0, 10) >= today) continue;
		if (t.projectId != null && !scopedProjectIds.has(Number(t.projectId))) continue;
		items.push({
			id: `task-${t.id}`,
			severity: "warning",
			title: `Просрочена задача · ${t.title}`,
			href: `/construction/tasks/${t.id}`,
		});
	}

	for (const r of input.payrollPending.slice(0, 5)) {
		items.push({
			id: `payroll-${r.id}`,
			severity: "warning",
			title: `Согласование зарплаты · ${r.employeeName || "сотрудник"}`,
			subtitle: r.amount ? fmtSom(parseFloat(r.amount)) : undefined,
			href: "/construction/payroll",
		});
	}

	for (const s of input.supplyPending.slice(0, 5)) {
		if (s.projectId != null && !scopedProjectIds.has(Number(s.projectId))) continue;
		items.push({
			id: `supply-${s.id}`,
			severity: "warning",
			title: `Заявка на снабжение #${s.id}`,
			subtitle: s.notes || "ожидает согласования",
			href: "/warehouse/approvals",
		});
	}

	if (input.marketplacePending > 0) {
		items.push({
			id: "marketplace-pending",
			severity: "info",
			title: `Заявки маркетплейса · ${input.marketplacePending}`,
			subtitle: "ожидают обработки",
			href: "/warehouse/marketplace",
		});
	}

	const order: Record<AttentionSeverity, number> = {
		critical: 0,
		warning: 1,
		info: 2,
	};
	items.sort((a, b) => order[a.severity] - order[b.severity]);
	return items.slice(0, 12);
}
