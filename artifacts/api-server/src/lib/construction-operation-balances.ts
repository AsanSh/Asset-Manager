import { sql } from "drizzle-orm";
import { db, bankAccountsTable } from "./db";
import {
  BANK_ACCOUNT_MODULE,
  companyModuleAccountByIdWhere,
} from "./bank-account-module";

const CONSTRUCTION_ACCOUNTS = BANK_ACCOUNT_MODULE.construction;

/** Атомарное изменение баланса: balance = balance + delta (delta может быть отрицательной).
 *  Защищает от гонок параллельных платежей. Не блокирует и не теряет промежуточные значения. */
async function adjustAccountBalance(
  companyId: number,
  accountId: number,
  delta: number,
): Promise<void> {
  await db
    .update(bankAccountsTable)
    .set({ currentBalance: sql`GREATEST(0, COALESCE(${bankAccountsTable.currentBalance}, 0) + ${delta})` })
    .where(
      companyModuleAccountByIdWhere(
        companyId,
        accountId,
        CONSTRUCTION_ACCOUNTS,
      ),
    );
}

export type OpForBalance = {
  type: string;
  status: string;
  fromAccountId: number | null;
  toAccountId: number | null;
  amountKgs: string | number;
};

export async function getAccountBalance(
  companyId: number,
  accountId: number,
): Promise<number | null> {
  const [acc] = await db
    .select({ bal: bankAccountsTable.currentBalance })
    .from(bankAccountsTable)
    .where(
      companyModuleAccountByIdWhere(
        companyId,
        accountId,
        CONSTRUCTION_ACCOUNTS,
      ),
    );
  if (!acc) return null;
  return parseFloat(acc.bal?.toString() || "0");
}

export async function setAccountBalance(
  companyId: number,
  accountId: number,
  balance: number,
): Promise<void> {
  await db
    .update(bankAccountsTable)
    .set({ currentBalance: String(Math.max(0, balance)) })
    .where(
      companyModuleAccountByIdWhere(
        companyId,
        accountId,
        CONSTRUCTION_ACCOUNTS,
      ),
    );
}

/** Проверка перед проведением (без изменения БД) */
export async function validateOpBalances(
  companyId: number,
  op: OpForBalance,
): Promise<string | null> {
  if (op.status !== "approved") return null;
  const delta = parseFloat(String(op.amountKgs)) || 0;
  if (delta <= 0) return "Сумма должна быть больше 0";

  if (op.type === "expense") {
    if (!op.fromAccountId) return "Укажите счёт списания";
    const bal = await getAccountBalance(companyId, op.fromAccountId);
    if (bal === null) return "Счёт не найден или не относится к модулю «Строительство»";
    if (bal + 0.001 < delta) {
      return `Недостаточно средств на счёте. Доступно: ${Math.round(bal).toLocaleString("ru-RU")} KGS, нужно: ${Math.round(delta).toLocaleString("ru-RU")} KGS. Сначала сделайте перевод или приход на этот счёт.`;
    }
    return null;
  }

  if (op.type === "transfer") {
    if (!op.fromAccountId || !op.toAccountId) {
      return "Укажите счёт списания и счёт зачисления";
    }
    if (op.fromAccountId === op.toAccountId) {
      return "Счета списания и зачисления должны различаться";
    }
    const bal = await getAccountBalance(companyId, op.fromAccountId);
    if (bal === null) return "Счёт списания не найден или не относится к модулю «Строительство»";
    if (bal + 0.001 < delta) {
      return `Недостаточно средств для перевода. На счёте: ${Math.round(bal).toLocaleString("ru-RU")} KGS, нужно: ${Math.round(delta).toLocaleString("ru-RU")} KGS.`;
    }
    return null;
  }

  if (op.type === "income") {
    if (!op.toAccountId) return "Укажите счёт зачисления";
    const bal = await getAccountBalance(companyId, op.toAccountId);
    if (bal === null) return "Счёт зачисления не найден или не относится к модулю «Строительство»";
    return null;
  }

  return null;
}

/** Применить проведённую операцию к остаткам счетов (атомарно через SQL +=) */
export async function applyOpBalances(
  companyId: number,
  op: OpForBalance,
): Promise<void> {
  // Для approved — добавляем. Для cancelled — НЕ применяем (откат через reverseOpBalances).
  if (op.status !== "approved") return;
  const delta = parseFloat(String(op.amountKgs)) || 0;
  if (delta <= 0) return;

  if (op.type === "income" && op.toAccountId) {
    await adjustAccountBalance(companyId, op.toAccountId, delta);
    return;
  }
  if (op.type === "expense" && op.fromAccountId) {
    await adjustAccountBalance(companyId, op.fromAccountId, -delta);
    return;
  }
  if (op.type === "transfer" && op.fromAccountId && op.toAccountId) {
    await adjustAccountBalance(companyId, op.fromAccountId, -delta);
    await adjustAccountBalance(companyId, op.toAccountId, delta);
  }
}

/** Откатить проведённую операцию (для cancel платежа). Атомарно через SQL +=. */
export async function reverseOpBalances(
  companyId: number,
  op: OpForBalance,
): Promise<void> {
  // Принимаем op в исходном состоянии (status: "approved") — функция инвертирует движение.
  // Если op уже в БД помечен cancelled — это всё равно нужно вычесть из баланса.
  const delta = parseFloat(String(op.amountKgs)) || 0;
  if (delta <= 0) return;

  if (op.type === "income" && op.toAccountId) {
    await adjustAccountBalance(companyId, op.toAccountId, -delta);
    return;
  }
  if (op.type === "expense" && op.fromAccountId) {
    await adjustAccountBalance(companyId, op.fromAccountId, delta);
    return;
  }
  if (op.type === "transfer" && op.fromAccountId && op.toAccountId) {
    await adjustAccountBalance(companyId, op.fromAccountId, delta);
    await adjustAccountBalance(companyId, op.toAccountId, -delta);
  }
}
