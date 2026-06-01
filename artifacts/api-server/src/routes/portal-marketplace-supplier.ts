import { Router } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import {
  db,
  marketplaceProductsTable,
  marketplaceSuppliersTable,
  marketplacePriceImportsTable,
} from "../lib/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import {
  commitMarketplacePriceImport,
  getMarketplaceSupplierIdForUser,
  parseMarketplacePriceImport,
} from "../lib/marketplace-import-core";

const router: ReturnType<typeof Router> = Router();

const portalAuth = [requireAuth, requireRole("marketplace_supplier")] as const;

async function resolveSupplierId(req: AuthenticatedRequest): Promise<number | null> {
  return getMarketplaceSupplierIdForUser(req.userId!);
}

// GET /portal/marketplace-supplier/me
router.get("/portal/marketplace-supplier/me", ...portalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const supplierId = await resolveSupplierId(req);
  if (!supplierId) {
    res.status(403).json({ error: "Нет привязки к поставщику маркетплейса" });
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
  res.json({
    supplier,
    stats: {
      productsTotal: Number(total),
      productsActive: Number(active),
    },
  });
});

// GET /portal/marketplace-supplier/products
router.get("/portal/marketplace-supplier/products", ...portalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const supplierId = await resolveSupplierId(req);
  if (!supplierId) {
    res.status(403).json({ error: "Нет доступа" });
    return;
  }
  const rows = await db
    .select()
    .from(marketplaceProductsTable)
    .where(eq(marketplaceProductsTable.supplierId, supplierId))
    .orderBy(marketplaceProductsTable.name);
  res.json(rows);
});

// GET /portal/marketplace-supplier/imports
router.get("/portal/marketplace-supplier/imports", ...portalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const supplierId = await resolveSupplierId(req);
  if (!supplierId) {
    res.status(403).json({ error: "Нет доступа" });
    return;
  }
  const rows = await db
    .select()
    .from(marketplacePriceImportsTable)
    .where(eq(marketplacePriceImportsTable.supplierId, supplierId))
    .orderBy(desc(marketplacePriceImportsTable.createdAt))
    .limit(30);
  res.json(rows);
});

// POST /portal/marketplace-supplier/imports/parse
router.post("/portal/marketplace-supplier/imports/parse", ...portalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const supplierId = await resolveSupplierId(req);
  if (!supplierId) {
    res.status(403).json({ error: "Нет доступа" });
    return;
  }
  const body = req.body ?? {};
  const fileName = body.fileName ? String(body.fileName) : "price-list.xlsx";
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
});

// POST /portal/marketplace-supplier/imports/:id/commit
router.post(
  "/portal/marketplace-supplier/imports/:id/commit",
  ...portalAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const supplierId = await resolveSupplierId(req);
    if (!supplierId) {
      res.status(403).json({ error: "Нет доступа" });
      return;
    }
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const deactivateMissing = req.body?.deactivateMissing !== false;
    try {
      const result = await commitMarketplacePriceImport({
        importId: id,
        supplierId,
        deactivateMissing,
      });
      res.json(result);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "IMPORT_NOT_FOUND") {
        res.status(404).json({ error: "Импорт не найден" });
        return;
      }
      if (code === "ALREADY_COMMITTED") {
        res.status(400).json({ error: "Импорт уже применён" });
        return;
      }
      if (code === "NO_VALID_ROWS") {
        res.status(400).json({ error: "Нет валидных строк" });
        return;
      }
      throw e;
    }
  },
);

export default router;
