import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  marketplaceProductsTable,
  marketplaceOrdersTable,
  constructionProjectsTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

/** Каталог материалов платформы (активные позиции) */
router.get("/marketplace/products", async (_req: AuthenticatedRequest, res): Promise<void> => {
  const products = await db
    .select()
    .from(marketplaceProductsTable)
    .where(eq(marketplaceProductsTable.isActive, true))
    .orderBy(marketplaceProductsTable.sortOrder, marketplaceProductsTable.name);
  res.json(products);
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
