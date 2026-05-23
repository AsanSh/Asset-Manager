import { Router } from "express";
import { eq, sql, and, inArray } from "drizzle-orm";
import {
  db, propertiesTable, tenantsTable, leaseContractsTable, contractsTable,
  counterpartiesTable, accrualsTable, paymentsTable, activityLogTable
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { cache, cacheKeys } from "../lib/cache";

const router: ReturnType<typeof Router> = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const cid = req.companyId;

  // Try cache first
  const cacheKey = cacheKeys.dashboard(cid!);
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  // Все запросы параллельно
  const [allProps, tenants, leaseContracts, contracts, counterparties, accruals] = await Promise.all([
    cid ? db.select().from(propertiesTable).where(eq(propertiesTable.companyId, cid))
        : db.select().from(propertiesTable),
    cid ? db.select({ status: tenantsTable.status }).from(tenantsTable).where(eq(tenantsTable.companyId, cid))
        : db.select({ status: tenantsTable.status }).from(tenantsTable),
    cid ? db.select({ status: leaseContractsTable.status }).from(leaseContractsTable).where(eq(leaseContractsTable.companyId, cid))
        : db.select({ status: leaseContractsTable.status }).from(leaseContractsTable),
    cid ? db.select({ status: contractsTable.status }).from(contractsTable).where(eq(contractsTable.companyId, cid))
        : db.select({ status: contractsTable.status }).from(contractsTable),
    cid ? db.select({ id: counterpartiesTable.id }).from(counterpartiesTable).where(eq(counterpartiesTable.companyId, cid))
        : db.select({ id: counterpartiesTable.id }).from(counterpartiesTable),
    cid ? db.select({ period: accrualsTable.period, amount: accrualsTable.amount, paidAmount: accrualsTable.paidAmount, balance: accrualsTable.balance })
             .from(accrualsTable).where(eq(accrualsTable.companyId, cid))
        : db.select({ period: accrualsTable.period, amount: accrualsTable.amount, paidAmount: accrualsTable.paidAmount, balance: accrualsTable.balance })
             .from(accrualsTable),
  ]);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyAccruals = accruals.filter(a => a.period === currentPeriod);

  const result = {
    totalProperties: allProps.length,
    rentedProperties: allProps.filter(p => p.rentalStatus === "rented").length,
    freeProperties: allProps.filter(p => p.rentalStatus === "free" || !p.rentalStatus).length,
    overdueProperties: allProps.filter(p => p.rentalStatus === "overdue").length,
    totalTenants: tenants.filter(t => t.status === "active").length,
    activeLease: leaseContracts.filter(c => c.status === "active").length,
    totalContractsActive: contracts.filter(c => c.status === "active").length,
    totalCounterparties: counterparties.length,
    monthlyRentCharged: monthlyAccruals.reduce((s, a) => s + parseFloat(a.amount), 0),
    monthlyRentReceived: monthlyAccruals.reduce((s, a) => s + parseFloat(a.paidAmount), 0),
    outstandingBalance: accruals.reduce((s, a) => s + parseFloat(a.balance), 0),
    currency: "KGS",
  };

  // Cache for 5 minutes
  cache.set(cacheKey, result, 300);

  res.json(result);
});

router.get("/dashboard/activity", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) || "20", 10);
  const cid = req.companyId;
  const rows = cid
    ? await db.select().from(activityLogTable).where(eq(activityLogTable.companyId, cid)).orderBy(sql`${activityLogTable.createdAt} desc`).limit(limit)
    : await db.select().from(activityLogTable).orderBy(sql`${activityLogTable.createdAt} desc`).limit(limit);
  res.json(rows);
});

