import { eq, and, sql } from "drizzle-orm";
import { db, counterpartiesTable } from "./db";

/**
 * Найти или создать контрагента и убедиться что у него есть указанная роль.
 * Используется при создании специализированной записи (подрядчик, поставщик, арендатор).
 *
 * @returns id записи в counterparties
 */
export async function ensureCounterpartyWithRole(params: {
  companyId: number;
  role: string;
  fullName: string;
  type?: "individual" | "company";
  iin?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  existingId?: number | null;
}): Promise<number> {
  const { companyId, role, fullName, type = "company", iin, phone, email, address, existingId } = params;

  // Если existingId передан явно — добавляем роль и используем
  if (existingId) {
    const [existing] = await db.select().from(counterpartiesTable)
      .where(and(eq(counterpartiesTable.id, existingId), eq(counterpartiesTable.companyId, companyId)));
    if (existing) {
      const cats = Array.isArray(existing.categories) ? existing.categories : [];
      if (!cats.includes(role)) {
        await db.update(counterpartiesTable)
          .set({ categories: [...cats, role] })
          .where(eq(counterpartiesTable.id, existing.id));
      }
      return existing.id;
    }
  }

  // Иначе ищем по fullName + iin (или просто по fullName)
  const conditions = [eq(counterpartiesTable.companyId, companyId), eq(counterpartiesTable.fullName, fullName)];
  if (iin) {
    conditions.push(eq(counterpartiesTable.iin, iin));
  }
  const [matched] = await db.select().from(counterpartiesTable).where(and(...conditions)).limit(1);

  if (matched) {
    const cats = Array.isArray(matched.categories) ? matched.categories : [];
    if (!cats.includes(role)) {
      await db.update(counterpartiesTable)
        .set({ categories: [...cats, role] })
        .where(eq(counterpartiesTable.id, matched.id));
    }
    return matched.id;
  }

  // Создаём новую запись
  const [created] = await db.insert(counterpartiesTable).values({
    companyId,
    type,
    category: role,
    categories: [role],
    fullName,
    iin: iin || null,
    phone: phone || null,
    email: email || null,
    address: address || null,
  }).returning();
  return created.id;
}

/**
 * Проверить что у контрагента есть нужная роль (для модульной валидации).
 * Например: в Контроле строительства нельзя выбрать контрагента-material_supplier.
 */
export async function counterpartyHasRole(
  companyId: number,
  counterpartyId: number,
  role: string,
): Promise<boolean> {
  const [row] = await db.select().from(counterpartiesTable)
    .where(and(eq(counterpartiesTable.id, counterpartyId), eq(counterpartiesTable.companyId, companyId)));
  if (!row) return false;
  const cats = Array.isArray(row.categories) ? row.categories : [];
  return cats.includes(role);
}

/**
 * Проверить что у контрагента есть хотя бы одна из допустимых ролей.
 */
export async function counterpartyHasAnyRole(
  companyId: number,
  counterpartyId: number,
  allowedRoles: string[],
): Promise<boolean> {
  const [row] = await db.select().from(counterpartiesTable)
    .where(and(eq(counterpartiesTable.id, counterpartyId), eq(counterpartiesTable.companyId, companyId)));
  if (!row) return false;
  const cats = Array.isArray(row.categories) ? row.categories : [];
  return cats.some((c) => allowedRoles.includes(c));
}

// Suppress unused import warning
export const _sql = sql;
