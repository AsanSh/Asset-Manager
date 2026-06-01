import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  supplyRequestsTable,
  supplyRequestItemsTable,
  supplyApprovalsTable,
  supplyOrdersTable,
  companySupplierCreditLimitsTable,
  globalProductsTable,
  usersTable,
} from "../lib/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();
router.use(requireAuth, requireTenantCompany);

const REQUEST_STATUSES = new Set(["pending", "approved", "rejected", "ordered", "cancelled"]);
const REQUEST_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const ORDER_STATUSES = new Set(["draft", "placed", "processing", "delivered", "closed"]);
const PAYMENT_TYPES = new Set(["prepaid", "postpaid", "installment"]);

function displayUserName(user?: { firstName: string | null; lastName: string | null } | null): string {
  if (!user) return "—";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "—";
}

// GET /supply/requests?status=pending
router.get("/supply/requests", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const filters = [eq(supplyRequestsTable.companyId, companyId)];
  if (status && REQUEST_STATUSES.has(status)) {
    filters.push(eq(supplyRequestsTable.status, status));
  }
  const rows = await db
    .select()
    .from(supplyRequestsTable)
    .where(and(...filters))
    .orderBy(desc(supplyRequestsTable.createdAt));
  res.json(rows);
});

// POST /supply/requests
router.post("/supply/requests", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body ?? {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    res.status(400).json({ error: "Добавьте хотя бы одну позицию заявки" });
    return;
  }
  const status = String(body.status || "pending");
  const priority = String(body.priority || "normal");
  if (!REQUEST_STATUSES.has(status)) {
    res.status(400).json({ error: "Некорректный статус заявки" });
    return;
  }
  if (!REQUEST_PRIORITIES.has(priority)) {
    res.status(400).json({ error: "Некорректный приоритет заявки" });
    return;
  }
  for (const item of items) {
    const hasCatalog = !!item.globalProductId || !!item.supplierProductId;
    const hasCustom = !!item.customName;
    if (!hasCatalog && !hasCustom) {
      res.status(400).json({ error: "Для каждой позиции укажите товар из каталога или customName" });
      return;
    }
  }

  const created = await db.transaction(async (tx) => {
    const [request] = await tx
      .insert(supplyRequestsTable)
      .values({
        companyId,
        projectId: body.projectId ? Number(body.projectId) : null,
        constructionStageId: body.constructionStageId ? Number(body.constructionStageId) : null,
        requestedBy: req.userId!,
        status,
        priority,
        neededByDate: body.neededByDate ? String(body.neededByDate) : null,
        notes: body.notes ? String(body.notes) : null,
      })
      .returning();

    for (const item of items) {
      await tx.insert(supplyRequestItemsTable).values({
        requestId: request.id,
        globalProductId: item.globalProductId ? Number(item.globalProductId) : null,
        supplierProductId: item.supplierProductId ? Number(item.supplierProductId) : null,
        customName: item.customName ? String(item.customName) : null,
        quantity: String(item.quantity ?? "0"),
        unit: String(item.unit || "шт"),
        notes: item.notes ? String(item.notes) : null,
      });
    }
    return request;
  });

  res.status(201).json(created);
});

