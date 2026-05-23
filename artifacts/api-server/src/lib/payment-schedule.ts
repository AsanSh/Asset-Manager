export type ScheduleRow = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  label?: string;
};

/** Строит график: первый взнос + равные платежи по рассрочке */
export function buildPaymentSchedule(
  totalAmount: number,
  downPayment: number,
  installmentMonths: number,
  contractDate: string,
): ScheduleRow[] {
  const total = Math.max(0, totalAmount);
  const down = Math.min(Math.max(0, downPayment), total);
  const remaining = total - down;
  const months = Math.max(1, Math.floor(installmentMonths) || 1);
  const rows: ScheduleRow[] = [];

  if (down > 0) {
    rows.push({
      installmentNumber: 0,
      dueDate: contractDate,
      amount: Math.round(down),
      label: "Первоначальный взнос",
    });
  }

  if (remaining <= 0) return rows;

  const monthly = remaining / months;
  for (let i = 0; i < months; i++) {
    const due = new Date(contractDate);
    due.setMonth(due.getMonth() + i + 1);
    const isLast = i === months - 1;
    const amount = isLast
      ? Math.round(remaining - monthly * (months - 1))
      : Math.round(monthly);
    rows.push({
      installmentNumber: i + 1,
      dueDate: due.toISOString().slice(0, 10),
      amount,
      label: `Платёж ${i + 1}`,
    });
  }

  return rows;
}

export function scheduleTotal(rows: ScheduleRow[]): number {
  return rows.reduce((s, r) => s + r.amount, 0);
}
