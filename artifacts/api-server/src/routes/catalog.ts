import { Router } from "express";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import {
  db,
  globalProductCategoriesTable,
  globalProductsTable,
  supplierProductsTable,
  supplierPriceImportsTable,
  supplierPriceImportRowsTable,
} from "../lib/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();
router.use(requireAuth, requireTenantCompany);

const DEFAULT_ROOT_CATEGORIES = [
  { slug: "metal", nameRu: "Металлопрокат" },
  { slug: "concrete-zbi", nameRu: "Бетон и ЖБИ" },
  { slug: "cement-mixes", nameRu: "Цемент и смеси" },
  { slug: "brick-blocks", nameRu: "Кирпич и блоки" },
  { slug: "inert-materials", nameRu: "Инертные материалы" },
  { slug: "waterproofing", nameRu: "Гидроизоляция" },
  { slug: "insulation", nameRu: "Утеплители" },
  { slug: "roofing", nameRu: "Кровля" },
  { slug: "facade", nameRu: "Фасад" },
  { slug: "windows-doors", nameRu: "Окна и двери" },
  { slug: "electrical", nameRu: "Электрика" },
  { slug: "plumbing", nameRu: "Сантехника" },
  { slug: "ventilation", nameRu: "Вентиляция" },
  { slug: "finishing", nameRu: "Отделка" },
  { slug: "fasteners", nameRu: "Крепеж" },
  { slug: "tools", nameRu: "Инструмент" },
  { slug: "special-equipment", nameRu: "Спецтехника" },
  { slug: "landscaping", nameRu: "Благоустройство" },
];

// GET /catalog/categories
router.get("/catalog/categories", async (_req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(globalProductCategoriesTable)
    .where(eq(globalProductCategoriesTable.isActive, true))
    .orderBy(globalProductCategoriesTable.sortOrder, globalProductCategoriesTable.id);
  res.json(rows);
});

// POST /catalog/categories
router.post(
  "/catalog/categories",
  requireRole("owner", "admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = req.body ?? {};
    if (!body.slug || !body.nameRu) {
      res.status(400).json({ error: "Укажите slug и nameRu" });
      return;
    }
    const [row] = await db
      .insert(globalProductCategoriesTable)
      .values({
        parentId: body.parentId ? Number(body.parentId) : null,
        slug: String(body.slug),
        nameRu: String(body.nameRu),
        sortOrder: Number(body.sortOrder ?? 0),
      })
      .returning();
    res.status(201).json(row);
  },
);

// POST /catalog/categories/seed-defaults
router.post(
  "/catalog/categories/seed-defaults",
  requireRole("owner", "admin", "company_admin"),
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const slugs = DEFAULT_ROOT_CATEGORIES.map((c) => c.slug);
    const existing = await db
      .select({ slug: globalProductCategoriesTable.slug })
      .from(globalProductCategoriesTable)
      .where(inArray(globalProductCategoriesTable.slug, slugs));
    const existingSet = new Set(existing.map((e) => e.slug));

    const toInsert = DEFAULT_ROOT_CATEGORIES
      .filter((c, idx) => !existingSet.has(c.slug))
      .map((c, idx) => ({
        slug: c.slug,
        nameRu: c.nameRu,
        sortOrder: idx,
      }));

    if (toInsert.length > 0) {
      await db.insert(globalProductCategoriesTable).values(toInsert);
    }

    const all = await db
      .select()
      .from(globalProductCategoriesTable)
      .where(inArray(globalProductCategoriesTable.slug, slugs))
      .orderBy(globalProductCategoriesTable.sortOrder, globalProductCategoriesTable.id);

    res.json({
      inserted: toInsert.length,
      total: all.length,
      categories: all,
    });
  },
);

// GET /catalog/products
router.get("/catalog/products", async (req: AuthenticatedRequest, res): Promise<void> => {
  const q = String(req.query.q || "").trim();
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const conditions = [
    eq(globalProductsTable.status, "active"),
    ...(q ? [ilike(globalProductsTable.canonicalName, `%${q}%`)] : []),
    ...(categoryId ? [eq(globalProductsTable.categoryId, categoryId)] : []),
  ];

  const rows = await db
    .select()
    .from(globalProductsTable)
    .where(and(...conditions))
    .orderBy(globalProductsTable.canonicalName);
  res.json(rows);
});

