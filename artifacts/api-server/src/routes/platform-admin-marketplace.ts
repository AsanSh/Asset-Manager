import { Router } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import {
  db,
  marketplaceProductsTable,
  marketplaceSuppliersTable,
  marketplacePriceImportsTable,
  usersTable,
} from "../lib/db";
import {
  requireAuth,
  requireSuperAdmin,
  type AuthenticatedRequest,
} from "../middleware/auth";
import type { ParsedPriceRow } from "../lib/marketplace-price-xlsx";
import {
  commitMarketplacePriceImport,
  parseMarketplacePriceImport,
} from "../lib/marketplace-import-core";
import { createPortalUser } from "../lib/portal-account";
import { hashPassword, validatePassword } from "../lib/security";

const router: ReturnType<typeof Router> = Router();

const SUPPLIER_TYPES = new Set(["seller", "distributor"]);

function supplierTypeLabel(type: string) {
  return type === "distributor" ? "distributor" : "seller";
}

async function loadMarketplaceSupplierPortalPreview(supplierId: number) {
  const [supplier] = await db
    .select()
    .from(marketplaceSuppliersTable)
    .where(eq(marketplaceSuppliersTable.id, supplierId));
  if (!supplier) return null;

  const [{ total }] = await db
    .select({ total: count() })
    .from(marketplaceProductsTable)
    .where(eq(marketplaceProductsTable.supplierId, supplierId));
  const [{ active }] = await db
    .select({ active: count() })
    .from(marketplaceProductsTable)
    .where(
      and(
        eq(marketplaceProductsTable.supplierId, supplierId),
        eq(marketplaceProductsTable.isActive, true),
      ),
    );
  const [portalUser] = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      phone: usersTable.phone,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "marketplace_supplier"),
        eq(usersTable.linkedMarketplaceSupplierId, supplierId),
      ),
    );

  return {
    supplier,
    stats: {
      productsTotal: Number(total),
      productsActive: Number(active),
    },
    portalUser: portalUser ?? null,
    preview: true as const,
  };
}

// ── Поставщики ───────────────────────────────────────────────────────────────

router.get(
  "/platform-admin/marketplace/suppliers",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const rows = await db
      .select()
      .from(marketplaceSuppliersTable)
      .orderBy(marketplaceSuppliersTable.name);
    const portalUsers = await db
      .select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        phone: usersTable.phone,
        email: usersTable.email,
        linkedMarketplaceSupplierId: usersTable.linkedMarketplaceSupplierId,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "marketplace_supplier"));
    const bySupplier = new Map(
      portalUsers
        .filter((u) => u.linkedMarketplaceSupplierId != null)
        .map((u) => [u.linkedMarketplaceSupplierId!, u]),
    );
    res.json(rows.map((s) => ({ ...s, portalUser: bySupplier.get(s.id) ?? null })));
  },
);

router.post(
  "/platform-admin/marketplace/suppliers",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = req.body ?? {};
    const name = String(body.name || "").trim();
    if (!name) {
      res.status(400).json({ error: "Укажите название поставщика" });
      return;
    }
    const supplierType = SUPPLIER_TYPES.has(String(body.supplierType))
      ? supplierTypeLabel(String(body.supplierType))
      : "seller";
    const [row] = await db
      .insert(marketplaceSuppliersTable)
      .values({
        name,
        supplierType,
        code: body.code ? String(body.code).trim() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        email: body.email ? String(body.email).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
        isActive: body.isActive !== false,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/platform-admin/marketplace/suppliers/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const body = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name != null) patch.name = String(body.name).trim();
    if (body.code !== undefined) patch.code = body.code ? String(body.code).trim() : null;
    if (body.phone !== undefined) patch.phone = body.phone ? String(body.phone).trim() : null;
    if (body.email !== undefined) patch.email = body.email ? String(body.email).trim() : null;
    if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).trim() : null;
    if (body.isActive !== undefined) patch.isActive = !!body.isActive;
    if (body.supplierType != null && SUPPLIER_TYPES.has(String(body.supplierType))) {
      patch.supplierType = supplierTypeLabel(String(body.supplierType));
    }

    const [row] = await db
      .update(marketplaceSuppliersTable)
      .set(patch)
      .where(eq(marketplaceSuppliersTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Поставщик не найден" });
      return;
    }
    res.json(row);
  },
);

