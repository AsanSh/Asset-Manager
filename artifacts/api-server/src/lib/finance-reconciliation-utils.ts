/** Нормализация даты операции для сверки (ISO или dd.mm.yyyy). */
export function normalizeReconciliationDate(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return s.slice(0, 10);
}

/** Абсолютная сумма строкой для сопоставления строк сверки. */
export function absReconciliationAmount(raw: unknown): string {
  const n = parseFloat(String(raw || "0"));
  if (!Number.isFinite(n)) return "0";
  return String(Math.abs(n));
}

/** Ключ пары «дата + сумма» для матчинга inbox ↔ bank. */
export function buildReconciliationPairKey(date: string, amount: string): string {
  return `${date}|${absReconciliationAmount(amount)}`;
}
