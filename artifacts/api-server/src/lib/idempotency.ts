import { and, eq, gt } from "drizzle-orm";
import { db, idempotencyKeysTable } from "./db";

/**
 * Проверить и записать idempotency-key.
 * Возвращает существующий ответ если ключ уже использовался — иначе null.
 *
 * Usage:
 *   const cached = await checkIdempotencyKey(key, companyId, route);
 *   if (cached) return res.status(cached.responseStatus).json(JSON.parse(cached.responseBody));
 *   ... do work ...
 *   await saveIdempotencyResult(key, companyId, userId, route, 201, result);
 */
export async function checkIdempotencyKey(
  key: string,
  companyId: number,
  route: string,
): Promise<{ status: number; body: string } | null> {
  if (!key) return null;
  const [row] = await db.select()
    .from(idempotencyKeysTable)
    .where(and(
      eq(idempotencyKeysTable.key, key),
      eq(idempotencyKeysTable.companyId, companyId),
      eq(idempotencyKeysTable.route, route),
      gt(idempotencyKeysTable.expiresAt, new Date()),
    ));
  if (!row || row.responseStatus == null || row.responseBody == null) return null;
  return { status: row.responseStatus, body: row.responseBody };
}

export async function saveIdempotencyResult(
  key: string,
  companyId: number,
  userId: number | null,
  route: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> {
  if (!key) return;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);
  await db.insert(idempotencyKeysTable).values({
    key,
    companyId,
    userId,
    route,
    responseStatus,
    responseBody: typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody),
    expiresAt,
  }).onConflictDoNothing();
}
