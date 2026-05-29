import { Router } from "express";
import { eq, and, lt } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable, companiesTable, sessionsTable, emailVerificationsTable } from "../lib/db";
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  validatePassword,
} from "../lib/security";
import { validateBody } from "../middleware/validation";
import { sendVerificationEmail } from "../lib/email";
import {
  completePasswordReset,
  findPasswordResetUser,
  maskEmail,
} from "../lib/password-reset";
import { issueOtp, verifyOtp, normalizePhone } from "../lib/otp";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createVerificationCode(userId: number): Promise<string> {
  // Удаляем старые коды
  await db.delete(emailVerificationsTable).where(eq(emailVerificationsTable.userId, userId));
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
  await db.insert(emailVerificationsTable).values({ userId, code, expiresAt });
  return code;
}

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const registerSchema = z.object({
  companyName: z.string().min(1).max(200),
  legalName: z.string().max(200).optional(),
  bin: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email(),
  address: z.string().max(500).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(12),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  password: z.string().min(12).optional(),
});

/**
 * Создание сессии с истечением через 7 дней
 */
async function createSession(userId: number): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

  await db.insert(sessionsTable).values({
    token,
    userId,
    expiresAt,
  });

  return token;
}

/**
 * Получение userId по токену с проверкой истечения
 */
export async function getSessionUserId(token: string): Promise<number | null> {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session) return null;

  // Проверка истечения
  if (session.expiresAt && session.expiresAt < new Date()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }

  return session.userId;
}

// POST /auth/register — создание организации + admin пользователя
router.post("/auth/register", validateBody(registerSchema), async (req, res): Promise<void> => {
  try {
    const { companyName, legalName, bin, phone, email, address, firstName, lastName, password } = req.body;

    if (!companyName || !email || !password || !firstName || !lastName) {
      res.status(400).json({ error: "Заполните все обязательные поля" });
      return;
    }

    // Валидация пароля
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: passwordValidation.error });
      return;
    }

    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existingUser) {
      res.status(409).json({ error: "Пользователь с таким email уже зарегистрирован" });
      return;
    }

    // Создаём организацию
    const [company] = await db.insert(companiesTable).values({
      name: companyName,
      legalName: legalName || null,
      bin: bin || null,
      phone: phone || null,
      email,
      address: address || null,
      isActive: true,
    }).returning();

    // Хешируем пароль с bcrypt
    const passwordHash = await hashPassword(password);

    // Создаём company_admin пользователя (владелец организации)
    const [user] = await db.insert(usersTable).values({
      companyId: company.id,
      email,
      passwordHash,
      firstName,
      lastName,
      role: "company_admin",
      isActive: true,
    }).returning();

    const token = await createSession(user.id);

    // Отправляем код подтверждения на email
    try {
      const code = await createVerificationCode(user.id);
      await sendVerificationEmail(email, code, firstName);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Не прерываем регистрацию — пользователь сможет запросить повторно
    }

    const { passwordHash: _ph, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser, company, emailVerificationSent: true });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post("/auth/login", validateBody(loginSchema), async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email и пароль обязательны" });
      return;
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        companyId: usersTable.companyId,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Неверный email или пароль" });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: "Аккаунт заблокирован. Обратитесь к администратору." });
      return;
    }

    const token = await createSession(user.id);

    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── OTP логин по телефону (для порталов) ──

// POST /auth/send-otp — выдать SMS-код для входа
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      res.status(400).json({ error: "Введите номер телефона" });
      return;
    }
    const normalized = normalizePhone(phone);
    // Проверим что пользователь с таким телефоном существует
    const [user] = await db.select({ id: usersTable.id, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.phone, normalized));
    if (!user) {
      // Не палим существование пользователя — отвечаем нейтрально
      res.json({ ok: true, message: "Если номер зарегистрирован, код отправлен" });
      return;
    }
    if (!user.isActive) {
      res.status(401).json({ error: "Аккаунт заблокирован" });
      return;
    }
    const { code, expiresAt } = await issueOtp(normalized, "login");
    // Пока нет SMS-провайдера — возвращаем код в dev/staging логи (см. otp.ts).
    // На фронт отдаём флаг devCode только если включен NODE_ENV=development.
    const payload: Record<string, unknown> = { ok: true, expiresAt };
    if (process.env.NODE_ENV !== "production") payload.devCode = code;
    res.json(payload);
  } catch (e: any) {
    if (e?.code === "THROTTLED") {
      res.status(429).json({ error: e.message });
      return;
    }
    res.status(400).json({ error: e?.message || "Ошибка отправки кода" });
  }
});

