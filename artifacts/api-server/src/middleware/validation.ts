import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Middleware для валидации body
export const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
};

// Middleware для валидации query params
export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
};

// Общие схемы валидации
export const commonSchemas = {
  id: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),

  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  }),

  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),

  search: z.object({
    q: z.string().min(1).max(100).optional(),
  }),
};

// Sanitization helpers
export const sanitize = {
  // Удаляет HTML теги
  stripHtml: (str: string): string => {
    return str.replace(/<[^>]*>/g, '');
  },

  // Экранирует SQL
  escapeSql: (str: string): string => {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%':
          return '\\' + char;
        default:
          return char;
      }
    });
  },

  // Только буквы, цифры, пробелы
  alphanumeric: (str: string): string => {
    return str.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, '');
  },

  // Телефон
  phone: (str: string): string => {
    return str.replace(/[^\d+\-\(\)\s]/g, '');
  },
};

// XSS protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const cleanObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitize.stripHtml(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }
    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        cleaned[key] = cleanObject(obj[key]);
      }
      return cleaned;
    }
    return obj;
  };

  // Only clean body (req.query is read-only in Express 5)
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }

  next();
};
