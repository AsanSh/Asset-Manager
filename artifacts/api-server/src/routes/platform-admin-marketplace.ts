import { Router } from "express";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import {
  db,
  marketplaceProductsTable,
  marketplaceSuppliersTable,
  marketplacePriceImportsTable,
} from "../lib/db";
import {
  requireAuth,
  requireSuperAdmin,
  type AuthenticatedRequest,
} from "../middleware/auth";
import {
  parseMarketplacePriceXlsx,
  slugifyCategory,
  type ParsedPriceRow,
} from "../lib/marketplace-price-xlsx";

const router: ReturnType<typeof Router> = Router();

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function validRows(rows: ParsedPriceRow[]) {
  return rows.filter((r) => r.errors.length === 0 && r.name.trim());
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
    res.json(rows);
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
    const [row] = await db
      .insert(marketplaceSuppliersTable)
      .values({
        name,
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
    let base64 = String(body.base64 || "");
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

    const comma = base64.indexOf(",");
    if (comma >= 0) base64 = base64.slice(comma + 1);
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length < 8) {
      res.status(400).json({ error: "Пустой файл" });
      return;
    }
    if (buffer.length > MAX_FILE_BYTES) {
      res.status(400).json({ error: "Файл больше 8 МБ" });
      return;
    }

    let parsed;
    try {
      parsed = await parseMarketplacePriceXlsx(buffer);
    } catch (e) {
      res.status(400).json({
        error: "Не удалось прочитать Excel",
        details: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    const ok = validRows(parsed.rows);
    const stats = {
      total: parsed.rows.length,
      valid: ok.length,
      invalid: parsed.rows.length - ok.length,
      skippedEmpty: parsed.skippedEmpty,
      headerRow: parsed.headerRow,
    };

    const [imp] = await db
      .insert(marketplacePriceImportsTable)
      .values({
        supplierId,
        fileName,
        status: "review",
        stats: JSON.stringify(stats),
        rowsPreview: JSON.stringify(parsed.rows),
        createdBy: req.userId ?? null,
      })
      .returning();

    res.status(201).json({
      import: imp,
      stats,
      preview: parsed.rows.slice(0, 200),
      previewTruncated: parsed.rows.length > 200,
    });
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
    if (imp.status === "committed") {
      res.status(400).json({ error: "Импорт уже применён" });
      return;
    }

    const allRows: ParsedPriceRow[] = imp.rowsPreview ? JSON.parse(imp.rowsPreview) : [];
    const rows = validRows(allRows);
    if (rows.length === 0) {
      res.status(400).json({ error: "Нет валидных строк для загрузки" });
      return;
    }

    const supplierId = imp.supplierId;
    let created = 0;
    let updated = 0;
    const touchedIds: number[] = [];

    await db.transaction(async (tx) => {
      for (const row of rows) {
        const sku = row.sku?.trim() || null;
        const name = row.name.trim();
        const category = slugifyCategory(row.category);
        const unitPrice = String(Math.round(row.unitPrice * 100) / 100);

        let existing: { id: number } | undefined;
        if (sku) {
          const [bySku] = await tx
            .select({ id: marketplaceProductsTable.id })
            .from(marketplaceProductsTable)
            .where(
              and(
                eq(marketplaceProductsTable.supplierId, supplierId),
                sql`lower(trim(${marketplaceProductsTable.sku})) = ${sku.toLowerCase()}`,
              ),
            )
            .limit(1);
          existing = bySku;
        }
        if (!existing) {
          const [byName] = await tx
            .select({ id: marketplaceProductsTable.id })
            .from(marketplaceProductsTable)
            .where(
              and(
                eq(marketplaceProductsTable.supplierId, supplierId),
                sql`lower(trim(${marketplaceProductsTable.name})) = ${name.toLowerCase()}`,
              ),
            )
            .limit(1);
          existing = byName;
        }

        if (existing) {
          const [u] = await tx
            .update(marketplaceProductsTable)
            .set({
              name,
              sku,
              category,
              unit: row.unit,
              unitPrice,
              description: row.description,
              isActive: true,
              lastImportId: id,
              updatedAt: new Date(),
            })
            .where(eq(marketplaceProductsTable.id, existing.id))
            .returning({ id: marketplaceProductsTable.id });
          if (u) {
            updated++;
            touchedIds.push(u.id);
          }
        } else {
          const [ins] = await tx
            .insert(marketplaceProductsTable)
            .values({
              supplierId,
              sku,
              name,
              category,
              unit: row.unit,
              unitPrice,
              currency: "KGS",
              description: row.description,
              isActive: true,
              lastImportId: id,
            })
            .returning({ id: marketplaceProductsTable.id });
          if (ins) {
            created++;
            touchedIds.push(ins.id);
          }
        }
      }

      if (deactivateMissing && touchedIds.length > 0) {
        await tx
          .update(marketplaceProductsTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(marketplaceProductsTable.supplierId, supplierId),
              notInArray(marketplaceProductsTable.id, touchedIds),
            ),
          );
      }

      await tx
        .update(marketplacePriceImportsTable)
        .set({
          status: "committed",
          stats: JSON.stringify({
            ...(imp.stats ? JSON.parse(imp.stats) : {}),
            created,
            updated,
            committed: rows.length,
          }),
          rowsPreview: null,
          updatedAt: new Date(),
        })
        .where(eq(marketplacePriceImportsTable.id, id));
    });

    res.json({ created, updated, total: rows.length, deactivatedMissing: deactivateMissing });
  },
);

export default router;
