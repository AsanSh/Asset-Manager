/** Нормализует сумму зарплаты в строку для БД. */
export function toPayrollAmount(raw: unknown): string {
  const n = parseFloat(String(raw ?? "0"));
  return Number.isFinite(n) ? String(n) : "0";
}

/** Дата найма / эффективности: ISO или dd.mm.yyyy; пусто → null. */
export function normalizePayrollDate(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return s.slice(0, 16);
}

/** Дельта оклада при одобрении заявки (новая − текущая). */
export function computePayrollSalaryDelta(
  previousAmount: string | null | undefined,
  newAmount: string | null | undefined,
): string {
  const prev = parseFloat(String(previousAmount ?? "0"));
  const next = parseFloat(String(newAmount ?? "0"));
  return String(next - prev);
}
