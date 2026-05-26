import { and, eq, SQL } from "drizzle-orm";
import { db } from "./db";
import { bankAccountsTable } from "./db";

/** Изоляция счетов по модулям платформы */
export const BANK_ACCOUNT_MODULE = {
  construction: "construction",
  rental: "rental",
  warehouse: "warehouse",
  crm: "crm",
  consolidated: "consolidated",
} as const;

export type BankAccountModuleKey =
  (typeof BANK_ACCOUNT_MODULE)[keyof typeof BANK_ACCOUNT_MODULE];

export function companyModuleAccountWhere(
  companyId: number,
  module: BankAccountModuleKey,
): SQL {
  return and(
    eq(bankAccountsTable.companyId, companyId),
    eq(bankAccountsTable.module, module),
  )!;
}

export function companyModuleAccountByIdWhere(
  companyId: number,
  accountId: number,
  module: BankAccountModuleKey,
): SQL {
  return and(
    eq(bankAccountsTable.id, accountId),
    eq(bankAccountsTable.companyId, companyId),
    eq(bankAccountsTable.module, module),
  )!;
}

/** Проверка, что счёт принадлежит модулю (для платежей и операций) */
export async function accountExistsInModule(
  companyId: number,
  accountId: number,
  module: BankAccountModuleKey,
): Promise<boolean> {
  const [row] = await db
    .select({ id: bankAccountsTable.id })
    .from(bankAccountsTable)
    .where(companyModuleAccountByIdWhere(companyId, accountId, module));
  return !!row;
}
