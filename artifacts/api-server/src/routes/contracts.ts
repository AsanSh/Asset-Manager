import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, contractsTable, counterpartiesTable, propertiesTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

router.get("/contracts", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { type, counterpartyId, propertyId, status } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  if (req.companyId) conditions.push(eq(contractsTable.companyId, req.companyId));
  if (type) conditions.push(eq(contractsTable.type, type));
  if (counterpartyId) conditions.push(eq(contractsTable.counterpartyId, parseInt(counterpartyId, 10)));
  if (propertyId) conditions.push(eq(contractsTable.propertyId, parseInt(propertyId, 10)));
  if (status) conditions.push(eq(contractsTable.status, status));

  const rows = await db.select().from(contractsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(contractsTable.createdAt);

  const enriched = await Promise.all(rows.map(async (c) => {
    let counterpartyName = null;
    let propertyUnitNumber = null;
    if (c.counterpartyId) {
      const [cp] = await db.select().from(counterpartiesTable).where(eq(counterpartiesTable.id, c.counterpartyId));
      counterpartyName = cp?.fullName ?? null;
    }
    if (c.propertyId) {
      const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, c.propertyId));
      propertyUnitNumber = p?.unitNumber ?? null;
    }
    return { ...c, counterpartyName, propertyUnitNumber };
  }));
  res.json(enriched);
});

router.post("/contracts", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { contractNumber, contractDate, type, counterpartyId, propertyId, amount, currency, startDate, endDate, accrualDate, deposit, status, comment } = req.body;
  if (!contractNumber || !type || !status) {
    res.status(400).json({ error: "contractNumber, type, status required" });
    return;
  }
  const [row] = await db.insert(contractsTable).values({
    companyId: req.companyId, contractNumber, contractDate, type, counterpartyId, propertyId, amount, currency, startDate, endDate, accrualDate, deposit, status, comment
  }).returning();
  res.status(201).json({ ...row, counterpartyName: null, propertyUnitNumber: null });
});

router.get("/contracts/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(contractsTable.id, id)];
  if (req.companyId) conditions.push(eq(contractsTable.companyId, req.companyId));
  const [row] = await db.select().from(contractsTable).where(and(...conditions));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, counterpartyName: null, propertyUnitNumber: null });
});

router.patch("/contracts/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { contractNumber, contractDate, type, counterpartyId, propertyId, amount, currency, startDate, endDate, accrualDate, deposit, status, comment } = req.body;
  const conditions: SQL[] = [eq(contractsTable.id, id)];
  if (req.companyId) conditions.push(eq(contractsTable.companyId, req.companyId));
  const [row] = await db.update(contractsTable)
    .set({ contractNumber, contractDate, type, counterpartyId, propertyId, amount, currency, startDate, endDate, accrualDate, deposit, status, comment })
    .where(and(...conditions)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, counterpartyName: null, propertyUnitNumber: null });
});

router.delete("/contracts/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(contractsTable.id, id)];
  if (req.companyId) conditions.push(eq(contractsTable.companyId, req.companyId));
  await db.delete(contractsTable).where(and(...conditions));
  res.sendStatus(204);
});

export default router;
