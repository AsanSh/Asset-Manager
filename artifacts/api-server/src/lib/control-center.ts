import { and, desc, eq } from "drizzle-orm";
import {
  db,
  constructionProjectsTable,
  constructionOperationsTable,
  constructionSalesContractsTable,
  constructionAccrualsTable,
  constructionTasksTable,
  constructionUnitsTable,
  payrollApprovalRequestsTable,
  payrollEmployeesTable,
  supplyRequestsTable,
  marketplaceOrdersTable,
} from "./db";

export type ControlCenterScope = {
  projectId: number | null;
  legalEntityId: number | null;
  from: string | null;
  to: string | null;
};

export type AttentionSeverity = "critical" | "warning" | "info";

export type AttentionItemDto = {
  id: string;
  severity: AttentionSeverity;
  title: string;
  subtitle?: string;
  href: string;
};

export type ControlCenterProjectRow = {
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
};

export type ControlCenterResponse = {
  attentionItems: AttentionItemDto[];
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
  projectRows: ControlCenterProjectRow[];
};

function fmtSom(n: number): string {
  return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(Math.round(n))} сом`;
}

function inDateRange(date: string | null | undefined, from: string | null, to: string | null): boolean {
  if (!from || !to || !date) return true;
  const d = String(date).slice(0, 10);
  return d >= from && d <= to;
}

function matchesProjectScope(
  projectId: number | null | undefined,
  scope: ControlCenterScope,
): boolean {
  if (scope.projectId == null) return true;
  return Number(projectId) === scope.projectId;
}

function matchesLegalEntity(
  project: { legalEntityId?: number | null },
  scope: ControlCenterScope,
): boolean {
  if (scope.legalEntityId == null) return true;
  return Number(project.legalEntityId) === scope.legalEntityId;
}

function buildAttentionItems(input: {
  scope: ControlCenterScope;
  projects: Array<{ id: number; name: string; legalEntityId?: number | null; totalBudget?: string | null }>;
  accruals: Array<{ contractId: number; status?: string | null; dueDate: string; remainingAmount?: string | null }>;
  contracts: Array<{ id: number; projectId: number; buyerName?: string | null; totalAmount?: string | null; paidAmount?: string | null }>;
  tasks: Array<{ id: number; title: string; projectId?: number | null; dueDate?: string | null; status?: string | null }>;
  projectExpenses: Map<number, number>;
  payrollPending: Array<{ id: number; employeeName?: string | null; amount?: string | null }>;
  supplyPending: Array<{ id: number; notes?: string | null; projectId?: number | null }>;
  marketplacePending: number;
}): AttentionItemDto[] {
  const today = new Date().toISOString().slice(0, 10);
  const items: AttentionItemDto[] = [];

  const scopedProjects = input.projects.filter(
    (p) => matchesProjectScope(p.id, input.scope) && matchesLegalEntity(p, input.scope),
  );
  const scopedProjectIds = new Set(scopedProjects.map((p) => p.id));

  for (const p of scopedProjects) {
    const budget = parseFloat(p.totalBudget || "0");
    const expense = input.projectExpenses.get(p.id) ?? 0;
    if (budget > 0 && expense > budget) {
      items.push({
        id: `budget-${p.id}`,
        severity: "critical",
        title: `Перерасход бюджета · ${p.name}`,
        subtitle: `+${fmtSom(expense - budget)} сверх плана`,
        href: "/construction/projects",
      });
    }
  }

  const contractById = new Map(input.contracts.map((c) => [c.id, c]));

  for (const a of input.accruals) {
    if (a.status === "paid") continue;
    if (!a.dueDate || a.dueDate.slice(0, 10) >= today) continue;
    const contract = contractById.get(Number(a.contractId));
    if (contract?.projectId != null && !scopedProjectIds.has(contract.projectId)) continue;
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
    if (!scopedProjectIds.has(c.projectId)) continue;
    const total = parseFloat(c.totalAmount || "0");
    const paid = parseFloat(c.paidAmount || "0");
    if (total <= 0) continue;
    const remaining = total - paid;
    if (remaining <= 0 || paid / total >= 0.3) continue;
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

  const order: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return items.slice(0, 12);
}

export async function buildControlCenter(
  companyId: number,
  scope: ControlCenterScope,
): Promise<ControlCenterResponse> {
  const baseQueries = Promise.all([
    db.select().from(constructionProjectsTable).where(eq(constructionProjectsTable.companyId, companyId)),
    db.select().from(constructionOperationsTable).where(eq(constructionOperationsTable.companyId, companyId)),
    db.select().from(constructionUnitsTable).where(eq(constructionUnitsTable.companyId, companyId)),
    db.select().from(constructionSalesContractsTable).where(eq(constructionSalesContractsTable.companyId, companyId)),
    db.select().from(constructionAccrualsTable).where(eq(constructionAccrualsTable.companyId, companyId)),
    db.select().from(constructionTasksTable).where(eq(constructionTasksTable.companyId, companyId)),
  ]);

  const optionalQueries = Promise.allSettled([
    db
      .select({
        id: payrollApprovalRequestsTable.id,
        requestedAmount: payrollApprovalRequestsTable.requestedAmount,
        employeeName: payrollEmployeesTable.fullName,
      })
      .from(payrollApprovalRequestsTable)
      .leftJoin(
        payrollEmployeesTable,
        eq(payrollApprovalRequestsTable.payrollEmployeeId, payrollEmployeesTable.id),
      )
      .where(
        and(
          eq(payrollApprovalRequestsTable.companyId, companyId),
          eq(payrollApprovalRequestsTable.status, "pending"),
        ),
      )
      .orderBy(desc(payrollApprovalRequestsTable.id)),
    db
      .select()
      .from(supplyRequestsTable)
      .where(and(eq(supplyRequestsTable.companyId, companyId), eq(supplyRequestsTable.status, "pending"))),
    db
      .select({ status: marketplaceOrdersTable.status })
      .from(marketplaceOrdersTable)
      .where(eq(marketplaceOrdersTable.companyId, companyId)),
  ]);

  const [
    projects,
    ops,
    units,
    contracts,
    accruals,
    tasks,
  ] = await baseQueries;

  const optionalResults = await optionalQueries;
  const payrollPendingRaw =
    optionalResults[0].status === "fulfilled" ? optionalResults[0].value : [];
  const supplyPending =
    optionalResults[1].status === "fulfilled" ? optionalResults[1].value : [];
  const marketplaceOrders =
    optionalResults[2].status === "fulfilled" ? optionalResults[2].value : [];

  const scopedProjects = projects.filter(
    (p) => matchesProjectScope(p.id, scope) && matchesLegalEntity(p, scope),
  );

  const projectExpensesAll = new Map<number, number>();
  for (const o of ops) {
    if (o.type !== "expense" || o.projectId == null) continue;
    const pid = Number(o.projectId);
    projectExpensesAll.set(
      pid,
      (projectExpensesAll.get(pid) ?? 0) + parseFloat(o.amountKgs?.toString() || "0"),
    );
  }

  const marketplacePending = marketplaceOrders.filter((o) => o.status === "pending").length;

  const attentionItems = buildAttentionItems({
    scope,
    projects: scopedProjects,
    accruals,
    contracts,
    tasks,
    projectExpenses: projectExpensesAll,
    payrollPending: payrollPendingRaw.map((r) => ({
      id: r.id,
      employeeName: r.employeeName,
      amount: r.requestedAmount?.toString(),
    })),
    supplyPending,
    marketplacePending,
  });

  const today = new Date().toISOString().slice(0, 10);
  const scopedTasks = tasks.filter((t) => matchesProjectScope(t.projectId, scope));
  const overdueTasksList = scopedTasks.filter(
    (t) => t.dueDate && t.dueDate.slice(0, 10) < today && t.status !== "done",
  );
  const tasksTodo = scopedTasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;
  const tasksOverdue = overdueTasksList.length;
  const tasksDone = scopedTasks.filter((t) => t.status === "done").length;

  const overdueTasksPreview = overdueTasksList.slice(0, 3).map((t) => ({
    id: t.id,
    title: t.title,
  }));
  const overdueIds = new Set(overdueTasksList.map((t) => t.id));
  const activeTasksPreview = scopedTasks
    .filter((t) => (t.status === "todo" || t.status === "in_progress") && !overdueIds.has(t.id))
    .slice(0, 4)
    .map((t) => ({ id: t.id, title: t.title, status: t.status }));

  const scopedOps = ops.filter(
    (o) =>
      matchesProjectScope(o.projectId, scope) &&
      inDateRange(o.date, scope.from, scope.to),
  );

  const projectRows: ControlCenterProjectRow[] = scopedProjects.map((p) => {
    const pid = p.id;
    const income = scopedOps
      .filter((o) => o.projectId === pid && o.type === "income")
      .reduce((s, o) => s + parseFloat(o.amountKgs?.toString() || "0"), 0);
    const expensePeriod = scopedOps
      .filter((o) => o.projectId === pid && o.type === "expense")
      .reduce((s, o) => s + parseFloat(o.amountKgs?.toString() || "0"), 0);
    const expenseAll = projectExpensesAll.get(pid) ?? 0;
    const projectUnits = units.filter((u) => u.projectId === pid);
    const sold = projectUnits.filter((u) => u.status === "sold" || u.status === "registered").length;
    const projectContracts = contracts.filter((c) => c.projectId === pid);
    const salesSum = projectContracts.reduce((s, c) => s + parseFloat(c.totalAmount?.toString() || "0"), 0);
    const paidSum = projectContracts.reduce((s, c) => s + parseFloat(c.paidAmount?.toString() || "0"), 0);
    const contractIds = new Set(projectContracts.map((c) => c.id));
    const overdue = accruals
      .filter(
        (a) =>
          contractIds.has(a.contractId) &&
          a.status !== "paid" &&
          a.dueDate.slice(0, 10) < today,
      )
      .reduce((s, a) => s + parseFloat(a.remainingAmount?.toString() || "0"), 0);
    const budget = parseFloat(p.totalBudget?.toString() || "0");
    const budgetUsedPct = budget > 0 ? (expenseAll / budget) * 100 : 0;
    const riskLevel: ControlCenterProjectRow["riskLevel"] =
      budget > 0 && expenseAll > budget ? "critical" : overdue > 0 ? "warning" : "ok";
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      income,
      expense: expensePeriod,
      profit: income - expensePeriod,
      unitsTotal: projectUnits.length,
      unitsSold: sold,
      salesSum,
      paidSum,
      overdue,
      budget,
      budgetUsedPct,
      riskLevel,
    };
  });

  const totals = projectRows.reduce(
    (acc, r) => ({
      overdue: acc.overdue + r.overdue,
      units: acc.units + r.unitsTotal,
      sold: acc.sold + r.unitsSold,
    }),
    { overdue: 0, units: 0, sold: 0 },
  );

  const budgetOverruns = projectRows.filter(
    (r) => r.budget > 0 && (projectExpensesAll.get(r.id) ?? 0) > r.budget,
  ).length;
  const criticalProjects = projectRows.filter((r) => r.riskLevel !== "ok").length;

  const recentOps = [...scopedOps]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 7)
    .map((o) => ({
      id: o.id,
      description: o.description,
      date: o.date,
      type: o.type,
      amountKgs: o.amountKgs?.toString() || "0",
    }));

  return {
    attentionItems,
    kpis: {
      projectCount: projectRows.length,
      criticalProjects,
      budgetOverruns,
      overdueAmount: totals.overdue,
      tasksOverdue,
      salesPct: totals.units > 0 ? Math.round((totals.sold / totals.units) * 100) : 0,
      unitsSold: totals.sold,
      unitsTotal: totals.units,
    },
    tasksSummary: { todo: tasksTodo, overdue: tasksOverdue, done: tasksDone },
    overdueTasksPreview,
    activeTasksPreview,
    recentOps,
    projectRows,
  };
}

export function parseControlCenterScope(query: Record<string, unknown>): ControlCenterScope {
  const projectRaw = query.projectId;
  const legalRaw = query.legalEntityId;
  const projectId =
    projectRaw != null && projectRaw !== "all" ? Number(projectRaw) : null;
  const legalEntityId =
    legalRaw != null && legalRaw !== "all" ? Number(legalRaw) : null;
  const from = typeof query.from === "string" ? query.from : null;
  const to = typeof query.to === "string" ? query.to : null;
  return {
    projectId: Number.isFinite(projectId) ? projectId : null,
    legalEntityId: Number.isFinite(legalEntityId) ? legalEntityId : null,
    from,
    to,
  };
}