router.get("/dashboard/rental-overview", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const cid = req.companyId;

  // Параллельно запрашиваем properties, accruals и последние платежи
  const [props, allAccruals, payments] = await Promise.all([
    cid ? db.select({ rentalStatus: propertiesTable.rentalStatus }).from(propertiesTable).where(eq(propertiesTable.companyId, cid))
        : db.select({ rentalStatus: propertiesTable.rentalStatus }).from(propertiesTable),
    cid ? db.select({ leaseContractId: accrualsTable.leaseContractId, balance: accrualsTable.balance })
             .from(accrualsTable).where(eq(accrualsTable.companyId, cid))
        : db.select({ leaseContractId: accrualsTable.leaseContractId, balance: accrualsTable.balance })
             .from(accrualsTable),
    cid ? db.select().from(paymentsTable).where(eq(paymentsTable.companyId, cid)).orderBy(sql`${paymentsTable.createdAt} desc`).limit(5)
        : db.select().from(paymentsTable).orderBy(sql`${paymentsTable.createdAt} desc`).limit(5),
  ]);

  // Статусы объектов
  const statusCounts: Record<string, number> = {};
  for (const p of props) {
    const s = p.rentalStatus || "free";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // Топ должников — считаем без N+1
  const debtorMap = new Map<number, number>();
  for (const a of allAccruals) {
    const prev = debtorMap.get(a.leaseContractId) ?? 0;
    debtorMap.set(a.leaseContractId, prev + parseFloat(a.balance));
  }
  const top5ContractIds = [...debtorMap.entries()]
    .filter(([, bal]) => bal > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topDebtors: { tenantName: string; balance: number; currency: string }[] = [];
  if (top5ContractIds.length > 0) {
    const [topContracts, allTenants] = await Promise.all([
      db.select({ id: leaseContractsTable.id, tenantId: leaseContractsTable.tenantId, currency: leaseContractsTable.currency })
        .from(leaseContractsTable).where(inArray(leaseContractsTable.id, top5ContractIds)),
      db.select({ id: tenantsTable.id, fullName: tenantsTable.fullName }).from(tenantsTable)
        .where(inArray(tenantsTable.id,
          (await db.select({ tenantId: leaseContractsTable.tenantId }).from(leaseContractsTable)
            .where(inArray(leaseContractsTable.id, top5ContractIds))).map(r => r.tenantId)
        )),
    ]);
    const tenantMap = new Map(allTenants.map(t => [t.id, t.fullName]));
    topDebtors = topContracts.map(c => ({
      tenantName: tenantMap.get(c.tenantId) ?? "—",
      balance: debtorMap.get(c.id) ?? 0,
      currency: c.currency,
    }));
  }

  // Последние платежи — обогащаем одним запросом
  let recentPayments: { id: number; tenantName: string; amount: number; currency: string; paymentDate: string }[] = [];
  if (payments.length > 0) {
    const paymentContractIds = [...new Set(payments.map(p => p.leaseContractId))];
    const [payContracts] = await Promise.all([
      db.select({ id: leaseContractsTable.id, tenantId: leaseContractsTable.tenantId })
        .from(leaseContractsTable).where(inArray(leaseContractsTable.id, paymentContractIds)),
    ]);
    const payTenantIds = [...new Set(payContracts.map(c => c.tenantId))];
    const payTenants = payTenantIds.length > 0
      ? await db.select({ id: tenantsTable.id, fullName: tenantsTable.fullName })
          .from(tenantsTable).where(inArray(tenantsTable.id, payTenantIds))
      : [];
    const payTenantMap = new Map(payTenants.map(t => [t.id, t.fullName]));
    const payContractMap = new Map(payContracts.map(c => [c.id, c.tenantId]));
    recentPayments = payments.map(p => ({
      id: p.id,
      tenantName: payTenantMap.get(payContractMap.get(p.leaseContractId) ?? -1) ?? "—",
      amount: parseFloat(p.amount),
      currency: p.currency,
      paymentDate: p.paymentDate,
    }));
  }

  res.json({ byStatus, topDebtors, recentPayments });
});

export default router;
