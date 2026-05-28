import bcrypt from "bcryptjs";
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Хеширование пароля с использованием bcrypt
 * @param password - Пароль для хеширования
 * @returns Promise с хешем пароля
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Проверка пароля против хеша
 * @param password - Введенный пароль
 * @param hash - Хеш для сравнения
 * @returns Promise<boolean> - true если пароль совпадает
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Генерация криптографически стойкого токена
 * @returns Токен в hex формате (64 символа)
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Безопасное сравнение строк (защита от timing attack)
 * @param a - Первая строка
 * @param b - Вторая строка
 * @returns boolean - true если строки идентичны
 */
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Санитизация паттернов для SQL LIKE запросов
 * Экранирует спецсимволы: %, _, \
 * @param value - Строка для санитизации
 * @returns Безопасная строка для LIKE
 */
export function sanitizeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Валидация пароля по требованиям безопасности
 * @param password - Пароль для проверки
 * @returns Объект с результатом валидации
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 12) {
    return {
      valid: false,
      error: 'Пароль должен содержать минимум 12 символов',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну заглавную букву',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну строчную букву',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну цифру',
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы один спецсимвол',
    };
  }

  return { valid: true };
}