// POST /catalog/products
router.post(
  "/catalog/products",
  requireRole("owner", "admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = req.body ?? {};
    if (!body.categoryId || !body.canonicalName || !body.slug) {
      res.status(400).json({ error: "Укажите categoryId, canonicalName и slug" });
      return;
    }
    const [row] = await db
      .insert(globalProductsTable)
      .values({
        categoryId: Number(body.categoryId),
        canonicalName: String(body.canonicalName),
        slug: String(body.slug),
        unitDefault: String(body.unitDefault || "шт"),
        attributesSchema: body.attributesSchema ? JSON.stringify(body.attributesSchema) : null,
        attributes: body.attributes ? JSON.stringify(body.attributes) : null,
        status: String(body.status || "active"),
        searchText: body.searchText ? String(body.searchText) : null,
      })
      .returning();
    res.status(201).json(row);
  },
);

// GET /catalog/supplier-products
router.get("/catalog/supplier-products", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const supplierId = req.query.supplierId ? Number(req.query.supplierId) : null;
  const q = String(req.query.q || "").trim();
  const conditions = [
    eq(supplierProductsTable.companyId, companyId),
    ...(supplierId ? [eq(supplierProductsTable.supplierId, supplierId)] : []),
    ...(q ? [ilike(supplierProductsTable.localName, `%${q}%`)] : []),
  ];

  const rows = await db
    .select()
    .from(supplierProductsTable)
    .where(and(...conditions))
    .orderBy(desc(supplierProductsTable.updatedAt));
  res.json(rows);
});

// POST /catalog/supplier-products
router.post("/catalog/supplier-products", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body ?? {};
  if (!body.supplierId || !body.localName) {
    res.status(400).json({ error: "Укажите supplierId и localName" });
    return;
  }
  const [row] = await db
    .insert(supplierProductsTable)
    .values({
      companyId,
      supplierId: Number(body.supplierId),
      globalProductId: body.globalProductId ? Number(body.globalProductId) : null,
      localName: String(body.localName),
      localSku: body.localSku ? String(body.localSku) : null,
      unit: String(body.unit || "шт"),
      price: String(body.price ?? "0"),
      currency: String(body.currency || "KGS"),
      minOrderQty: body.minOrderQty ? String(body.minOrderQty) : "1",
      leadTimeDays: body.leadTimeDays ? Number(body.leadTimeDays) : null,
      isActive: body.isActive !== false,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    })
    .returning();
  res.status(201).json(row);
});

// POST /catalog/imports
router.post("/catalog/imports", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body ?? {};
  if (!body.supplierId) {
    res.status(400).json({ error: "Укажите supplierId" });
    return;
  }
  const [imp] = await db
    .insert(supplierPriceImportsTable)
    .values({
      companyId,
      supplierId: Number(body.supplierId),
      sourceType: String(body.sourceType || "excel"),
      fileName: body.fileName ? String(body.fileName) : null,
      status: "uploaded",
      stats: JSON.stringify({ total: 0, matched: 0, pending: 0, errors: 0 }),
      createdBy: req.userId ?? null,
    })
    .returning();
  res.status(201).json(imp);
});

// GET /catalog/imports/:id/rows
router.get("/catalog/imports/:id/rows", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  const status = req.query.status ? String(req.query.status) : null;
  const [imp] = await db
    .select()
    .from(supplierPriceImportsTable)
    .where(
      and(
        eq(supplierPriceImportsTable.id, id),
        eq(supplierPriceImportsTable.companyId, req.scopedCompanyId!),
      ),
    );
  if (!imp) {
    res.status(404).json({ error: "Импорт не найден" });
    return;
  }
  const conditions = [
    eq(supplierPriceImportRowsTable.importId, id),
    ...(status ? [eq(supplierPriceImportRowsTable.matchStatus, status)] : []),
  ];
  const rows = await db
    .select()
    .from(supplierPriceImportRowsTable)
    .where(and(...conditions))
    .orderBy(supplierPriceImportRowsTable.rowNumber);
  res.json({ import: imp, rows });
});

export default router;
