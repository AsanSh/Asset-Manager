import { Router } from "express";
import { eq, and, ne, SQL } from "drizzle-orm";
import { db, usersTable } from "../lib/db";
import { hashPassword, validatePassword } from "../lib/security";
import { initiatePasswordReset } from "../lib/password-reset";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

// GET /users — список сотрудников своей организации (без super_admin)
router.get("/users", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const conditions: SQL[] = [ne(usersTable.role, "super_admin")];
  if (req.companyId) conditions.push(eq(usersTable.companyId, req.companyId));
  const users = await db.select().from(usersTable)
    .where(and(...conditions))
    .orderBy(usersTable.createdAt);
  const safe = users.map(({ passwordHash: _ph, ...u }) => u);
  res.json(safe);
});

// POST /users — добавить сотрудника в свою организацию
router.post("/users", requireAuth, requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { email, password, firstName, lastName, role } = req.body;
  if (!email || !password || !firstName || !lastName || !role) {
    res.status(400).json({ error: "Заполните все обязательные поля" });
    return;
  }
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    res.status(400).json({ error: passwordValidation.error });
    return;
  }

  if (role === "super_admin") {
    res.status(403).json({
      error: "Роль супер-администратора недоступна. Используйте админ-панель платформы.",
    });
    return;
  }

  const superRoles = ["admin"];
  if (req.userRole === "company_admin" && superRoles.includes(role)) {
    res.status(403).json({ error: "Недостаточно прав для назначения данной роли" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Пользователь с таким email уже существует" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash: await hashPassword(password),
    firstName,
    lastName,
    role,
    companyId: req.companyId,
    isActive: true,
  }).returning();
  const { passwordHash: _ph, ...safe } = user;
  res.status(201).json(safe);
});

// GET /users/:id
router.get("/users/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(usersTable.id, id)];
  if (req.companyId) conditions.push(eq(usersTable.companyId, req.companyId));
  const [user] = await db.select().from(usersTable).where(and(...conditions));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

// PATCH /users/:id
router.patch("/users/:id", requireAuth, requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { firstName, lastName, role, isActive } = req.body;

  if (role === "super_admin") {
    res.status(403).json({
      error: "Роль супер-администратора недоступна для назначения",
    });
    return;
  }

  const superRoles = ["admin"];
  if (req.userRole === "company_admin" && role && superRoles.includes(role)) {
    res.status(403).json({ error: "Недостаточно прав для назначения данной роли" });
    return;
  }

  const conditions: SQL[] = [eq(usersTable.id, id)];
  if (req.companyId) conditions.push(eq(usersTable.companyId, req.companyId));
  const [user] = await db.update(usersTable)
    .set({ firstName, lastName, role, isActive })
    .where(and(...conditions)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

// PATCH /users/:id/password — смена пароля сотрудника
router.patch("/users/:id/password", requireAuth, requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
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

  const conditions: SQL[] = [eq(usersTable.id, id)];
  if (req.companyId) conditions.push(eq(usersTable.companyId, req.companyId));
  const [user] = await db.update(usersTable)
    .set({ passwordHash: await hashPassword(password) })
    .where(and(...conditions)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

// POST /users/:id/send-password-reset — письмо со ссылкой на сброс
router.post(
  "/users/:id/send-password-reset",
  requireAuth,
  requireRole("admin", "company_admin"),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    const conditions: SQL[] = [eq(usersTable.id, id), ne(usersTable.role, "super_admin")];
    if (req.companyId) conditions.push(eq(usersTable.companyId, req.companyId));

    const [target] = await db.select().from(usersTable).where(and(...conditions));
    if (!target) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    try {
      const result = await initiatePasswordReset(target.id);
      res.json({
        success: true,
        message: result.emailSent
          ? `Ссылка для сброса отправлена на ${result.email}`
          : `Письмо не отправлено. Передайте ссылку вручную на ${result.email}`,
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

// DELETE /users/:id
router.delete("/users/:id", requireAuth, requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (id === req.userId) {
    res.status(400).json({ error: "Нельзя удалить свой аккаунт" });
    return;
  }
  const conditions: SQL[] = [eq(usersTable.id, id)];
  if (req.companyId) conditions.push(eq(usersTable.companyId, req.companyId));
  await db.delete(usersTable).where(and(...conditions));
  res.sendStatus(204);
});

export default router;