router.post(
  "/platform-admin/marketplace/suppliers/:id/portal-account",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const supplierId = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    const body = req.body ?? {};
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const password = body.password ? String(body.password) : null;

    const [supplier] = await db
      .select()
      .from(marketplaceSuppliersTable)
      .where(eq(marketplaceSuppliersTable.id, supplierId));
    if (!supplier) {
      res.status(404).json({ error: "Поставщик не найден" });
      return;
    }
    if (!firstName || !lastName) {
      res.status(400).json({ error: "Укажите имя и фамилию" });
      return;
    }

    try {
      const result = await createPortalUser({
        companyId: null,
        role: "marketplace_supplier",
        firstName,
        lastName,
        phone,
        email,
        linkedEntityKey: "linkedMarketplaceSupplierId",
        linkedEntityId: supplierId,
      });

      if (password) {
        const check = validatePassword(password);
        if (!check.valid) {
          res.status(400).json({ error: check.error });
          return;
        }
        await db
          .update(usersTable)
          .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
          .where(eq(usersTable.id, result.user.id));
      }

      const [fresh] = await db
        .select({
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          phone: usersTable.phone,
          email: usersTable.email,
          role: usersTable.role,
        })
        .from(usersTable)
        .where(eq(usersTable.id, result.user.id));

      res.status(result.created ? 201 : 200).json({
        user: fresh,
        created: result.created,
        loginUrl: phone
          ? "https://proptech-sigma-eight.vercel.app/portal-login"
          : "https://proptech-sigma-eight.vercel.app/login",
        portalUrl: "https://proptech-sigma-eight.vercel.app/marketplace-supplier-portal",
      });
    } catch (e) {
      res.status(409).json({
        error: e instanceof Error ? e.message : "Не удалось создать аккаунт",
      });
    }
  },
);

router.get(
  "/platform-admin/marketplace/suppliers/:id/portal-preview",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const supplierId = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    const data = await loadMarketplaceSupplierPortalPreview(supplierId);
    if (!data) {
      res.status(404).json({ error: "Поставщик не найден" });
      return;
    }
    res.json(data);
  },
);

router.get(
  "/platform-admin/marketplace/suppliers/:id/portal-preview/products",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const supplierId = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    const [supplier] = await db
      .select({ id: marketplaceSuppliersTable.id })
      .from(marketplaceSuppliersTable)
      .where(eq(marketplaceSuppliersTable.id, supplierId));
    if (!supplier) {
      res.status(404).json({ error: "Поставщик не найден" });
      return;
    }
    const rows = await db
      .select()
      .from(marketplaceProductsTable)
      .where(eq(marketplaceProductsTable.supplierId, supplierId))
      .orderBy(marketplaceProductsTable.name);
    res.json(rows);
  },
);

// ── Товары (с поставщиком) ─────────────────────────────────────────────────

router.get(
  "/platform-admin/marketplace/products",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const supplierId = req.query.supplierId
      ? parseInt(String(req.query.supplierId), 10)
      : null;

    const q = db
      .select({
        id: marketplaceProductsTable.id,
        supplierId: marketplaceProductsTable.supplierId,
        supplierName: marketplaceSuppliersTable.name,
        sku: marketplaceProductsTable.sku,
        name: marketplaceProductsTable.name,
        category: marketplaceProductsTable.category,
        unit: marketplaceProductsTable.unit,
        unitPrice: marketplaceProductsTable.unitPrice,
        currency: marketplaceProductsTable.currency,
        description: marketplaceProductsTable.description,
        imageUrl: marketplaceProductsTable.imageUrl,
        minOrderQty: marketplaceProductsTable.minOrderQty,
        stockAvailable: marketplaceProductsTable.stockAvailable,
        isActive: marketplaceProductsTable.isActive,
        sortOrder: marketplaceProductsTable.sortOrder,
        lastImportId: marketplaceProductsTable.lastImportId,
        createdAt: marketplaceProductsTable.createdAt,
        updatedAt: marketplaceProductsTable.updatedAt,
      })
      .from(marketplaceProductsTable)
      .leftJoin(
        marketplaceSuppliersTable,
        eq(marketplaceProductsTable.supplierId, marketplaceSuppliersTable.id),
      )
      .orderBy(marketplaceProductsTable.sortOrder, marketplaceProductsTable.name);

    const products = supplierId
      ? await q.where(eq(marketplaceProductsTable.supplierId, supplierId))
      : await q;

    res.json(products);
  },
);

