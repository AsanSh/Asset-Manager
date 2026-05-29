import { Router } from "express";
import { eq, ilike, and, sql, SQL } from "drizzle-orm";
import { db, counterpartiesTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// Допустимые роли контрагентов
const VALID_ROLES = [
  "tenant", "landlord",
  "buyer", "seller", "lead",
  "material_supplier",
  "service_provider", "subcontractor",
  "other",
];

function normalizeCategories(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((c) => typeof c === "string");
  if (typeof input === "string") return [input];
  return [];
}

router.get("/counterparties", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { type, search, role, roles } = req.query as { type?: string; search?: string; role?: string; roles?: string };
  const conditions: SQL[] = [];
  conditions.push(eq(counterpartiesTable.companyId, req.scopedCompanyId!));
  if (type) conditions.push(eq(counterpartiesTable.type, type));
  if (search) conditions.push(ilike(counterpartiesTable.fullName, `%${search}%`));

  // Фильтр по роли — если указан role= или roles=, ищем пересечение с categories[]
  const filterRoles: string[] = [];
  if (role) filterRoles.push(role);
  if (roles) filterRoles.push(...roles.split(",").map((s) => s.trim()).filter(Boolean));

  if (filterRoles.length > 0) {
    // categories && ARRAY['role1','role2'] — есть пересечение
    conditions.push(
      sql`(${counterpartiesTable.categories} && ${sql.raw(`ARRAY[${filterRoles.map((r) => `'${r.replace(/'/g, "''")}'`).join(",")}]::text[]`)})` as SQL,
    );
  }

  const rows = await db.select().from(counterpartiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(counterpartiesTable.createdAt);
  res.json(rows);
});

router.post("/counterparties", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { type, category, categories, fullName, iin, phone, email, address, additionalContact, comment, externalId } = req.body;
  if (!type || !fullName) { res.status(400).json({ error: "type and fullName are required" }); return; }

  // Принимаем категории как массив, fallback на одиночное category
  let cats = normalizeCategories(categories);
  if (cats.length === 0 && category) cats = [category];
  if (cats.length === 0) cats = ["other"];

  // Валидация ролей
  const invalid = cats.filter((c) => !VALID_ROLES.includes(c));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Недопустимые роли: ${invalid.join(", ")}` });
    return;
  }

  const [row] = await db.insert(counterpartiesTable).values({
    companyId: req.scopedCompanyId!,
    type,
    category: cats[0], // legacy field
    categories: cats,
    fullName, iin, phone, email, address, additionalContact, comment, externalId,
  }).returning();
  res.status(201).json(row);
});

router.get("/counterparties/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(counterpartiesTable.id, id)];
  conditions.push(eq(counterpartiesTable.companyId, req.scopedCompanyId!));
  const [row] = await db.select().from(counterpartiesTable).where(and(...conditions));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/counterparties/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { type, category, categories, fullName, iin, phone, email, address, additionalContact, comment } = req.body;
  const conditions: SQL[] = [eq(counterpartiesTable.id, id)];
  conditions.push(eq(counterpartiesTable.companyId, req.scopedCompanyId!));
  const updates: Record<string, unknown> = { type, fullName, iin, phone, email, address, additionalContact, comment };
  if (category !== undefined) updates.category = category;
  if (categories !== undefined) {
    const cats = normalizeCategories(categories);
    const invalid = cats.filter((c) => !VALID_ROLES.includes(c));
    if (invalid.length > 0) {
      res.status(400).json({ error: `Недопустимые роли: ${invalid.join(", ")}` });
      return;
    }
    updates.categories = cats;
    if (cats.length > 0) updates.category = cats[0];
  }
  const [row] = await db.update(counterpartiesTable)
    .set(updates)
    .where(and(...conditions)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// Добавить роль контрагенту (например, поставщик становится покупателем)
router.post("/counterparties/:id/add-role", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { role } = req.body;
  if (!role || !VALID_ROLES.includes(role)) {
    res.status(400).json({ error: "Недопустимая роль" });
    return;
  }

  const [existing] = await db.select().from(counterpartiesTable)
    .where(and(eq(counterpartiesTable.id, id), eq(counterpartiesTable.companyId, req.scopedCompanyId!)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const current = Array.isArray(existing.categories) ? existing.categories : [];
  if (current.includes(role)) {
    res.json(existing);
    return;
  }
  const next = [...current, role];
  const [row] = await db.update(counterpartiesTable)
    .set({ categories: next })
    .where(eq(counterpartiesTable.id, id))
    .returning();
  res.json(row);
});

// Убрать роль
router.post("/counterparties/:id/remove-role", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { role } = req.body;
  if (!role) { res.status(400).json({ error: "role обязателен" }); return; }

  const [existing] = await db.select().from(counterpartiesTable)
    .where(and(eq(counterpartiesTable.id, id), eq(counterpartiesTable.companyId, req.scopedCompanyId!)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const current = Array.isArray(existing.categories) ? existing.categories : [];
  const next = current.filter((c) => c !== role);
  if (next.length === 0) next.push("other");
  const [row] = await db.update(counterpartiesTable)
    .set({ categories: next, category: next[0] })
    .where(eq(counterpartiesTable.id, id))
    .returning();
  res.json(row);
});

router.delete("/counterparties/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(counterpartiesTable.id, id)];
  conditions.push(eq(counterpartiesTable.companyId, req.scopedCompanyId!));
  await db.delete(counterpartiesTable).where(and(...conditions));
  res.sendStatus(204);
});

export default router;
