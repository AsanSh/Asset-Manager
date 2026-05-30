/**
 * Audit logger: запись изменений в activity_log с diff'ом до/после.
 *
 * Использование:
 *   await auditLog({
 *     companyId: req.scopedCompanyId!,
 *     userId: req.userId!,
 *     module: "construction",
 *     entityType: "task",
 *     entityId: taskId,
 *     actionType: "update",
 *     description: `Изменена задача ${task.title}`,
 *     before: oldTask,
 *     after: newTask,
 *   });
 */

import { db, activityLogTable } from "./db";
import { logger } from "./logger";

export interface AuditLogInput {
  companyId: number;
  userId?: number | null;
  module: string;        // construction | rental | crm | warehouse | finance | portal
  entityType: string;    // task | contract | payment | unit | …
  entityId?: number | null;
  actionType: "create" | "update" | "delete" | "cancel" | "approve" | "reject";
  description: string;
  before?: unknown;      // до изменения (для update / delete)
  after?: unknown;       // после изменения (для create / update)
}

/**
 * Записать запись аудита. Не бросает — fire-and-forget с логом.
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    const changedFields = input.before && input.after
      ? computeChangedFields(input.before, input.after)
      : null;

    await db.insert(activityLogTable).values({
      companyId: input.companyId,
      userId: input.userId ?? null,
      type: input.actionType,
      actionType: input.actionType,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description,
      beforeData: input.before ? safeJson(input.before) : null,
      afterData: input.after ? safeJson(input.after) : null,
      changedFields: changedFields ? safeJson(changedFields) : null,
    });
  } catch (e) {
    logger.warn({ err: (e as Error).message, module: input.module, entityType: input.entityType },
      "Audit log write failed (non-blocking)");
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, replacer, 2);
  } catch {
    return String(value);
  }
}

// Скрыть чувствительные поля
const REDACTED_KEYS = new Set(["password", "passwordHash", "password_hash", "token", "code"]);
function replacer(key: string, value: unknown): unknown {
  if (REDACTED_KEYS.has(key)) return "[REDACTED]";
  return value;
}

/**
 * Сравнить два объекта и вернуть список изменённых полей с before/after.
 */
function computeChangedFields(
  before: any,
  after: any,
): Array<{ field: string; before: unknown; after: unknown }> | null {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return null;
  const changes: Array<{ field: string; before: unknown; after: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (REDACTED_KEYS.has(key)) continue;
    const b = before[key];
    const a = after[key];
    if (b === undefined && a === undefined) continue;
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes.push({ field: key, before: b, after: a });
    }
  }
  return changes.length > 0 ? changes : null;
}
