import { Router } from "express";
import { db, accountingPeriodsTable } from "../lib/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// ── Accounting Periods ──────────────────────────────────────────────

router.get("/admin/periods", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.companyId!;
  const rows = await db
    .select()
    .from(accountingPeriodsTable)
    .where(eq(accountingPeriodsTable.companyId, companyId))
    .orderBy(accountingPeriodsTable.startDate);
  res.json(rows);
});

router.post("/admin/periods", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.companyId!;
  const { name, module, startDate, endDate, status, notes } = req.body;
  if (!name || !startDate || !endDate) {
    res.status(400).json({ error: "name, startDate, endDate are required" });
    return;
  }
  const [row] = await db
    .insert(accountingPeriodsTable)
    .values({ companyId, name, module: module || "rental", startDate, endDate, status: status || "open", notes })
    .returning();
  res.status(201).json(row);
});

router.patch("/admin/periods/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.companyId!;
  const id = parseInt(req.params.id as string);
  const { name, module, startDate, endDate, status, notes } = req.body;
  const [row] = await db
    .update(accountingPeriodsTable)
    .set({ name, module, startDate, endDate, status, notes })
    .where(and(eq(accountingPeriodsTable.id, id), eq(accountingPeriodsTable.companyId, companyId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/periods/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.companyId!;
  const id = parseInt(req.params.id as string);
  await db
    .delete(accountingPeriodsTable)
    .where(and(eq(accountingPeriodsTable.id, id), eq(accountingPeriodsTable.companyId, companyId)));
  res.status(204).send();
});

export default router;
