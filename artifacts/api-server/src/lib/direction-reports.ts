import { eq, and } from "drizzle-orm";
import {
  db,
  accrualsTable,
  paymentsTable,
  expensesTable,
  leaseContractsTable,
  tenantsTable,
  propertiesTable,
  constructionSalesContractsTable,
  constructionAccrualsTable,
  constructionOperationsTable,
  constructionContractorsTable,
  constructionExpensesTable,
  warehouseSuppliersTable,
  warehouseIncomingTable,
  warehouseSupplierPaymentsTable,
} from "./db";

export type DirectionKey = "rental" | "sales" | "contractors" | "suppliers";

export type DirectionReportSummary = {
  totalContract: number;
  totalCharged: number;
  totalPaid: number;
  totalExpense: number;
  totalOutstanding: number;
  netCashflow: number;
  entityCount: number;
};

export type DirectionByMonthRow = {
  period: string;
  charged: number;
  paid: number;
  expense: number;
};

export type DirectionReportRow = {
  id: number;
  name: string;
  subtitle?: string;
  status?: string;
  role: DirectionKey;
  roleLabel: string;
  contractAmount: number;
  charged: number;
  paid: number;
  expense: number;
  outstanding: number;
  paymentRate: number;
  currency: string;
};

export type DirectionSegment = {
  direction: DirectionKey;
  label: string;
  paid: number;
  outstanding: number;
  entityCount: number;
  paidShare: number;
  outstandingShare: number;
};

export type CounterpartyDashboard = {
  summary: DirectionReportSummary & { avgPaymentRate: number };
  byMonth: DirectionByMonthRow[];
  byDirection: DirectionSegment[];
  rows: DirectionReportRow[];
};

export type DirectionReport = {
  direction: DirectionKey;
  label: string;
  summary: DirectionReportSummary;
  byMonth: DirectionByMonthRow[];
  rows: DirectionReportRow[];
};

const DIRECTION_LABELS: Record<DirectionKey, string> = {
  rental: "Аренда",
  sales: "Продажи",
  contractors: "Подрядчики",
  suppliers: "Поставщики",
};

