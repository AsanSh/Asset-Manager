import { db } from "./db";
import {
  constructionAccrualsTable,
  constructionOperationsTable,
  constructionSalesContractsTable,
} from "./db/schema";
import { and, desc, eq, like, or } from "drizzle-orm";
import { allocatePaymentAcrossAccruals } from "./payment-allocation";

export type ApplyContractPaymentInput = {
  companyId: number;
  contractId: number;
  projectId?: number | null;
  accrualId?: number | null;
  amount: number | string;
  currency?: string;
  exchangeRate?: string | number;
  accountId?: number | null;
  paymentMethod?: string;
  date?: string;
  notes?: string;
  /** false — начисление уже обновлено (например, через PATCH) */
  updateAccrual?: boolean;
  source?: string;
};

export async function applyContractPayment(input: ApplyContractPaymentInput) {
  const {
    companyId,
    contractId,
    projectId,
    accrualId,
    amount,
    currency = "KGS",
    exchangeRate = "1",
    accountId,
    paymentMethod = "cash",
    date,
    notes,
    updateAccrual = true,
    source,
  } = input;

  const payAmount = parseFloat(String(amount));
  if (!payAmount || payAmount <= 0) {
    throw new Error("Сумма платежа должна быть больше нуля");
  }

  const payDate = date || new Date().toISOString().slice(0, 10);
  const amountKgs =
    currency === "KGS"
      ? String(payAmount)
      : String(payAmount * parseFloat(String(exchangeRate || "1")));

  const [contract] = await db
    .select()
    .from(constructionSalesContractsTable)
    .where(
      and(
        eq(constructionSalesContractsTable.id, contractId),
        eq(constructionSalesContractsTable.companyId, companyId),
      ),
    );

  const noteParts = [
    notes,
    source === "accruals" ? "Принято из начислений" : null,
  ].filter(Boolean);

  let allocations: Awaited<
    ReturnType<typeof allocatePaymentAcrossAccruals>
  >["allocations"] = [];

  if (updateAccrual) {
    const result = await allocatePaymentAcrossAccruals({
      companyId,
      contractId,
      startAccrualId: accrualId,
      amount: payAmount,
      payDate,
    });
    allocations = result.allocations;
    if (result.unallocated > 0.01) {
      noteParts.push(
        `Нераспределённый остаток: ${result.unallocated.toFixed(2)}`,
      );
    }
    if (allocations.length > 0) {
      noteParts.push(
        allocations
          .map(
            (a) =>
              `№${a.installmentNumber}: ${a.applied} (${a.status})`,
          )
          .join("; "),
      );
    }
  }

  const [operation] = await db
    .insert(constructionOperationsTable)
    .values({
      companyId,
      projectId: projectId ?? contract?.projectId ?? null,
      type: "income",
      category: "Платеж по договору",
      contractId,
      accrualId: accrualId ? Number(accrualId) : null,
      fromAccountId: null,
      toAccountId: accountId ? Number(accountId) : null,
      amount: String(payAmount),
      currency,
      exchangeRate: String(exchangeRate),
      amountKgs,
      date: payDate,
      description: contract
        ? `Оплата по договору ${contract.contractNumber}`
        : `Оплата по договору #${contractId}`,
      paymentMethod,
      status: "approved",
      notes: noteParts.length ? noteParts.join(" · ") : null,
    })
    .returning();

  if (contract) {
    const newPaid =
      parseFloat(contract.paidAmount?.toString() || "0") + payAmount;
    const newRemaining = Math.max(
      0,
      parseFloat(contract.totalAmount?.toString() || "0") - newPaid,
    );
    await db
      .update(constructionSalesContractsTable)
      .set({
        paidAmount: String(newPaid),
        remainingAmount: String(newRemaining),
        status: newRemaining <= 0 ? "completed" : contract.status,
        updatedAt: new Date(),
      })
      .where(eq(constructionSalesContractsTable.id, contractId));
  }

  return { operation, allocations };
}

