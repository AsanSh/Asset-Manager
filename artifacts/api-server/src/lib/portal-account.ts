import { eq, and } from "drizzle-orm";
import { db, usersTable } from "./db";
import { normalizePhone } from "./otp";

/** Опциональные параметры для создания портального аккаунта. */
export interface CreatePortalAccountInput {
  companyId: number;
  role: "tenant" | "buyer" | "contractor" | "supplier" | "investor";
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  /** Идентификатор связанной сущности (tenantId, buyerId, contractorId, supplierId, investorId). */
  linkedEntityKey: "linkedTenantId" | "linkedBuyerId" | "linkedContractorId" | "linkedSupplierId" | "linkedInvestorId";
  linkedEntityId: number;
}

export interface CreatePortalAccountResult {
  user: typeof usersTable.$inferSelect;
  created: boolean;
}

/** Создать (или вернуть существующего) пользователя портала с привязкой к контрагенту.
 *  Логин по OTP — пароль не нужен. Уникальность по phone (если указан) или email. */
export async function createPortalUser(input: CreatePortalAccountInput): Promise<CreatePortalAccountResult> {
  const { companyId, role, firstName, lastName, linkedEntityKey, linkedEntityId } = input;
  const phone = input.phone ? normalizePhone(input.phone) : null;
  const email = input.email?.trim() || null;

  if (!phone && !email) {
    throw new Error("Нужен телефон или email");
  }
  if (!firstName?.trim() || !lastName?.trim()) {
    throw new Error("Имя и фамилия обязательны");
  }

  // Существующий пользователь по телефону → если привязка совпадает, возвращаем; иначе конфликт
  if (phone) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing) {
      if (existing[linkedEntityKey] === linkedEntityId) {
        return { user: existing, created: false };
      }
      throw new Error("Телефон уже зарегистрирован за другим пользователем");
    }
  }
  if (email) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      if (existing[linkedEntityKey] === linkedEntityId) {
        return { user: existing, created: false };
      }
      throw new Error("Email уже зарегистрирован за другим пользователем");
    }
  }

  const insertValues: Record<string, unknown> = {
    companyId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    role,
    isActive: true,
    [linkedEntityKey]: linkedEntityId,
  };
  if (phone) insertValues.phone = phone;
  if (email) insertValues.email = email;

  const [user] = await db.insert(usersTable).values(insertValues as any).returning();
  return { user, created: true };
}

/** Удобный wrapper для проверки доступа по company. */
export async function findUserByLinkedEntity(
  companyId: number,
  linkedEntityKey: CreatePortalAccountInput["linkedEntityKey"],
  linkedEntityId: number,
): Promise<typeof usersTable.$inferSelect | null> {
  const [user] = await db.select().from(usersTable)
    .where(and(
      eq(usersTable.companyId, companyId),
      eq(usersTable[linkedEntityKey] as any, linkedEntityId),
    ));
  return user ?? null;
}
