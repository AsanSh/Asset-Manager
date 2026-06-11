/** Количество дней в календарном месяце (month — 0-based). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export type RentalAccrualRow = {
  companyId: number;
  leaseContractId: number;
  period: string;
  amount: string;
  currency: string;
  dueDate: string;
  paidAmount: string;
  balance: string;
  status: string;
};

/**
 * Строит начисления аренды с пропорцией первого/последнего месяца.
 * План аренды — из договора (start/end/rentAmount), не из фактических платежей.
 */
export function buildRentalAccrualRows(params: {
  companyId: number;
  leaseContractId: number;
  startDate: Date;
  endDate: Date | null;
  rentAmount: number;
  currency: string;
  accrualDay: number;
}): RentalAccrualRow[] {
  const { companyId, leaseContractId, startDate, endDate, rentAmount, currency, accrualDay } =
    params;
  const rows: RentalAccrualRow[] = [];

  const end = endDate
    ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    : new Date(startDate.getFullYear(), startDate.getMonth() + 12, 0);

  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  let isFirstMonth = true;

  while (current <= end) {
    const yr = current.getFullYear();
    const mo = current.getMonth();
    const dim = daysInMonth(yr, mo);
    const moStr = String(mo + 1).padStart(2, "0");
    const period = `${yr}-${moStr}`;

    const dueDay = Math.min(accrualDay || 1, dim);
    const dueDateStr = `${yr}-${moStr}-${String(dueDay).padStart(2, "0")}`;

    let amount = rentAmount;

    const isLastMonth =
      endDate &&
      current.getFullYear() === endDate.getFullYear() &&
      current.getMonth() === endDate.getMonth();

    if (isFirstMonth && startDate.getDate() > 1 && !isLastMonth) {
      const daysRented = dim - startDate.getDate() + 1;
      amount = Math.round((rentAmount / dim) * daysRented * 100) / 100;
    } else if (isFirstMonth && isLastMonth) {
      const daysRented = endDate!.getDate() - startDate.getDate() + 1;
      amount = Math.round((rentAmount / dim) * daysRented * 100) / 100;
    } else if (isLastMonth && endDate && endDate.getDate() < dim) {
      amount = Math.round((rentAmount / dim) * endDate.getDate() * 100) / 100;
    }

    rows.push({
      companyId,
      leaseContractId,
      period,
      amount: String(amount),
      currency,
      dueDate: dueDateStr,
      paidAmount: "0",
      balance: String(amount),
      status: "pending",
    });

    isFirstMonth = false;
    current.setMonth(current.getMonth() + 1);
  }

  return rows;
}
