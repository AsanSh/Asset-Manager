import { db } from "./db";
import { constructionAccrualsTable } from "./db/schema";
import { and, asc, eq } from "drizzle-orm";

export type PaymentAllocationResult = {
  accrualId: number;
  installmentNumber: number;
  dueDate: string;
  applied: number;
  remainingAmount: number;
  status: string;
};

function accrualBalance(accrual: {
  amount: string | null;
  paidAmount: string | null;
  remainingAmount: string | null;
}): number {
  const rem = parseFloat(accrual.remainingAmount?.toString() || "0");
  if (rem > 0.01) return rem;
  const total = parseFloat(accrual.amount?.toString() || "0");
  const paid = parseFloat(accrual.paidAmount?.toString() || "0");
  return Math.max(0, total - paid);
}

/** Распределяет платёж по начислениям договора начиная с выбранного */
export async function allocatePaymentAcrossAccruals(
  params: {
    companyId: number;
    contractId: number;
    startAccrualId?: number | null;
    amount: number;
    payDate: string;
  },
  txOrDb: any = db,
): Promise<{ allocations: PaymentAllocationResult[]; unallocated: number }> {
  const { companyId, contractId, startAccrualId, amount, payDate } = params;

  const accruals = await txOrDb
    .select()
    .from(constructionAccrualsTable)
    .where(
      and(
        eq(constructionAccrualsTable.companyId, companyId),
        eq(constructionAccrualsTable.contractId, contractId),
      ),
    )
    .orderBy(
      asc(constructionAccrualsTable.dueDate),
      asc(constructionAccrualsTable.installmentNumber),
    );

  let startIdx = 0;
  if (startAccrualId != null) {
    const idx = accruals.findIndex((a) => a.id === startAccrualId);
    if (idx >= 0) startIdx = idx;
  } else {
    const firstOpen = accruals.findIndex((a) => accrualBalance(a) > 0.01);
    startIdx = firstOpen >= 0 ? firstOpen : 0;
  }

  let remaining = amount;
  const allocations: PaymentAllocationResult[] = [];

  for (let i = startIdx; i < accruals.length && remaining > 0.01; i++) {
    const acc = accruals[i];
    const accRem = accrualBalance(acc);
    if (accRem <= 0.01) continue;

    const applied = Math.min(remaining, accRem);
    const total = parseFloat(acc.amount?.toString() || "0");
    const newPaid = parseFloat(acc.paidAmount?.toString() || "0") + applied;
    const newRemaining = Math.max(0, total - newPaid);
    const status = newRemaining <= 0.01 ? "paid" : "partial";

    await txOrDb
      .update(constructionAccrualsTable)
      .set({
        paidAmount: String(newPaid),
        remainingAmount: String(newRemaining),
        status,
        paidAt: status === "paid" ? payDate : acc.paidAt,
      })
      .where(eq(constructionAccrualsTable.id, acc.id));

    allocations.push({
      accrualId: acc.id,
      installmentNumber: acc.installmentNumber,
      dueDate: acc.dueDate,
      applied,
      remainingAmount: newRemaining,
      status,
    });

    remaining -= applied;
  }

  return { allocations, unallocated: Math.max(0, remaining) };
}
