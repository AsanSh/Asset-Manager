import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "../lib/db";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  companyId?: number;
  userRole?: string;
}

/**
 * Middleware для проверки аутентификации
 * Проверяет Bearer токен, его истечение и статус пользователя
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);

  // Поиск сессии в БД
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  // Проверка истечения токена
  if (session.expiresAt && session.expiresAt < new Date()) {
    // Удаляем истекшую сессию
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  req.userId = user.id;
  req.companyId = user.companyId ?? undefined;
  req.userRole = user.role;

  next();
}

/**
 * Middleware для проверки роли пользователя
 * @param roles - Список допустимых ролей
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}

/** Только супер-администратор платформы (отдельный админ-дашборд) */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.userRole !== "super_admin") {
    res.status(403).json({ error: "Доступ только для администратора платформы" });
    return;
  }
  next();
}

export function isSuperAdmin(role: string | undefined): boolean {
  return role === "super_admin";
}
