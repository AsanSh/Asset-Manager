import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db, passwordResetTokensTable, usersTable } from "./db";
import { generateSecureToken, hashPassword } from "./security";
import { sendPasswordResetEmail } from "./email";
import { logger } from "./logger";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 час

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  await db
    .delete(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.userId, userId));

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.insert(passwordResetTokensTable).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return token;
}

export async function findPasswordResetUser(
  token: string,
): Promise<{ userId: number; email: string; firstName: string } | null> {
  const tokenHash = hashToken(token);
  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.tokenHash, tokenHash));

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await db
        .delete(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.id, record.id));
    }
    return null;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, record.userId));

  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
  };
}

export async function completePasswordReset(
  token: string,
  password: string,
): Promise<boolean> {
  const tokenHash = hashToken(token);
  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.tokenHash, tokenHash));

  if (!record || record.expiresAt < new Date()) {
    return false;
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, record.userId));

  await db
    .delete(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.userId, record.userId));

  return true;
}

/** Маскирует email для UI: a***@example.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function getFrontendBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    "https://proptech-sigma-eight.vercel.app";
  return raw.replace(/\/+$/, "");
}

export function buildPasswordResetLink(token: string): string {
  return `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

/** Создаёт токен, отправляет письмо, возвращает ссылку для админа */
export async function initiatePasswordReset(userId: number): Promise<{
  resetLink: string;
  emailSent: boolean;
  email: string;
}> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  if (!user.isActive) {
    throw new Error("USER_INACTIVE");
  }
  if (user.role === "super_admin") {
    throw new Error("SUPER_ADMIN");
  }

  const token = await createPasswordResetToken(userId);
  const resetLink = buildPasswordResetLink(token);

  let emailSent = false;
  try {
    await sendPasswordResetEmail(user.email, user.firstName, resetLink);
    emailSent = true;
  } catch (err) {
    logger.error({ err, userId, email: user.email }, "Password reset email failed");
  }

  return { resetLink, emailSent, email: user.email };
}
