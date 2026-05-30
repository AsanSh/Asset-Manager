import { Router } from "express";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db, companiesTable, usersTable, marketplaceProductsTable, marketplaceOrdersTable } from "../lib/db";
import {
  requireAuth,
  requireSuperAdmin,
  AuthenticatedRequest,
} from "../middleware/auth";
import { initiatePasswordReset } from "../lib/password-reset";
import { hashPassword, validatePassword } from "../lib/security";

const router: ReturnType<typeof Router> = Router();

// GET /platform-admin/dashboard — сводка по платформе
router.get(
  "/platform-admin/dashboard",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const [{ total: companiesTotal }] = await db
      .select({ total: count() })
      .from(companiesTable);
    const [{ total: companiesActive }] = await db
      .select({ total: count() })
      .from(companiesTable)
      .where(eq(companiesTable.isActive, true));
    const [{ total: usersTotal }] = await db
      .select({ total: count() })
      .from(usersTable)
      .where(ne(usersTable.role, "super_admin"));

    const recentCompanies = await db
      .select()
      .from(companiesTable)
      .orderBy(desc(companiesTable.createdAt))
      .limit(10);

    const companiesWithUsers = await db
      .select({
        companyId: usersTable.companyId,
        usersCount: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(ne(usersTable.role, "super_admin"))
      .groupBy(usersTable.companyId);

    const avgUsersPerCompany =
      companiesTotal > 0
        ? Math.round((Number(usersTotal) / Number(companiesTotal)) * 10) / 10
        : 0;

    res.json({
      stats: {
        companiesTotal: Number(companiesTotal),
        companiesActive: Number(companiesActive),
        companiesInactive: Number(companiesTotal) - Number(companiesActive),
        usersTotal: Number(usersTotal),
        avgUsersPerCompany,
      },
      recentCompanies,
      topCompaniesByUsers: companiesWithUsers
        .filter((r) => r.companyId != null)
        .sort((a, b) => b.usersCount - a.usersCount)
        .slice(0, 5),
    });
  }
);

// GET /platform-admin/companies — все зарегистрированные компании
router.get(
  "/platform-admin/companies",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const companies = await db
      .select()
      .from(companiesTable)
      .orderBy(desc(companiesTable.createdAt));

    const userCounts = await db
      .select({
        companyId: usersTable.companyId,
        usersCount: count(),
      })
      .from(usersTable)
      .where(ne(usersTable.role, "super_admin"))
      .groupBy(usersTable.companyId);

    const countByCompany = new Map(
      userCounts
        .filter((r) => r.companyId != null)
        .map((r) => [r.companyId!, Number(r.usersCount)])
    );

    res.json(
      companies.map((c) => ({
        ...c,
        usersCount: countByCompany.get(c.id) ?? 0,
      }))
    );
  }
);

// GET /platform-admin/companies/:id
router.get(
  "/platform-admin/companies/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, id));
    if (!company) {
      res.status(404).json({ error: "Компания не найдена" });
      return;
    }

    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(
        and(eq(usersTable.companyId, id), ne(usersTable.role, "super_admin"))
      )
      .orderBy(usersTable.createdAt);

    res.json({ company, users });
  }
);

// PATCH /platform-admin/companies/:id
router.patch(
  "/platform-admin/companies/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const { name, legalName, bin, phone, email, address, isActive } = req.body;

    const [company] = await db
      .update(companiesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(bin !== undefined && { bin }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(companiesTable.id, id))
      .returning();

    if (!company) {
      res.status(404).json({ error: "Компания не найдена" });
      return;
    }
    res.json(company);
  }
);

// PATCH /platform-admin/users/:id — блокировка / роль (кроме super_admin)
router.patch(
  "/platform-admin/users/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const { isActive, role } = req.body;

    if (role === "super_admin") {
      res.status(403).json({
        error: "Роль супер-администратора назначается только через систему",
      });
      return;
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (existing.role === "super_admin") {
      res.status(403).json({ error: "Нельзя изменять учётную запись платформы" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set({
        ...(isActive !== undefined && { isActive }),
        ...(role !== undefined && { role }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();

    const { passwordHash: _ph, ...safe } = user;
    res.json(safe);
  }
);

// PATCH /platform-admin/users/:id/password — задать пароль (платформа)
router.patch(
  "/platform-admin/users/:id/password",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Пароль обязателен" });
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: passwordValidation.error });
      return;
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (existing.role === "super_admin") {
      res.status(403).json({ error: "Нельзя менять пароль супер-администратора" });
      return;
    }

    await db
      .update(usersTable)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(usersTable.id, id));

    res.json({ success: true });
  },
);

// POST /platform-admin/users/:id/send-password-reset
router.post(
  "/platform-admin/users/:id/send-password-reset",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (existing.role === "super_admin") {
      res.status(403).json({ error: "Нельзя сбрасывать пароль супер-администратора" });
      return;
    }

    try {
      const result = await initiatePasswordReset(existing.id);
      res.json({
        success: true,
        message: result.emailSent
          ? `Ссылка отправлена на ${result.email}`
          : `Передайте ссылку вручную: ${result.email}`,
        emailSent: result.emailSent,
        resetLink: result.resetLink,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "USER_INACTIVE") {
        res.status(400).json({ error: "Пользователь заблокирован" });
        return;
      }
      res.status(500).json({ error: "Не удалось создать ссылку для сброса" });
    }
  },
);

// ── Маркетплейс материалов (каталог платформы) ───────────────────────────────

router.get(
  "/platform-admin/marketplace/products",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const products = await db
      .select()
      .from(marketplaceProductsTable)
      .orderBy(marketplaceProductsTable.sortOrder, marketplaceProductsTable.name);
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

router.get(
  "/platform-admin/marketplace/orders",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const orders = await db
      .select({
        id: marketplaceOrdersTable.id,
        companyId: marketplaceOrdersTable.companyId,
        companyName: companiesTable.name,
        productId: marketplaceOrdersTable.productId,
        productName: marketplaceProductsTable.name,
        quantity: marketplaceOrdersTable.quantity,
        totalAmount: marketplaceOrdersTable.totalAmount,
        currency: marketplaceOrdersTable.currency,
        projectId: marketplaceOrdersTable.projectId,
        status: marketplaceOrdersTable.status,
        notes: marketplaceOrdersTable.notes,
        createdAt: marketplaceOrdersTable.createdAt,
      })
      .from(marketplaceOrdersTable)
      .leftJoin(companiesTable, eq(marketplaceOrdersTable.companyId, companiesTable.id))
      .leftJoin(
        marketplaceProductsTable,
        eq(marketplaceOrdersTable.productId, marketplaceProductsTable.id),
      )
      .orderBy(desc(marketplaceOrdersTable.createdAt));
    res.json(orders);
  },
);

router.patch(
  "/platform-admin/marketplace/orders/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "shipped", "fulfilled", "cancelled"];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: "Недопустимый статус" });
      return;
    }
    const [row] = await db
      .update(marketplaceOrdersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(marketplaceOrdersTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Заявка не найдена" });
      return;
    }
    res.json(row);
  },
);

export default router;
