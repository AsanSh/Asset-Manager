// SMS-провайдер: smspro.nikita.kg
// Документация: https://smspro.nikita.kg/kg/documents/smspro.nikita.kg-XML-api_EN.pdf
// Endpoint: POST https://smspro.nikita.kg/api/message
// Тело — XML, ответ — XML.

import { logger } from "./logger";
import { normalizePhone } from "./otp";

const NIKITA_URL = process.env.NIKITA_SMS_URL || "https://smspro.nikita.kg/api/message";
const NIKITA_LOGIN = process.env.NIKITA_SMS_LOGIN || "";
const NIKITA_PWD = process.env.NIKITA_SMS_PWD || "";
const NIKITA_SENDER = process.env.NIKITA_SMS_SENDER || "";
const NIKITA_TEST_MODE = process.env.NIKITA_SMS_TEST === "1";

// Расшифровка статусов из документации (см. PDF, стр. 2)
const STATUS_DESCRIPTIONS: Record<string, string> = {
  "0": "Сообщение принято",
  "1": "Ошибка формата запроса",
  "2": "Неверная авторизация",
  "3": "IP-адрес запрещён",
  "4": "Недостаточно средств",
  "5": "Не подтверждённое имя отправителя",
  "6": "Стоп-слова в сообщении",
  "7": "Неверный формат номера",
  "8": "Неверный формат времени",
  "9": "Тайм-аут — повторите через 5-10 сек",
  "10": "Дубликат ID — повторная отправка",
  "11": "Тестовый режим (test=1)",
};

export interface SendSmsResult {
  ok: boolean;
  status?: string;
  description?: string;
  rawXml?: string;
  error?: string;
}

/** Сгенерировать message id для smspro: до 12 латинских/цифр символов. */
function makeMessageId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return (ts + rand).slice(0, 12);
}

/** Экранирование XML-спецсимволов в тексте. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Привести номер к формату smspro: только цифры, без +. Пример: 996700123456 */
function phoneForNikita(raw: string): string {
  const n = normalizePhone(raw);
  return n.replace(/^\+/, "");
}

/** Извлечь значение тега из XML без зависимости от парсера. */
function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, "i");
  const m = re.exec(xml);
  return m ? m[1].trim() : null;
}

/**
 * Отправка SMS через smspro.nikita.kg.
 * Возвращает { ok, status, description }.
 * Если креды не настроены — пишет в лог и возвращает ok:false без бросания.
 */
export async function sendSmsViaNikita(
  rawPhone: string,
  text: string,
  options: { sender?: string; testMode?: boolean } = {},
): Promise<SendSmsResult> {
  if (!NIKITA_LOGIN || !NIKITA_PWD || !NIKITA_SENDER) {
    logger.warn({ phone: rawPhone }, "NIKITA_SMS креды не настроены — SMS не отправлена");
    return { ok: false, error: "SMS-провайдер не настроен" };
  }

  const phone = phoneForNikita(rawPhone);
  if (!phone || phone.length < 9) {
    return { ok: false, error: "Некорректный номер" };
  }
  if (!text || !text.trim()) {
    return { ok: false, error: "Пустой текст" };
  }
  if (text.length > 800) {
    return { ok: false, error: "Текст слишком длинный (макс. 800 символов)" };
  }

  const id = makeMessageId();
  const sender = options.sender || NIKITA_SENDER;
  const testMode = options.testMode ?? NIKITA_TEST_MODE;

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<message>\n` +
    `  <login>${xmlEscape(NIKITA_LOGIN)}</login>\n` +
    `  <pwd>${xmlEscape(NIKITA_PWD)}</pwd>\n` +
    `  <id>${id}</id>\n` +
    `  <sender>${xmlEscape(sender)}</sender>\n` +
    `  <text>${xmlEscape(text)}</text>\n` +
    `  <phones>\n` +
    `    <phone>${phone}</phone>\n` +
    `  </phones>\n` +
    (testMode ? `  <test>1</test>\n` : "") +
    `</message>`;

  try {
    const res = await fetch(NIKITA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body,
      // 10-секундный таймаут — Node 18+ AbortSignal.timeout
      signal: AbortSignal.timeout(10_000),
    });
    const rawXml = await res.text();
    const status = extractTag(rawXml, "status");
    const description = status ? STATUS_DESCRIPTIONS[status] : null;

    if (!res.ok) {
      logger.error({ status: res.status, body: rawXml }, "Nikita SMS HTTP error");
      return { ok: false, status: status || undefined, description: description || undefined, rawXml, error: `HTTP ${res.status}` };
    }

    // Status 0 — принято, 11 — test-режим (тоже успех)
    const accepted = status === "0" || status === "11";
    if (!accepted) {
      logger.warn({ phone, status, description }, "Nikita SMS rejected");
    } else {
      logger.info({ phone, id, testMode }, "Nikita SMS sent");
    }
    return { ok: accepted, status: status || undefined, description: description || undefined, rawXml };
  } catch (e) {
    logger.error({ err: e, phone }, "Nikita SMS fetch failed");
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

// Экспорт для тестов
export const _internals = { makeMessageId, xmlEscape, phoneForNikita, extractTag, STATUS_DESCRIPTIONS };
