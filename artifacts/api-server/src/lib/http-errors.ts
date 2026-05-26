import type { Response } from "express";

/** Log full error server-side; return safe message to client. */
export function sendServerError(
  res: Response,
  err: unknown,
  fallback = "Внутренняя ошибка сервера",
): void {
  console.error(fallback, err);
  res.status(500).json({ error: fallback });
}
