import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db, investorsTable, investmentsTable, distributionsTable, propertiesTable
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// ── INVESTORS ─────────────────────────────────────────────────────────────────

router.get("/investors", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select().from(investorsTable)
    .where(eq(investorsTable.companyId, req.companyId!))
    .orderBy(desc(investorsTable.createdAt));
  res.json(rows);
});

router.post("/investors", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { fullName, type, phone, email, iin, telegramId, status, notes } = req.body;
  if (!fullName) { res.status(400).json({ error: "fullName required" }); return; }
  const [row] = await db.insert(investorsTable).values({
    companyId: req.companyId!, fullName, type: type || "individual",
    phone, email, iin, telegramId, status: status || "active", notes,
  }).returning();
  res.status(201).json(row);
});

router.patch("/investors/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { fullName, type, phone, email, iin, telegramId, status, notes } = req.body;
  const [row] = await db.update(investorsTable)
    .set({ fullName, type, phone, email, iin, telegramId, status, notes })
    .where(and(eq(investorsTable.id, id), eq(investorsTable.companyId, req.companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/investors/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(investorsTable)
    .where(and(eq(investorsTable.id, id), eq(investorsTable.companyId, req.companyId!)));
  res.json({ ok: true });
});

// ── INVESTMENTS ───────────────────────────────────────────────────────────────

router.get("/investments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select({
    id: investmentsTable.id,
    companyId: investmentsTable.companyId,
    propertyId: investmentsTable.propertyId,
    investorId: investmentsTable.investorId,
    sharePercent: investmentsTable.sharePercent,
    capitalInvested: investmentsTable.capitalInvested,
    currency: investmentsTable.currency,
    investedAt: investmentsTable.investedAt,
    notes: investmentsTable.notes,
    createdAt: investmentsTable.createdAt,
    propertyName: propertiesTable.projectName,
    propertyUnit: propertiesTable.unitNumber,
    investorName: investorsTable.fullName,
    investorPhone: investorsTable.phone,
  })
    .from(investmentsTable)
    .leftJoin(propertiesTable, eq(investmentsTable.propertyId, propertiesTable.id))
    .leftJoin(investorsTable, eq(investmentsTable.investorId, investorsTable.id))
    .where(eq(investmentsTable.companyId, req.companyId!))
    .orderBy(desc(investmentsTable.createdAt));
  res.json(rows);
});

router.post("/investments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, investorId, sharePercent, capitalInvested, currency, investedAt, notes } = req.body;
  if (!propertyId || !investorId || !sharePercent) {
    res.status(400).json({ error: "propertyId, investorId, sharePercent required" }); return;
  }
  const [row] = await db.insert(investmentsTable).values({
    companyId: req.companyId!, propertyId, investorId,
    sharePercent: String(sharePercent),
    capitalInvested: String(capitalInvested || 0),
    currency: currency || "KGS",
    investedAt: investedAt || null,
    notes: notes || null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/investments/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { sharePercent, notes } = req.body;
  const patch: Record<string, unknown> = {};
  if (sharePercent !== undefined) patch.sharePercent = String(sharePercent);
  if (notes !== undefined) patch.notes = notes;
  const [row] = await db.update(investmentsTable)
    .set(patch)
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.companyId, req.companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/investments/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(investmentsTable)
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.companyId, req.companyId!)));
  res.json({ ok: true });
});

// ── DISTRIBUTIONS ─────────────────────────────────────────────────────────────

router.get("/distributions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select({
    id: distributionsTable.id,
    companyId: distributionsTable.companyId,
    propertyId: distributionsTable.propertyId,
    period: distributionsTable.period,
    grossIncome: distributionsTable.grossIncome,
    expenses: distributionsTable.expenses,
    netProfit: distributionsTable.netProfit,
    currency: distributionsTable.currency,
    status: distributionsTable.status,
    notes: distributionsTable.notes,
    createdAt: distributionsTable.createdAt,
    propertyName: propertiesTable.projectName,
    propertyUnit: propertiesTable.unitNumber,
  })
    .from(distributionsTable)
    .leftJoin(propertiesTable, eq(distributionsTable.propertyId, propertiesTable.id))
    .where(eq(distributionsTable.companyId, req.companyId!))
    .orderBy(desc(distributionsTable.createdAt));
  res.json(rows);
});

router.post("/distributions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { propertyId, period, grossIncome, expenses, currency, notes } = req.body;
  if (!propertyId || !period) {
    res.status(400).json({ error: "propertyId, period required" }); return;
  }
  const gross = parseFloat(String(grossIncome || 0));
  const exp = parseFloat(String(expenses || 0));
  const netProfit = gross - exp;
  const [row] = await db.insert(distributionsTable).values({
    companyId: req.companyId!, propertyId, period,
    grossIncome: String(gross), expenses: String(exp), netProfit: String(netProfit),
    currency: currency || "KGS",
    status: "pending",
    notes: notes || null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/distributions/:id/status", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { status } = req.body;
  const [row] = await db.update(distributionsTable)
    .set({ status })
    .where(and(eq(distributionsTable.id, id), eq(distributionsTable.companyId, req.companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/distributions/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await db.delete(distributionsTable)
    .where(and(eq(distributionsTable.id, id), eq(distributionsTable.companyId, req.companyId!)));
  res.json({ ok: true });
});

// ── PORTFOLIO OVERVIEW (for dashboard) ───────────────────────────────────────

router.get("/portfolio-overview", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [properties, investments, investors, distributions] = await Promise.all([
    db.select().from(propertiesTable).where(eq(propertiesTable.companyId, req.companyId!)),
    db.select().from(investmentsTable).where(eq(investmentsTable.companyId, req.companyId!)),
    db.select().from(investorsTable).where(eq(investorsTable.companyId, req.companyId!)),
    db.select().from(distributionsTable).where(eq(distributionsTable.companyId, req.companyId!)),
  ]);

  const totalCapital = investments.reduce((s, i) => s + parseFloat(i.capitalInvested), 0);
  const pendingPayouts = distributions
    .filter(d => d.status === "pending" || d.status === "calculated")
    .reduce((s, d) => s + parseFloat(d.netProfit), 0);

  res.json({
    totalProperties: properties.length,
    activeInvestors: investors.filter(i => i.status === "active").length,
    totalCapitalInvested: totalCapital,
    pendingPayouts,
    distributionsCount: distributions.length,
  });
});

export default router;
