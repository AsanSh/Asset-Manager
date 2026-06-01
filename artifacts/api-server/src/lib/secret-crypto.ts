import crypto from "crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer | null {
  const raw = process.env.INTEGRATION_SECRETS_KEY || process.env.SESSION_SECRET;
  if (!raw || raw.length < 16) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Шифрует секрет для хранения в JSON/settings. Без ключа — plaintext (dev). */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || isEncryptedSecret(plaintext)) return plaintext;
  const key = getKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString("base64url");
  return `${PREFIX}${payload}`;
}

/** Расшифровывает или возвращает plaintext legacy-значения. */
export function decryptSecret(stored: string): string {
  if (!stored) return stored;
  if (!isEncryptedSecret(stored)) return stored;

  const key = getKey();
  if (!key) {
    console.warn("[secret-crypto] INTEGRATION_SECRETS_KEY не задан — не могу расшифровать");
    return "";
  }

  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + 16);
    const data = raw.subarray(IV_LEN + 16);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    console.warn("[secret-crypto] Ошибка расшифровки");
    return "";
  }
}

/** Маскирует для API-ответов. */
export function maskSecret(value: string | undefined | null): string | null {
  return value ? "••••••••" : null;
}
