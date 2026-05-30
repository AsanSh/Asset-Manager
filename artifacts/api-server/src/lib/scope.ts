/**
 * Scope-helper: централизованная фильтрация по company_id.
 *
 * Использование:
 *   import { scoped } from "../lib/scope";
 *   const rows = await db.select().from(tasks)
 *     .where(and(scoped(req, tasks), eq(tasks.id, id)));
 *
 * Защищает от cross-tenant leak: невозможно случайно отдать данные
 * другой компании, если используется этот helper во всех WHERE.
 */
import { eq, SQL } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middleware/auth";

interface TableWithCompanyId {
  companyId: { name: string };
}

/**
 * Возвращает SQL-условие eq(table.companyId, req.scopedCompanyId).
 * Бросает ошибку если scopedCompanyId не установлен (защита от misuse).
 */
export function scoped<T extends TableWithCompanyId>(
  req: AuthenticatedRequest,
  table: T,
): SQL {
  const cid = req.scopedCompanyId;
  if (cid === undefined || cid === null) {
    throw new Error(
      "scoped(): req.scopedCompanyId not set — missing requireTenantCompany middleware?",
    );
  }
  // @ts-expect-error — TS не знает что table.companyId это PgColumn, но это так
  return eq(table.companyId, cid);
}

/**
 * Возвращает companyId или бросает ошибку. Удобно для INSERT.values({ companyId: scopedCompanyId(req), ... }).
 */
export function scopedCompanyId(req: AuthenticatedRequest): number {
  const cid = req.scopedCompanyId;
  if (cid === undefined || cid === null) {
    throw new Error("scopedCompanyId(): not set");
  }
  return cid;
}