router.post(
  "/platform-admin/marketplace/products",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = req.body;
    if (!body.name?.trim()) {
      res.status(400).json({ error: "Укажите название" });
      return;
    }
    const [row] = await db
      .insert(marketplaceProductsTable)
      .values({
        supplierId: body.supplierId ? parseInt(String(body.supplierId), 10) : null,
        sku: body.sku ? String(body.sku).trim() : null,
        name: String(body.name).trim(),
        category: body.category || "materials",
        unit: body.unit || "шт",
        unitPrice: String(body.unitPrice ?? "0"),
        currency: body.currency || "KGS",
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        minOrderQty: body.minOrderQty != null ? String(body.minOrderQty) : "1",
        stockAvailable: body.stockAvailable != null ? String(body.stockAvailable) : null,
        isActive: body.isActive !== false,
        sortOrder: body.sortOrder != null ? parseInt(String(body.sortOrder), 10) : 0,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/platform-admin/marketplace/products/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const body = req.body;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.supplierId !== undefined) {
      patch.supplierId = body.supplierId ? parseInt(String(body.supplierId), 10) : null;
    }
    if (body.sku !== undefined) patch.sku = body.sku ? String(body.sku).trim() : null;
    if (body.name != null) patch.name = String(body.name).trim();
    if (body.category != null) patch.category = body.category;
    if (body.unit != null) patch.unit = body.unit;
    if (body.unitPrice != null) patch.unitPrice = String(body.unitPrice);
    if (body.currency != null) patch.currency = body.currency;
    if (body.description !== undefined) patch.description = body.description;
    if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl;
    if (body.minOrderQty != null) patch.minOrderQty = String(body.minOrderQty);
    if (body.stockAvailable !== undefined) {
      patch.stockAvailable = body.stockAvailable != null ? String(body.stockAvailable) : null;
    }
    if (body.isActive !== undefined) patch.isActive = !!body.isActive;
    if (body.sortOrder != null) patch.sortOrder = parseInt(String(body.sortOrder), 10);

    const [row] = await db
      .update(marketplaceProductsTable)
      .set(patch)
      .where(eq(marketplaceProductsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Товар не найден" });
      return;
    }
    res.json(row);
  },
);

// ── Импорт прайса Excel ────────────────────────────────────────────────────

router.get(
  "/platform-admin/marketplace/imports",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const supplierId = req.query.supplierId
      ? parseInt(String(req.query.supplierId), 10)
      : null;
    const q = db
      .select({
        id: marketplacePriceImportsTable.id,
        supplierId: marketplacePriceImportsTable.supplierId,
        supplierName: marketplaceSuppliersTable.name,
        fileName: marketplacePriceImportsTable.fileName,
        status: marketplacePriceImportsTable.status,
        stats: marketplacePriceImportsTable.stats,
        createdAt: marketplacePriceImportsTable.createdAt,
      })
      .from(marketplacePriceImportsTable)
      .innerJoin(
        marketplaceSuppliersTable,
        eq(marketplacePriceImportsTable.supplierId, marketplaceSuppliersTable.id),
      )
      .orderBy(desc(marketplacePriceImportsTable.createdAt))
      .limit(50);
    const rows = supplierId
      ? await q.where(eq(marketplacePriceImportsTable.supplierId, supplierId))
      : await q;
    res.json(rows);
  },
);

router.post(
  "/platform-admin/marketplace/imports/parse",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = req.body ?? {};
    const supplierId = parseInt(String(body.supplierId), 10);
    const fileName = body.fileName ? String(body.fileName) : "price-list.xlsx";
    if (!supplierId) {
      res.status(400).json({ error: "Выберите поставщика" });
      return;
    }
    const [supplier] = await db
      .select()
      .from(marketplaceSuppliersTable)
      .where(eq(marketplaceSuppliersTable.id, supplierId));
    if (!supplier) {
      res.status(404).json({ error: "Поставщик не найден" });
      return;
    }

    try {
      const { import: imp, stats, rows } = await parseMarketplacePriceImport({
        supplierId,
        fileName,
        base64: String(body.base64 || ""),
        createdBy: req.userId ?? null,
      });
      res.status(201).json({
        import: imp,
        stats,
        preview: rows.slice(0, 200),
        previewTruncated: rows.length > 200,
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "EMPTY_FILE") {
        res.status(400).json({ error: "Пустой файл" });
        return;
      }
      if (code === "FILE_TOO_LARGE") {
        res.status(400).json({ error: "Файл больше 8 МБ" });
        return;
      }
      res.status(400).json({
        error: "Не удалось прочитать Excel",
        details: e instanceof Error ? e.message : String(e),
      });
    }
  },
);

router.get(
  "/platform-admin/marketplace/imports/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [imp] = await db
      .select()
      .from(marketplacePriceImportsTable)
      .where(eq(marketplacePriceImportsTable.id, id));
    if (!imp) {
      res.status(404).json({ error: "Импорт не найден" });
      return;
    }
    const rows: ParsedPriceRow[] = imp.rowsPreview ? JSON.parse(imp.rowsPreview) : [];
    res.json({
      import: {
        id: imp.id,
        supplierId: imp.supplierId,
        fileName: imp.fileName,
        status: imp.status,
        stats: imp.stats ? JSON.parse(imp.stats) : null,
        createdAt: imp.createdAt,
      },
      rows,
    });
  },
);

router.post(
  "/platform-admin/marketplace/imports/:id/commit",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const deactivateMissing = req.body?.deactivateMissing !== false;

    const [imp] = await db
      .select()
      .from(marketplacePriceImportsTable)
      .where(eq(marketplacePriceImportsTable.id, id));
    if (!imp) {
      res.status(404).json({ error: "Импорт не найден" });
      return;
    }

    try {
      const result = await commitMarketplacePriceImport({
        importId: id,
        supplierId: imp.supplierId,
        deactivateMissing,
      });
      res.json({ ...result, deactivatedMissing: deactivateMissing });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "ALREADY_COMMITTED") {
        res.status(400).json({ error: "Импорт уже применён" });
        return;
      }
      if (code === "NO_VALID_ROWS") {
        res.status(400).json({ error: "Нет валидных строк для загрузки" });
        return;
      }
      throw e;
    }
  },
);

export default router;
