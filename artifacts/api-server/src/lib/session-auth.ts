import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db, sessionsTable, type Session } from "./db";
import { generateSecureToken } from "./security";

/** SHA-256 hex — в БД хранится только хеш, клиенту отдаётся plain token. */
export function hashSessionToken(plainToken: string): string {
  return createHash("sha256").update(plainToken, "utf8").digest("hex");
}

function isSessionExpired(session: Session): boolean {
  return session.expiresAt != null && session.expiresAt < new Date();
}

async function deleteSessionByStoredToken(storedToken: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, storedToken));
}

/**
 * Находит сессию по Bearer-токену. Новые сессии — lookup по хешу;
 * legacy plain token в PK мигрируется на хеш при успешной авторизации.
 */
export async function resolveSession(bearerToken: string): Promise<Session | null> {
  if (!bearerToken) return null;

  const hashed = hashSessionToken(bearerToken);

  const [hashedRow] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, hashed));

  if (hashedRow) {
    if (isSessionExpired(hashedRow)) {
      await deleteSessionByStoredToken(hashed);
      return null;
    }
    return hashedRow;
  }

  const [legacyRow] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, bearerToken));

  if (!legacyRow) return null;

  if (isSessionExpired(legacyRow)) {
    await deleteSessionByStoredToken(bearerToken);
    return null;
  }

  await deleteSessionByStoredToken(bearerToken);
  await db.insert(sessionsTable).values({
    token: hashed,
    userId: legacyRow.userId,
    createdAt: legacyRow.createdAt,
    expiresAt: legacyRow.expiresAt,
  });

  return { ...legacyRow, token: hashed };
}

/** Создаёт сессию (7 дней), в БД — только хеш токена. */
export async function createSession(userId: number): Promise<string> {
  const plainToken = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(sessionsTable).values({
    token: hashSessionToken(plainToken),
    userId,
    expiresAt,
  });

  return plainToken;
}

export async function deleteSessionByBearerToken(bearerToken: string): Promise<void> {
  if (!bearerToken) return;
  const hashed = hashSessionToken(bearerToken);
  await deleteSessionByStoredToken(hashed);
  await deleteSessionByStoredToken(bearerToken);
}

export async function getSessionUserId(bearerToken: string): Promise<number | null> {
  const session = await resolveSession(bearerToken);
  return session?.userId ?? null;
}