function num(v: unknown): number {
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function dateInRange(dateStr: string | null | undefined, from?: string, to?: string): boolean {
  if (!dateStr) return !from && !to;
  const d = dateStr.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function periodInRange(period: string, from?: string, to?: string): boolean {
  const p = period.slice(0, 7);
  const fromM = from?.slice(0, 7);
  const toM = to?.slice(0, 7);
  if (fromM && p < fromM) return false;
  if (toM && p > toM) return false;
  return true;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function bumpMonth(
  map: Map<string, DirectionByMonthRow>,
  period: string,
  patch: Partial<Pick<DirectionByMonthRow, "charged" | "paid" | "expense">>,
) {
  const entry = map.get(period) ?? { period, charged: 0, paid: 0, expense: 0 };
  if (patch.charged) entry.charged += patch.charged;
  if (patch.paid) entry.paid += patch.paid;
  if (patch.expense) entry.expense += patch.expense;
  map.set(period, entry);
}

function paymentRate(charged: number, paid: number): number {
  const base = charged > 0 ? charged : paid;
  if (base <= 0) return paid > 0 ? 100 : 0;
  return Math.min(100, Math.round((paid / base) * 100));
}

function mergeMonthMaps(maps: Map<string, DirectionByMonthRow>[]): DirectionByMonthRow[] {
  const merged = new Map<string, DirectionByMonthRow>();
  for (const map of maps) {
    for (const [period, row] of map) {
      const entry = merged.get(period) ?? { period, charged: 0, paid: 0, expense: 0 };
      entry.charged += row.charged;
      entry.paid += row.paid;
      entry.expense += row.expense;
      merged.set(period, entry);
    }
  }
  return [...merged.values()].sort((a, b) => a.period.localeCompare(b.period));
}

function buildSummary(rows: DirectionReportRow[]): DirectionReportSummary {
  const totalContract = rows.reduce((s, r) => s + r.contractAmount, 0);
  const totalCharged = rows.reduce((s, r) => s + r.charged, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalExpense = rows.reduce((s, r) => s + r.expense, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  return {
    totalContract,
    totalCharged,
    totalPaid,
    totalExpense,
    totalOutstanding,
    netCashflow: totalPaid - totalExpense,
    entityCount: rows.length,
  };
}

async function buildRentalReport(companyId: number, from?: string, to?: string): Promise<DirectionReport> {
  const contracts = await db
    .select()
    .from(leaseContractsTable)
    .where(eq(leaseContractsTable.companyId, companyId));

  const [allAccruals, allPayments, allExpenses] = await Promise.all([
    db.select().from(accrualsTable).where(eq(accrualsTable.companyId, companyId)),
    db.select().from(paymentsTable).where(eq(paymentsTable.companyId, companyId)),
    db.select().from(expensesTable).where(eq(expensesTable.companyId, companyId)),
  ]);

  const accruals = allAccruals.filter((a) => periodInRange(a.period, from, to));
  const payments = allPayments.filter((p) => dateInRange(p.paymentDate, from, to));
  const rentalExpenses = allExpenses.filter((e) => dateInRange(e.expenseDate, from, to));

  const byMonth = new Map<string, DirectionByMonthRow>();
  for (const a of accruals) bumpMonth(byMonth, a.period, { charged: num(a.amount) });
  for (const p of payments) bumpMonth(byMonth, monthKey(p.paymentDate), { paid: num(p.amount) });
  for (const e of rentalExpenses) bumpMonth(byMonth, monthKey(e.expenseDate), { expense: num(e.amount) });

  const tenantIds = [...new Set(contracts.map((c) => c.tenantId))];
  const propertyIds = [...new Set(contracts.map((c) => c.propertyId))];
  const tenants = tenantIds.length
    ? await db.select().from(tenantsTable).where(eq(tenantsTable.companyId, companyId))
    : [];
  const properties = propertyIds.length
    ? await db.select().from(propertiesTable).where(eq(propertiesTable.companyId, companyId))
    : [];
  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.fullName]));
  const propMap = Object.fromEntries(properties.map((p) => [p.id, p.unitNumber]));

  type TenantAgg = {
    tenantId: number;
    contractAmount: number;
    charged: number;
    paid: number;
    allTimePaid: number;
    expense: number;
    outstanding: number;
    currency: string;
    status: string;
    units: string[];
  };
  const byTenant = new Map<number, TenantAgg>();

  for (const c of contracts) {
    const tid = c.tenantId;
    const agg = byTenant.get(tid) ?? {
      tenantId: tid,
      contractAmount: 0,
      charged: 0,
      paid: 0,
      allTimePaid: 0,
      expense: 0,
      outstanding: 0,
      currency: c.currency ?? "KGS",
      status: c.status,
      units: [],
    };

    const unit = propMap[c.propertyId];
    if (unit && !agg.units.includes(unit)) agg.units.push(unit);

    agg.charged += accruals
      .filter((a) => a.leaseContractId === c.id)
      .reduce((s, a) => s + num(a.amount), 0);
    agg.paid += payments
      .filter((p) => p.leaseContractId === c.id)
      .reduce((s, p) => s + num(p.amount), 0);
    agg.allTimePaid += allPayments
      .filter((p) => p.leaseContractId === c.id)
      .reduce((s, p) => s + num(p.amount), 0);
    agg.expense += rentalExpenses
      .filter((e) => e.propertyId === c.propertyId)
      .reduce((s, e) => s + num(e.amount), 0);

    const allTimeCharged = allAccruals
      .filter((a) => a.leaseContractId === c.id)
      .reduce((s, a) => s + num(a.amount), 0);
    agg.contractAmount += allTimeCharged > 0 ? allTimeCharged : num(c.rentAmount) * 12;
    agg.outstanding += allAccruals
      .filter((a) => a.leaseContractId === c.id)
      .reduce((s, a) => s + num(a.balance), 0);
    if (c.status === "active") agg.status = "active";

    byTenant.set(tid, agg);
  }

  const rows: DirectionReportRow[] = [...byTenant.values()].map((agg) => ({
    id: agg.tenantId,
    name: tenantMap[agg.tenantId] ?? `Арендатор #${agg.tenantId}`,
    subtitle: agg.units.length ? agg.units.join(", ") : undefined,
    status: agg.status,
    role: "rental" as const,
    roleLabel: "Арендатор",
    contractAmount: agg.contractAmount,
    charged: agg.charged,
    paid: agg.allTimePaid,
    expense: agg.expense,
    outstanding: agg.outstanding,
    paymentRate: paymentRate(agg.contractAmount, agg.allTimePaid),
    currency: agg.currency,
  })).filter((r) => r.charged > 0 || r.paid > 0 || r.expense > 0 || r.outstanding > 0 || r.status === "active");

  return {
    direction: "rental",
    label: DIRECTION_LABELS.rental,
    summary: buildSummary(rows),
    byMonth: [...byMonth.values()].sort((a, b) => a.period.localeCompare(b.period)),
    rows: rows.sort((a, b) => b.outstanding - a.outstanding),
  };
}

async function buildSalesReport(companyId: number, from?: string, to?: string): Promise<DirectionReport> {
  const contracts = await db
    .select()
    .from(constructionSalesContractsTable)
    .where(eq(constructionSalesContractsTable.companyId, companyId));

  const contractIds = contracts.map((c) => c.id);
  const [allAccruals, allPayments] = await Promise.all([
    contractIds.length
      ? db.select().from(constructionAccrualsTable).where(eq(constructionAccrualsTable.companyId, companyId))
      : Promise.resolve([]),
    contractIds.length
      ? db.select().from(constructionOperationsTable).where(
          and(
            eq(constructionOperationsTable.companyId, companyId),
            eq(constructionOperationsTable.type, "income"),
          ),
        )
      : Promise.resolve([]),
  ]);

  const accruals = allAccruals.filter((a) => dateInRange(a.dueDate, from, to));
  const payments = allPayments.filter(
    (p) => p.contractId && dateInRange(p.date, from, to),
  );

  const byMonth = new Map<string, DirectionByMonthRow>();
  for (const a of accruals) bumpMonth(byMonth, monthKey(a.dueDate), { charged: num(a.amount) });
  for (const p of payments) {
    if (p.contractId) bumpMonth(byMonth, monthKey(p.date), { paid: num(p.amount) });
  }

  const rows: DirectionReportRow[] = [...(() => {
    type BuyerAgg = {
      key: number;
      name: string;
      contractAmount: number;
      charged: number;
      paid: number;
      allTimePaid: number;
      outstanding: number;
      currency: string;
      status: string;
      contracts: string[];
    };
    const byBuyer = new Map<number, BuyerAgg>();

    for (const c of contracts) {
      const key = c.buyerId ?? -(c.id);
      const agg = byBuyer.get(key) ?? {
        key,
        name: c.buyerName ?? `Покупатель #${Math.abs(key)}`,
        contractAmount: 0,
        charged: 0,
        paid: 0,
        allTimePaid: 0,
        outstanding: 0,
        currency: c.currency ?? "KGS",
        status: c.status,
        contracts: [],
      };

      if (c.contractNumber) agg.contracts.push(`№ ${c.contractNumber}`);
      agg.contractAmount += num(c.totalAmount);
      agg.charged += accruals
        .filter((a) => a.contractId === c.id)
        .reduce((s, a) => s + num(a.amount), 0);
      agg.paid += payments
        .filter((p) => p.contractId === c.id)
        .reduce((s, p) => s + num(p.amount), 0);
      agg.allTimePaid += num(c.paidAmount);
      agg.outstanding += Math.max(num(c.totalAmount) - num(c.paidAmount), 0);
      if (["signed", "completed", "active"].includes(c.status)) agg.status = c.status;
      byBuyer.set(key, agg);
    }

    return [...byBuyer.values()].map((agg) => ({
      id: Math.abs(agg.key),
      name: agg.name,
      subtitle: agg.contracts.length ? agg.contracts.join(", ") : undefined,
      status: agg.status,
      role: "sales" as const,
      roleLabel: "Покупатель",
      contractAmount: agg.contractAmount,
      charged: agg.charged,
      paid: agg.allTimePaid,
      expense: 0,
      outstanding: agg.outstanding,
      paymentRate: paymentRate(agg.contractAmount, agg.allTimePaid),
      currency: agg.currency,
    }));
  })()].filter((r) => r.contractAmount > 0 || r.charged > 0 || r.paid > 0);

  return {
    direction: "sales",
    label: DIRECTION_LABELS.sales,
    summary: buildSummary(rows),
    byMonth: [...byMonth.values()].sort((a, b) => a.period.localeCompare(b.period)),
    rows: rows.sort((a, b) => b.outstanding - a.outstanding),
  };
}

async function buildContractorsReport(companyId: number, from?: string, to?: string): Promise<DirectionReport> {
  const contractors = await db
    .select()
    .from(constructionContractorsTable)
    .where(eq(constructionContractorsTable.companyId, companyId));

  const contractorIds = contractors.map((c) => c.id);
  const allExpenses = contractorIds.length
    ? await db.select().from(constructionExpensesTable).where(eq(constructionExpensesTable.companyId, companyId))
    : [];

  const expenses = allExpenses.filter(
    (e) => e.contractorId && dateInRange(e.date, from, to),
  );

  const byMonth = new Map<string, DirectionByMonthRow>();
  for (const e of expenses) {
    bumpMonth(byMonth, monthKey(e.date), { expense: num(e.amountKgs ?? e.amount), paid: num(e.amountKgs ?? e.amount) });
  }

  const rows: DirectionReportRow[] = contractors.map((c) => {
    const periodPaid = expenses
      .filter((e) => e.contractorId === c.id && (e.status === "paid" || e.status === "approved"))
      .reduce((s, e) => s + num(e.amountKgs ?? e.amount), 0);
    const periodExpense = expenses
      .filter((e) => e.contractorId === c.id)
      .reduce((s, e) => s + num(e.amountKgs ?? e.amount), 0);
    const contractAmount = num(c.contractAmount);
    const allTimePaid = num(c.paidAmount);
    const outstanding = Math.max(contractAmount - allTimePaid, 0);

    return {
      id: c.id,
      name: c.fullName,
      subtitle: c.specialization ?? undefined,
      status: c.status,
      role: "contractors" as const,
      roleLabel: "Подрядчик",
      contractAmount,
      charged: contractAmount,
      paid: allTimePaid,
      expense: periodExpense,
      outstanding,
      paymentRate: paymentRate(contractAmount, allTimePaid),
      currency: c.currency ?? "KGS",
    };
  }).filter((r) => r.contractAmount > 0 || r.paid > 0 || r.expense > 0 || r.status === "active");

  return {
    direction: "contractors",
    label: DIRECTION_LABELS.contractors,
    summary: buildSummary(rows),
    byMonth: [...byMonth.values()].sort((a, b) => a.period.localeCompare(b.period)),
    rows: rows.sort((a, b) => b.outstanding - a.outstanding),
  };
}

async function buildSuppliersReport(companyId: number, from?: string, to?: string): Promise<DirectionReport> {
  const suppliers = await db
    .select()
    .from(warehouseSuppliersTable)
    .where(eq(warehouseSuppliersTable.companyId, companyId));

  const supplierIds = suppliers.map((s) => s.id);
  const [allIncoming, allPayments] = await Promise.all([
    supplierIds.length
      ? db.select().from(warehouseIncomingTable).where(eq(warehouseIncomingTable.companyId, companyId))
      : Promise.resolve([]),
    supplierIds.length
      ? db.select().from(warehouseSupplierPaymentsTable).where(eq(warehouseSupplierPaymentsTable.companyId, companyId))
      : Promise.resolve([]),
  ]);

  const incoming = allIncoming.filter(
    (i) => i.supplierId && dateInRange(i.documentDate ?? i.createdAt.toISOString(), from, to),
  );
  const payments = allPayments.filter((p) => dateInRange(p.date, from, to));

  const byMonth = new Map<string, DirectionByMonthRow>();
  for (const i of incoming) {
    const d = i.documentDate ?? i.createdAt.toISOString();
    bumpMonth(byMonth, monthKey(d), { charged: num(i.totalAmount) });
  }
  for (const p of payments) bumpMonth(byMonth, monthKey(p.date), { paid: num(p.amount) });

  const rows: DirectionReportRow[] = suppliers.map((s) => {
    const periodSupplied = incoming
      .filter((i) => i.supplierId === s.id)
      .reduce((sum, i) => sum + num(i.totalAmount), 0);

    const allTimeSupplied = allIncoming
      .filter((i) => i.supplierId === s.id)
      .reduce((sum, i) => sum + num(i.totalAmount), 0);
    const allTimePaid = num(s.paidAmount);
    const contractAmount = num(s.contractAmount);
    const outstanding = Math.max(
      allTimeSupplied - allTimePaid,
      contractAmount - allTimePaid,
      0,
    );

    return {
      id: s.id,
      name: s.name,
      subtitle: s.contractNumber ? `№ ${s.contractNumber}` : undefined,
      status: s.isActive ? "active" : "inactive",
      role: "suppliers" as const,
      roleLabel: "Поставщик",
      contractAmount,
      charged: allTimeSupplied || periodSupplied,
      paid: allTimePaid,
      expense: periodSupplied,
      outstanding,
      paymentRate: paymentRate(allTimeSupplied || contractAmount, allTimePaid),
      currency: s.currency ?? "KGS",
    };
  }).filter((r) => r.contractAmount > 0 || r.charged > 0 || r.paid > 0 || r.status === "active");

  return {
    direction: "suppliers",
    label: DIRECTION_LABELS.suppliers,
    summary: buildSummary(rows),
    byMonth: [...byMonth.values()].sort((a, b) => a.period.localeCompare(b.period)),
    rows: rows.sort((a, b) => b.outstanding - a.outstanding),
  };
}

const BUILDERS: Record<
  DirectionKey,
  (companyId: number, from?: string, to?: string) => Promise<DirectionReport>
> = {
  rental: buildRentalReport,
  sales: buildSalesReport,
  contractors: buildContractorsReport,
  suppliers: buildSuppliersReport,
};

export function isDirectionKey(v: string): v is DirectionKey {
  return v === "rental" || v === "sales" || v === "contractors" || v === "suppliers";
}

export async function buildDirectionReport(
  direction: DirectionKey,
  companyId: number,
  from?: string,
  to?: string,
): Promise<DirectionReport> {
  return BUILDERS[direction](companyId, from, to);
}

export async function buildAllDirectionReports(
  companyId: number,
  from?: string,
  to?: string,
): Promise<DirectionReport[]> {
  return Promise.all(
    (Object.keys(BUILDERS) as DirectionKey[]).map((d) => BUILDERS[d](companyId, from, to)),
  );
}

export async function buildCounterpartyDashboard(
  companyId: number,
  from?: string,
  to?: string,
  directionFilter?: DirectionKey,
): Promise<CounterpartyDashboard> {
  const reports = await buildAllDirectionReports(companyId, from, to);
  const filtered = directionFilter
    ? reports.filter((r) => r.direction === directionFilter)
    : reports;

  const rows = filtered.flatMap((r) => r.rows).sort((a, b) => b.outstanding - a.outstanding);
  const summary = buildSummary(rows);
  const totalPaidAll = filtered.reduce((s, r) => s + r.summary.totalPaid, 0);
  const totalOutstandingAll = filtered.reduce((s, r) => s + r.summary.totalOutstanding, 0);

  const byDirection: DirectionSegment[] = filtered.map((r) => ({
    direction: r.direction,
    label: r.label,
    paid: r.summary.totalPaid,
    outstanding: r.summary.totalOutstanding,
    entityCount: r.summary.entityCount,
    paidShare: totalPaidAll > 0 ? Math.round((r.summary.totalPaid / totalPaidAll) * 1000) / 10 : 0,
    outstandingShare: totalOutstandingAll > 0
      ? Math.round((r.summary.totalOutstanding / totalOutstandingAll) * 1000) / 10
      : 0,
  }));

  const monthMaps = filtered.map((r) => {
    const m = new Map<string, DirectionByMonthRow>();
    for (const row of r.byMonth) m.set(row.period, row);
    return m;
  });

  const rates = rows.filter((r) => r.paymentRate > 0).map((r) => r.paymentRate);
  const avgPaymentRate = rates.length
    ? Math.round(rates.reduce((s, v) => s + v, 0) / rates.length)
    : 0;

  return {
    summary: { ...summary, avgPaymentRate },
    byMonth: mergeMonthMaps(monthMaps),
    byDirection,
    rows,
  };
}