// GET /supply/requests/:id
router.get("/supply/requests/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const [request] = await db
    .select()
    .from(supplyRequestsTable)
    .where(and(eq(supplyRequestsTable.id, id), eq(supplyRequestsTable.companyId, companyId)));
  if (!request) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const [items, approvals] = await Promise.all([
    db
      .select()
      .from(supplyRequestItemsTable)
      .where(eq(supplyRequestItemsTable.requestId, id))
      .orderBy(supplyRequestItemsTable.id),
    db
      .select()
      .from(supplyApprovalsTable)
      .where(eq(supplyApprovalsTable.requestId, id))
      .orderBy(desc(supplyApprovalsTable.createdAt)),
  ]);

  const productIds = items
    .map((i) => i.globalProductId)
    .filter((pid): pid is number => pid != null);
  const userIds = [
    request.requestedBy,
    ...approvals.map((a) => a.approverId),
  ].filter((uid, idx, arr) => arr.indexOf(uid) === idx);

  const [products, users] = await Promise.all([
    productIds.length
      ? db
          .select({ id: globalProductsTable.id, canonicalName: globalProductsTable.canonicalName })
          .from(globalProductsTable)
          .where(inArray(globalProductsTable.id, productIds))
      : Promise.resolve([]),
    userIds.length
      ? db
          .select({
            id: usersTable.id,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : Promise.resolve([]),
  ]);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.canonicalName]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, displayUserName(u)]));

  res.json({
    ...request,
    requestedByName: userMap[request.requestedBy] ?? "—",
    items: items.map((item) => ({
      ...item,
      productName: item.globalProductId ? productMap[item.globalProductId] ?? null : null,
    })),
    approvals: approvals.map((approval) => ({
      ...approval,
      approverName: userMap[approval.approverId] ?? "—",
    })),
  });
});

// POST /supply/requests/:id/approvals
router.post(
  "/supply/requests/:id/approvals",
  requireRole("owner", "admin", "company_admin", "finance"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);
    const status = String(req.body?.status || "pending");
    if (!["pending", "approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "status: pending | approved | rejected" });
      return;
    }
    const [request] = await db
      .select()
      .from(supplyRequestsTable)
      .where(and(eq(supplyRequestsTable.id, id), eq(supplyRequestsTable.companyId, companyId)));
    if (!request) {
      res.status(404).json({ error: "Заявка не найдена" });
      return;
    }

    const [approval] = await db
      .insert(supplyApprovalsTable)
      .values({
        requestId: id,
        approverId: req.userId!,
        status,
        comment: req.body?.comment ? String(req.body.comment) : null,
        approvedAt: status === "approved" ? new Date() : null,
      })
      .returning();

    if (status === "approved") {
      await db
        .update(supplyRequestsTable)
        .set({ status: "approved" })
        .where(eq(supplyRequestsTable.id, id));
    } else if (status === "rejected") {
      await db
        .update(supplyRequestsTable)
        .set({ status: "rejected" })
        .where(eq(supplyRequestsTable.id, id));
    }
    res.status(201).json(approval);
  },
);

// GET /supply/orders
router.get("/supply/orders", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(supplyOrdersTable)
    .where(eq(supplyOrdersTable.companyId, req.scopedCompanyId!))
    .orderBy(desc(supplyOrdersTable.createdAt));
  res.json(rows);
});

// POST /supply/orders
router.post("/supply/orders", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body ?? {};
  if (!body.supplierId) {
    res.status(400).json({ error: "Укажите supplierId" });
    return;
  }
  const status = String(body.status || "draft");
  const paymentType = String(body.paymentType || "prepaid");
  if (!ORDER_STATUSES.has(status)) {
    res.status(400).json({ error: "Некорректный статус заказа" });
    return;
  }
  if (!PAYMENT_TYPES.has(paymentType)) {
    res.status(400).json({ error: "Некорректный paymentType" });
    return;
  }
  if (body.requestId) {
    const [request] = await db
      .select()
      .from(supplyRequestsTable)
      .where(
        and(
          eq(supplyRequestsTable.id, Number(body.requestId)),
          eq(supplyRequestsTable.companyId, companyId),
        ),
      );
    if (!request) {
      res.status(404).json({ error: "Заявка не найдена" });
      return;
    }
    if (!["approved", "ordered"].includes(request.status)) {
      res.status(400).json({ error: "Заказ можно создать только по одобренной заявке" });
      return;
    }
  }
  const [order] = await db
    .insert(supplyOrdersTable)
    .values({
      companyId,
      supplierId: Number(body.supplierId),
      requestId: body.requestId ? Number(body.requestId) : null,
      status,
      paymentType,
      totalAmount: String(body.totalAmount ?? "0"),
      currency: String(body.currency || "KGS"),
      notes: body.notes ? String(body.notes) : null,
      createdBy: req.userId ?? null,
    })
    .returning();

  if (order.requestId) {
    await db
      .update(supplyRequestsTable)
      .set({ status: "ordered" })
      .where(eq(supplyRequestsTable.id, order.requestId));
  }
  res.status(201).json(order);
});

