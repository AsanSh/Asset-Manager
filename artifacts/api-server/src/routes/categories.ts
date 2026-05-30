import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, financialCategoriesTable } from "../lib/db";
import { ensureCompanyFinancialCategories } from "../lib/financial-category-catalog";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

async function listCategories(companyId: number) {
  await ensureCompanyFinancialCategories(companyId);
  return db
    .select()
    .from(financialCategoriesTable)
    .where(eq(financialCategoriesTable.companyId, companyId))
    .orderBy(asc(financialCategoriesTable.sortOrder), asc(financialCategoriesTable.name));
}

router.get("/categories", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await listCategories(req.companyId!);
  res.json(rows);
});

/** Ручная синхронизация пресетов и статей из операций (идемпотентно). */
router.post("/categories/sync", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await listCategories(req.companyId!);
  res.json({ ok: true, count: rows.length, categories: rows });
});

router.post("/categories", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { name, type, parentId, module, color, sortOrder } = req.body;
  if (!name || !type) { res.status(400).json({ error: "name and type required" }); return; }
  const [row] = await db.insert(financialCategoriesTable).values({
    companyId: req.companyId!,
    name,
    type,
    parentId: parentId || null,
    module: module || "all",
    color: color || null,
    sortOrder: sortOrder ?? 0,
    isActive: true,
  }).returning();
  res.json(row);
});

router.patch("/categories/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { name, type, parentId, module, color, sortOrder, isActive } = req.body;
  const updates: Partial<typeof financialCategoriesTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (parentId !== undefined) updates.parentId = parentId || null;
  if (module !== undefined) updates.module = module;
  if (color !== undefined) updates.color = color;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (isActive !== undefined) updates.isActive = isActive;
  const [row] = await db.update(financialCategoriesTable)
    .set(updates)
    .where(and(eq(financialCategoriesTable.id, id), eq(financialCategoriesTable.companyId, req.companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/categories/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [row] = await db.delete(financialCategoriesTable)
    .where(and(eq(financialCategoriesTable.id, id), eq(financialCategoriesTable.companyId, req.companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

export default router;
