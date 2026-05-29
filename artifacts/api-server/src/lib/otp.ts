import { and, eq, gt, isNull, desc } from "drizzle-orm";
import { db, otpCodesTable } from "./db";
import { logger } from "./logger";
import { sendSmsViaNikita } from "./sms";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_THROTTLE_SECONDS = 60;

/** Нормализация номера телефона. Сохраняем только цифры с ведущим + если был. */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/** Сгенерировать N-значный код. Использует Math.random для скорости —
 *  для production желательно crypto.randomInt. */
function generateCode(): string {
  const max = 10 ** OTP_LENGTH;
  const n = Math.floor(Math.random() * max);
  return String(n).padStart(OTP_LENGTH, "0");
}

/** Создать новый OTP-код для номера. Бросает Error при throttle. */
export async function issueOtp(
  rawPhone: string,
  purpose: "login" | "verify" = "login",
): Promise<{ code: string; phone: string; expiresAt: Date; smsSent: boolean }> {
  const phone = normalizePhone(rawPhone);
  if (!phone || phone.length < 7) {
    throw new Error("Некорректный номер телефона");
  }

  // Throttle: не чаще чем раз в RESEND_THROTTLE_SECONDS секунд
  const [last] = await db.select().from(otpCodesTable)
    .where(and(
      eq(otpCodesTable.phone, phone),
      eq(otpCodesTable.purpose, purpose),
    ))
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (last) {
    const sinceMs = Date.now() - new Date(last.createdAt).getTime();
    if (sinceMs < RESEND_THROTTLE_SECONDS * 1000) {
      const wait = Math.ceil((RESEND_THROTTLE_SECONDS * 1000 - sinceMs) / 1000);
      const err = new Error(`Подождите ${wait} сек перед запросом нового кода`);
      (err as Error & { code?: string }).code = "THROTTLED";
      throw err;
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await db.insert(otpCodesTable).values({
    phone,
    code,
    purpose,
    expiresAt,
  });

  // Отправляем SMS через Nikita. Если креды не настроены — провайдер сам залогирует.
  const smsText = `Код для входа: ${code}\nДействует ${OTP_TTL_MINUTES} мин.`;
  const result = await sendSmsViaNikita(phone, smsText);
  if (!result.ok) {
    logger.warn({ phone, status: result.status, error: result.error }, "SMS не отправлена — код виден в логах");
  }

  return { code, phone, expiresAt, smsSent: result.ok };
}

/** Проверить код. Возвращает true если совпал и ещё валиден.
 *  Помечает код как consumed при успехе. */
export async function verifyOtp(
  rawPhone: string,
  rawCode: string,
  purpose: "login" | "verify" = "login",
): Promise<{ ok: boolean; reason?: string }> {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode || "").trim();
  if (!phone || !code) return { ok: false, reason: "Введите телефон и код" };

  // Самый свежий неподтверждённый код для этого номера
  const [row] = await db.select().from(otpCodesTable)
    .where(and(
      eq(otpCodesTable.phone, phone),
      eq(otpCodesTable.purpose, purpose),
      isNull(otpCodesTable.consumedAt),
      gt(otpCodesTable.expiresAt, new Date()),
    ))
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (!row) {
    return { ok: false, reason: "Код истёк или не найден. Запросите новый." };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "Превышено количество попыток. Запросите новый код." };
  }

  if (row.code !== code) {
    await db.update(otpCodesTable)
      .set({ attempts: row.attempts + 1 })
      .where(eq(otpCodesTable.id, row.id));
    return { ok: false, reason: "Неверный код" };
  }

  await db.update(otpCodesTable)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodesTable.id, row.id));
  return { ok: true };
}
