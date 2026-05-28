import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Базовый rate limiter для всех endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов
  message: { error: 'Слишком много запросов, попробуйте позже' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Превышен лимит запросов. Попробуйте через 15 минут.',
      retryAfter: Math.ceil((req as any).rateLimit?.resetTime / 1000)
    });
  },
});

// Лимит попыток входа (защита от перебора, но без блокировки при обычной работе)
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 минут
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Слишком много попыток входа",
      message: "Подождите несколько минут и попробуйте снова.",
    });
  },
});

// Limiter для API endpoints
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 60, // 60 запросов в минуту
  message: { error: 'API rate limit exceeded' },
});

// Limiter для загрузки файлов
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 50, // 50 загрузок в час
  message: { error: 'Превышен лимит загрузки файлов' },
});

// Limiter для экспорта (Excel/PDF)
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 экспортов в минуту
  message: { error: 'Слишком много экспортов, подождите минуту' },
});