// PATCH /supply/orders/:id
router.patch(
  "/supply/orders/:id",
  requireRole("owner", "admin", "company_admin", "finance"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const [order] = await db
      .select()
      .from(supplyOrdersTable)
      .where(and(eq(supplyOrdersTable.id, id), eq(supplyOrdersTable.companyId, companyId)));
    if (!order) {
      res.status(404).json({ error: "Заказ не найден" });
      return;
    }

    const nextStatus = body.status !== undefined ? String(body.status) : order.status;
    const nextPaymentType =
      body.paymentType !== undefined ? String(body.paymentType) : order.paymentType;
    if (!ORDER_STATUSES.has(nextStatus)) {
      res.status(400).json({ error: "Некорректный статус заказа" });
      return;
    }
    if (!PAYMENT_TYPES.has(nextPaymentType)) {
      res.status(400).json({ error: "Некорректный paymentType" });
      return;
    }

    const [updated] = await db
      .update(supplyOrdersTable)
      .set({
        status: nextStatus,
        paymentType: nextPaymentType,
        totalAmount:
          body.totalAmount !== undefined ? String(body.totalAmount) : order.totalAmount,
        currency: body.currency !== undefined ? String(body.currency) : order.currency,
        notes: body.notes !== undefined ? String(body.notes || "") : order.notes,
      })
      .where(eq(supplyOrdersTable.id, id))
      .returning();
    res.json(updated);
  },
);

// GET /supply/credit-limits
router.get("/supply/credit-limits", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(companySupplierCreditLimitsTable)
    .where(eq(companySupplierCreditLimitsTable.companyId, req.scopedCompanyId!))
    .orderBy(desc(companySupplierCreditLimitsTable.updatedAt));
  res.json(rows);
});

// PUT /supply/credit-limits/:supplierId
router.put(
  "/supply/credit-limits/:supplierId",
  requireRole("owner", "admin", "company_admin", "finance"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const supplierId = Number(req.params.supplierId);
    const body = req.body ?? {};

    const [existing] = await db
      .select()
      .from(companySupplierCreditLimitsTable)
      .where(
        and(
          eq(companySupplierCreditLimitsTable.companyId, companyId),
          eq(companySupplierCreditLimitsTable.supplierId, supplierId),
        ),
      );

    if (existing) {
      const [updated] = await db
        .update(companySupplierCreditLimitsTable)
        .set({
          limitAmount: String(body.limitAmount ?? existing.limitAmount ?? "0"),
          usedAmount: String(body.usedAmount ?? existing.usedAmount ?? "0"),
          termDays: Number(body.termDays ?? existing.termDays ?? 0),
          markupPercent: String(body.markupPercent ?? existing.markupPercent ?? "0"),
          status: String(body.status ?? existing.status ?? "active"),
        })
        .where(eq(companySupplierCreditLimitsTable.id, existing.id))
        .returning();
      res.json(updated);
      return;
    }

    const [created] = await db
      .insert(companySupplierCreditLimitsTable)
      .values({
        companyId,
        supplierId,
        limitAmount: String(body.limitAmount ?? "0"),
        usedAmount: String(body.usedAmount ?? "0"),
        termDays: Number(body.termDays ?? 0),
        markupPercent: String(body.markupPercent ?? "0"),
        status: String(body.status ?? "active"),
      })
      .returning();
    res.status(201).json(created);
  },
);

export default router;
