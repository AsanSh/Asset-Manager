import { Router } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  marketplaceProductsTable,
  marketplaceSuppliersTable,
  marketplaceOrdersTable,
  constructionProjectsTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

const productListSelect = {
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
  minOrderQty: marketplaceProductsTable.minOrderQty,
  stockAvailable: marketplaceProductsTable.stockAvailable,
  isActive: marketplaceProductsTable.isActive,
  sortOrder: marketplaceProductsTable.sortOrder,
};

function parseSupplierIdQuery(raw: unknown): number | null | "invalid" {
  if (raw == null || String(raw).trim() === "") return null;
  const parsed = parseInt(String(raw), 10);
  if (!Number.isFinite(parsed)) return "invalid";
  return parsed;
}

function buildProductSearchConditions(searchQ: string, supplierId: number | null) {
  const conditions = [eq(marketplaceProductsTable.isActive, true)];
  if (supplierId != null) {
    conditions.push(eq(marketplaceProductsTable.supplierId, supplierId));
  }
  if (searchQ) {
    const pattern = `%${searchQ}%`;
    conditions.push(
      or(
        ilike(marketplaceProductsTable.name, pattern),
        ilike(marketplaceProductsTable.sku, pattern),
        ilike(marketplaceProductsTable.category, pattern),
        ilike(marketplaceProductsTable.description, pattern),
        ilike(marketplaceSuppliersTable.name, pattern),
      )!,
    );
  }
  return conditions;
}

/** Каталог материалов платформы (активные позиции) + live-поиск ?q= */
router.get("/marketplace/products", async (req: AuthenticatedRequest, res): Promise<void> => {
  const supplierIdParsed = parseSupplierIdQuery(req.query.supplierId);
  if (supplierIdParsed === "invalid") {
    res.status(400).json({ error: "Некорректный supplierId" });
    return;
  }
  const supplierId = supplierIdParsed;
  const searchQ = req.query.q ? String(req.query.q).trim().slice(0, 120) : "";
  const limitRaw = parseInt(String(req.query.limit ?? "150"), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 150;

  const conditions = buildProductSearchConditions(searchQ, supplierId);

  const baseQuery = db
    .select(productListSelect)
    .from(marketplaceProductsTable)
    .leftJoin(
      marketplaceSuppliersTable,
      eq(marketplaceProductsTable.supplierId, marketplaceSuppliersTable.id),
    )
    .where(and(...conditions))
    .limit(limit);

  if (searchQ) {
    const qLower = searchQ.toLowerCase();
    const rows = await baseQuery.orderBy(
      sql`CASE
        WHEN lower(${marketplaceProductsTable.name}) = ${qLower} THEN 0
        WHEN lower(${marketplaceProductsTable.sku}) = ${qLower} THEN 1
        WHEN lower(${marketplaceProductsTable.name}) LIKE ${`${qLower}%`} THEN 2
        WHEN lower(${marketplaceProductsTable.sku}) LIKE ${`${qLower}%`} THEN 3
        ELSE 4
      END`,
      marketplaceProductsTable.sortOrder,
      marketplaceProductsTable.name,
    );
    res.json(rows);
    return;
  }

  const rows = await baseQuery.orderBy(
    marketplaceProductsTable.sortOrder,
    marketplaceProductsTable.name,
  );
  res.json(rows);
});

/** Список поставщиков для фильтра витрины */
router.get("/marketplace/suppliers", async (_req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: marketplaceSuppliersTable.id,
      name: marketplaceSuppliersTable.name,
      code: marketplaceSuppliersTable.code,
      supplierType: marketplaceSuppliersTable.supplierType,
    })
    .from(marketplaceSuppliersTable)
    .where(eq(marketplaceSuppliersTable.isActive, true))
    .orderBy(marketplaceSuppliersTable.name);
  res.json(rows);
});

/** Заявки текущей компании */
router.get("/marketplace/orders", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const orders = await db
    .select({
      id: marketplaceOrdersTable.id,
      companyId: marketplaceOrdersTable.companyId,
      productId: marketplaceOrdersTable.productId,
      productName: marketplaceProductsTable.name,
      productUnit: marketplaceProductsTable.unit,
      quantity: marketplaceOrdersTable.quantity,
      unitPriceSnapshot: marketplaceOrdersTable.unitPriceSnapshot,
      totalAmount: marketplaceOrdersTable.totalAmount,
      currency: marketplaceOrdersTable.currency,
      projectId: marketplaceOrdersTable.projectId,
      status: marketplaceOrdersTable.status,
      notes: marketplaceOrdersTable.notes,
      createdAt: marketplaceOrdersTable.createdAt,
    })
    .from(marketplaceOrdersTable)
    .leftJoin(
      marketplaceProductsTable,
      eq(marketplaceOrdersTable.productId, marketplaceProductsTable.id),
    )
    .where(eq(marketplaceOrdersTable.companyId, companyId))
    .orderBy(desc(marketplaceOrdersTable.createdAt));
  res.json(orders);
});

/** Создать заявку на покупку материала */
router.post("/marketplace/orders", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const { productId, quantity, projectId, notes } = req.body;

  const pid = parseInt(String(productId), 10);
  const qty = parseFloat(String(quantity));
  if (!pid || !qty || qty <= 0) {
    res.status(400).json({ error: "Укажите товар и количество больше нуля" });
    return;
  }

  const [product] = await db
    .select()
    .from(marketplaceProductsTable)
    .where(and(eq(marketplaceProductsTable.id, pid), eq(marketplaceProductsTable.isActive, true)));
  if (!product) {
    res.status(404).json({ error: "Товар не найден или снят с витрины" });
    return;
  }

  const minQty = parseFloat(product.minOrderQty?.toString() || "1");
  if (qty < minQty) {
    res.status(400).json({ error: `Минимальный заказ: ${minQty} ${product.unit}` });
    return;
  }

  if (product.stockAvailable != null) {
    const stock = parseFloat(product.stockAvailable.toString());
    if (qty > stock) {
      res.status(400).json({ error: `Недостаточно на складе платформы. Доступно: ${stock} ${product.unit}` });
      return;
    }
  }

  let projectIdNum: number | null = null;
  if (projectId) {
    projectIdNum = parseInt(String(projectId), 10);
    const [project] = await db
      .select({ id: constructionProjectsTable.id })
      .from(constructionProjectsTable)
      .where(and(
        eq(constructionProjectsTable.id, projectIdNum),
        eq(constructionProjectsTable.companyId, companyId),
      ));
    if (!project) {
      res.status(400).json({ error: "Проект не найден" });
      return;
    }
  }

  const unitPrice = parseFloat(product.unitPrice?.toString() || "0");
  const total = Math.round(qty * unitPrice * 100) / 100;

  const [order] = await db
    .insert(marketplaceOrdersTable)
    .values({
      companyId,
      productId: pid,
      quantity: String(qty),
      unitPriceSnapshot: String(unitPrice),
      totalAmount: String(total),
      currency: product.currency || "KGS",
      projectId: projectIdNum,
      requestedByUserId: req.userId ?? null,
      status: "pending",
      notes: notes || null,
    })
    .returning();

  res.status(201).json(order);
});

export default router;