// POST /auth/verify-otp — проверить SMS-код и вернуть токен сессии
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      res.status(400).json({ error: "Введите телефон и код" });
      return;
    }
    const result = await verifyOtp(phone, code, "login");
    if (!result.ok) {
      res.status(401).json({ error: result.reason || "Неверный код" });
      return;
    }
    const normalized = normalizePhone(phone);
    const [user] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.phone, normalized));
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (!user.isActive) {
      res.status(401).json({ error: "Аккаунт заблокирован" });
      return;
    }
    const token = await createSession(user.id);
    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Ошибка проверки кода" });
  }
});

// POST /auth/verify-email — подтверждение email по 6-значному коду
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const token = authHeader.slice(7);
    const userId = await getSessionUserId(token);
    if (!userId) {
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: "Код обязателен" });
      return;
    }

    const [record] = await db
      .select()
      .from(emailVerificationsTable)
      .where(and(eq(emailVerificationsTable.userId, userId), eq(emailVerificationsTable.code, String(code))));

    if (!record) {
      res.status(400).json({ error: "Неверный код подтверждения" });
      return;
    }

    if (record.expiresAt < new Date()) {
      await db.delete(emailVerificationsTable).where(eq(emailVerificationsTable.id, record.id));
      res.status(400).json({ error: "Код истёк. Запросите новый." });
      return;
    }

    // Удаляем код — наличие записи означает "не подтверждён", отсутствие — "подтверждён"
    await db.delete(emailVerificationsTable).where(eq(emailVerificationsTable.userId, userId));

    res.json({ success: true, message: "Email успешно подтверждён" });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ error: "Ошибка подтверждения" });
  }
});

// POST /auth/resend-verification — повторная отправка кода
router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const token = authHeader.slice(7);
    const userId = await getSessionUserId(token);
    if (!userId) {
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    // Ограничение: не чаще чем раз в минуту
    const [last] = await db
      .select()
      .from(emailVerificationsTable)
      .where(eq(emailVerificationsTable.userId, userId));

    if (last && last.createdAt > new Date(Date.now() - 60 * 1000)) {
      res.status(429).json({ error: "Подождите минуту перед повторной отправкой" });
      return;
    }

    const code = await createVerificationCode(userId);
    await sendVerificationEmail(user.email, code, user.firstName);

    res.json({ success: true, message: "Код отправлен на " + user.email });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Ошибка отправки" });
  }
});

// GET /auth/password-reset/validate?token=...
router.get("/auth/password-reset/validate", async (req, res): Promise<void> => {
  try {
    const token = String(req.query.token || "");
    if (!token) {
      res.status(400).json({ error: "Токен обязателен" });
      return;
    }
    const user = await findPasswordResetUser(token);
    if (!user) {
      res.status(400).json({ error: "Ссылка недействительна или истекла" });
      return;
    }
    res.json({ valid: true, email: maskEmail(user.email) });
  } catch (error) {
    console.error("Validate password reset error:", error);
    res.status(500).json({ error: "Ошибка проверки ссылки" });
  }
});

// POST /auth/password-reset — установка нового пароля по токену
router.post("/auth/password-reset", async (req, res): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: "Токен и новый пароль обязательны" });
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: passwordValidation.error });
      return;
    }
    const ok = await completePasswordReset(String(token), String(password));
    if (!ok) {
      res.status(400).json({ error: "Ссылка недействительна или истекла" });
      return;
    }
    res.json({ success: true, message: "Пароль обновлён. Теперь можно войти." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Не удалось сменить пароль" });
  }
});

// POST /auth/logout
router.post("/auth/logout", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ message: "Logged out" });
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const token = authHeader.slice(7);
    const userId = await getSessionUserId(token);

    if (!userId) {
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    let company = null;
    if (user.companyId) {
      const [comp] = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId));
      company = comp || null;
    }

    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ ...safeUser, company });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PATCH /auth/me — обновление собственного профиля
router.patch("/auth/me", validateBody(updateProfileSchema), async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const token = authHeader.slice(7);
    const userId = await getSessionUserId(token);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { firstName, lastName, password } = req.body;
    const updates: Record<string, unknown> = {};

    if (firstName !== undefined) {
      if (!firstName.trim()) {
        res.status(400).json({ error: "Имя не может быть пустым" });
        return;
      }
      updates.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (!lastName.trim()) {
        res.status(400).json({ error: "Фамилия не может быть пустой" });
        return;
      }
      updates.lastName = lastName.trim();
    }

    if (password !== undefined) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        res.status(400).json({ error: passwordValidation.error });
        return;
      }
      updates.passwordHash = await hashPassword(password);
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Нет данных для обновления" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    const { passwordHash: _ph, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
