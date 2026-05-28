export type ReconciliationLineType = "delivery" | "payment" | "charge";

export interface SupplierReconciliationLine {
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: ReconciliationLineType;
  suppliedTotal?: number;
  paidTotal?: number;
  balanceAfter?: number;
}

export function buildSupplierReconciliation(params: {
  deliveries: Array<{
    documentDate: string | null;
    itemName?: string | null;
    documentNumber?: string | null;
    totalAmount: string | null;
    currency?: string | null;
  }>;
  payments: Array<{
    date: string;
    amount: string | null;
    currency?: string | null;
    description?: string | null;
  }>;
  contractAmount: number;
  paidAmount: number;
  currency: string;
}) {
  const { deliveries, payments, contractAmount, paidAmount, currency } = params;

  const totalSupplied = deliveries.reduce(
    (sum, d) => sum + parseFloat(String(d.totalAmount ?? 0)),
    0,
  );
  const outstanding = contractAmount - paidAmount;

  const deliveryLines: SupplierReconciliationLine[] = deliveries
    .slice()
    .reverse()
    .map((d) => {
      const amt = parseFloat(String(d.totalAmount ?? 0));
      const desc = [d.itemName, d.documentNumber ? `№${d.documentNumber}` : null]
        .filter(Boolean)
        .join(" — ") || "Поставка";
      return {
        date: d.documentDate ?? "",
        description: desc,
        amount: amt,
        currency: d.currency ?? currency,
        type: "delivery" as const,
      };
    });

  let cumulativeSupplied = 0;
  const deliveryWithTotals = deliveryLines.map((line) => {
    cumulativeSupplied += line.amount;
    return { ...line, suppliedTotal: cumulativeSupplied };
  });

  const paymentLines: SupplierReconciliationLine[] = payments
    .slice()
    .reverse()
    .map((p) => ({
      date: p.date,
      description: p.description || "Оплата поставщику",
      amount: parseFloat(String(p.amount ?? 0)),
      currency: p.currency ?? currency,
      type: "payment" as const,
    }));

  let cumulativePaid = 0;
  const paymentWithTotals = paymentLines.map((line) => {
    cumulativePaid += line.amount;
    return {
      ...line,
      paidTotal: cumulativePaid,
      balanceAfter: contractAmount - cumulativePaid,
    };
  });

  const lines = [...deliveryWithTotals, ...paymentWithTotals].sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    return da.localeCompare(db);
  });

  return {
    contractAmount,
    paidAmount,
    outstanding,
    totalSupplied,
    currency,
    lines,
  };
}

export interface BuyerReconciliationLine {
  date: string;
  description: string;
  charged?: number;
  paid?: number;
  balanceAfter: number;
  type: "charge" | "payment";
  currency: string;
}

export function buildBuyerReconciliation(params: {
  accruals: Array<{
    dueDate: string;
    amount: string | null;
    installmentNumber: number;
    notes?: string | null;
    currency?: string | null;
  }>;
  payments: Array<{
    date: string;
    description: string | null;
    amount: string | null;
    currency?: string | null;
    paymentMethod?: string | null;
  }>;
  contractAmount: number;
  totalCharged: number;
  totalPaid: number;
  currency: string;
}) {
  const { accruals, payments, contractAmount, totalCharged, totalPaid, currency } = params;
  const outstanding = totalCharged - totalPaid;

  const chargeLines: BuyerReconciliationLine[] = accruals
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((a) => ({
      date: a.dueDate,
      description: a.notes || `Платёж №${a.installmentNumber}`,
      charged: parseFloat(String(a.amount ?? 0)),
      balanceAfter: 0,
      type: "charge" as const,
      currency: a.currency ?? currency,
    }));

  const paymentLines: BuyerReconciliationLine[] = payments
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      date: p.date,
      description: p.description || "Оплата",
      paid: parseFloat(String(p.amount ?? 0)),
      balanceAfter: 0,
      type: "payment" as const,
      currency: p.currency ?? currency,
    }));

  const merged = [...chargeLines, ...paymentLines].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  let balance = 0;
  const lines = merged.map((line) => {
    if (line.type === "charge") {
      balance += line.charged ?? 0;
    } else {
      balance -= line.paid ?? 0;
    }
    return { ...line, balanceAfter: balance };
  });

  return {
    contractAmount,
    totalCharged,
    totalPaid,
    outstanding,
    currency,
    lines,
  };
}