/** Отмена платежа по начислению */
export async function cancelAccrualPayment(companyId: number, accrualId: number) {
  const [accrual] = await db
    .select()
    .from(constructionAccrualsTable)
    .where(
      and(
        eq(constructionAccrualsTable.id, accrualId),
        eq(constructionAccrualsTable.companyId, companyId),
      ),
    );

  if (!accrual) {
    throw new Error("Начисление не найдено");
  }

  const paidOnAccrual = parseFloat(accrual.paidAmount?.toString() || "0");
  if (
    paidOnAccrual <= 0 &&
    accrual.status !== "paid" &&
    accrual.status !== "partial"
  ) {
    throw new Error("По этому начислению нет принятых платежей");
  }

  const installmentNum = accrual.installmentNumber;
  const installmentPatterns = [
    `%Платёж №${installmentNum}%`,
    `%Платеж №${installmentNum}%`,
    `%начисления%`,
  ];

  const baseOpFilter = and(
    eq(constructionOperationsTable.companyId, companyId),
    eq(constructionOperationsTable.contractId, accrual.contractId),
    eq(constructionOperationsTable.type, "income"),
    eq(constructionOperationsTable.status, "approved"),
  );

  let ops = await db
    .select()
    .from(constructionOperationsTable)
    .where(
      and(
        baseOpFilter,
        or(
          eq(constructionOperationsTable.accrualId, accrualId),
          ...installmentPatterns.map((p) =>
            like(constructionOperationsTable.notes, p),
          ),
        ),
      ),
    );

  // Fallback: ищем по сумме (старые платежи без привязки в notes)
  if (ops.length === 0) {
    const candidates = await db
      .select()
      .from(constructionOperationsTable)
      .where(baseOpFilter)
      .orderBy(desc(constructionOperationsTable.createdAt));

    const tolerance = 0.01;
    const exact = candidates.filter(
      (o) =>
        Math.abs(parseFloat(o.amount?.toString() || "0") - paidOnAccrual) <
        tolerance,
    );
    if (exact.length > 0) {
      ops = exact.slice(0, 1);
    } else if (paidOnAccrual > 0) {
      let sum = 0;
      const picked = [];
      for (const o of candidates) {
        if (sum >= paidOnAccrual - tolerance) break;
        picked.push(o);
        sum += parseFloat(o.amount?.toString() || "0");
      }
      if (Math.abs(sum - paidOnAccrual) < tolerance) ops = picked;
    }
  }

  let reversedFromOps = 0;
  for (const op of ops) {
    reversedFromOps += parseFloat(op.amount?.toString() || "0");
    await db
      .update(constructionOperationsTable)
      .set({
        status: "cancelled",
        notes: [op.notes, "Отменено"].filter(Boolean).join(" · "),
      })
      .where(eq(constructionOperationsTable.id, op.id));
  }

  // Всегда откатываем начисление на фактически оплаченную сумму
  const reversed =
    reversedFromOps > 0 ? reversedFromOps : paidOnAccrual;

  const total = parseFloat(accrual.amount?.toString() || "0");
  const newPaid = Math.max(
    0,
    parseFloat(accrual.paidAmount?.toString() || "0") - reversed,
  );
  const newRemaining = Math.max(0, total - newPaid);
  const newStatus =
    newPaid <= 0 ? "pending" : newRemaining <= 0 ? "paid" : "partial";

  await db
    .update(constructionAccrualsTable)
    .set({
      paidAmount: String(newPaid),
      remainingAmount: String(newRemaining),
      status: newStatus,
      paidAt: newStatus === "paid" ? accrual.paidAt : null,
    })
    .where(eq(constructionAccrualsTable.id, accrualId));

  const [contract] = await db
    .select()
    .from(constructionSalesContractsTable)
    .where(
      and(
        eq(constructionSalesContractsTable.id, accrual.contractId),
        eq(constructionSalesContractsTable.companyId, companyId),
      ),
    );

  if (contract) {
    const contractPaid = Math.max(
      0,
      parseFloat(contract.paidAmount?.toString() || "0") - reversed,
    );
    const contractTotal = parseFloat(contract.totalAmount?.toString() || "0");
    const contractRemaining = Math.max(0, contractTotal - contractPaid);
    const wasCompleted = contract.status === "completed";
    await db
      .update(constructionSalesContractsTable)
      .set({
        paidAmount: String(contractPaid),
        remainingAmount: String(contractRemaining),
        status:
          wasCompleted && contractRemaining > 0 ? "signed" : contract.status,
        updatedAt: new Date(),
      })
      .where(eq(constructionSalesContractsTable.id, accrual.contractId));
  }

  return {
    reversed,
    operationsCancelled: ops.length,
    accrualStatus: newStatus,
  };
}
