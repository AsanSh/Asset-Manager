import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable } from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// GET /companies — супер-админ: все компании; остальные: только своя
router.get("/companies", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (req.userRole === "super_admin") {
    const companies = await db
      .select()
      .from(companiesTable)
      .orderBy(companiesTable.createdAt);
    res.json(companies);
    return;
  }
  if (req.companyId) {
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, req.companyId));
    res.json(company ? [company] : []);
    return;
  }
  res.json([]);
});

// GET /companies/my — информация о своей организации
router.get("/companies/my", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.companyId) {
    res.status(404).json({ error: "Организация не найдена" });
    return;
  }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, req.companyId));
  if (!company) { res.status(404).json({ error: "Организация не найдена" }); return; }
  res.json(company);
});

// PATCH /companies/my — обновление данных своей организации
router.patch("/companies/my", requireAuth, requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!req.companyId) {
    res.status(400).json({ error: "Нет привязки к организации" });
    return;
  }
  const { name, legalName, bin, phone, email, address, defaultCurrency } = req.body;
  const [company] = await db.update(companiesTable)
    .set({ name, legalName, bin, phone, email, address,
      ...(defaultCurrency !== undefined ? { defaultCurrency: String(defaultCurrency).slice(0, 8) } : {}) })
    .where(eq(companiesTable.id, req.companyId))
    .returning();
  if (!company) { res.status(404).json({ error: "Организация не найдена" }); return; }
  res.json(company);
});

// GET /companies/:id
router.get("/companies/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (
    req.userRole !== "super_admin" &&
    req.companyId &&
    req.companyId !== id
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json(company);
});

// PATCH /companies/:id
router.patch("/companies/:id", requireAuth, requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (
    req.userRole !== "super_admin" &&
    req.companyId &&
    req.companyId !== id
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, legalName, bin, phone, email, address, isActive } = req.body;
  const [company] = await db.update(companiesTable)
    .set({ name, legalName, bin, phone, email, address, isActive })
    .where(eq(companiesTable.id, id))
    .returning();
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json(company);
});

export default router;
