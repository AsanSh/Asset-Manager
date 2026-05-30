/**
 * Sentry integration для Vercel serverless.
 *
 * Когда SENTRY_DSN не задан — функция работает в no-op режиме (логирует
 * в console.error). Это позволяет деплоить без обязательного Sentry.
 *
 * После установки `pnpm add @sentry/node` раскомментировать импорт ниже
 * и заменить captureException на Sentry.captureException(err).
 */

import { logger } from "./logger";

// Динамическая загрузка Sentry если установлен и DSN задан
let sentryClient: any = null;
let sentryInitialized = false;

async function ensureSentry(): Promise<void> {
  if (sentryInitialized) return;
  sentryInitialized = true;
  if (!process.env.SENTRY_DSN) return;
  try {
    // @ts-ignore — пакет может быть не установлен
    const Sentry = await import("@sentry/node").catch(() => null);
    if (!Sentry) return;
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
    });
    sentryClient = Sentry;
    logger.info("Sentry initialized");
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "Sentry init failed — ошибки будут только в logger");
  }
}

/**
 * Захватить исключение в Sentry (если настроен) и в логгер.
 * Безопасно вызывать даже без Sentry.
 */
export async function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  await ensureSentry();
  logger.error({ err, ...context }, "Captured exception");
  if (sentryClient) {
    try {
      sentryClient.captureException(err, { extra: context });
      // На serverless важно дождаться отправки перед завершением функции
      await sentryClient.flush(2000);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Захватить сообщение (warning / info).
 */
export async function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>,
): Promise<void> {
  await ensureSentry();
  if (level === "error") logger.error({ ...context }, message);
  else if (level === "warning") logger.warn({ ...context }, message);
  else logger.info({ ...context }, message);
  if (sentryClient) {
    try {
      sentryClient.captureMessage(message, { level, extra: context });
      await sentryClient.flush(2000);
    } catch {
      /* ignore */
    }
  }
}
