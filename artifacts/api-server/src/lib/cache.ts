/**
 * Simple in-memory cache
 * В production использовать Redis
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Получить значение из кэша
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Сохранить в кэш
   * @param key ключ
   * @param value значение
   * @param ttl время жизни в секундах (по умолчанию 5 минут)
   */
  set<T>(key: string, value: T, ttl: number = 300): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  /**
   * Удалить из кэша
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Удалить все ключи по паттерну
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Получить или установить
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Статистика кэша
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new MemoryCache();

/**
 * Генератор ключей кэша
 */
export const cacheKeys = {
  dashboard: (companyId: number) => `dashboard:${companyId}`,
  projects: (companyId: number) => `projects:${companyId}`,
  project: (id: number) => `project:${id}`,
  units: (projectId: number) => `units:${projectId}`,
  warehouseItems: (companyId: number) => `warehouse:items:${companyId}`,
  suppliers: (companyId: number) => `suppliers:${companyId}`,
  notifications: (userId: number) => `notifications:${userId}`,
  unreadCount: (userId: number) => `notifications:unread:${userId}`,
};

/**
 * Middleware для кэширования ответов
 */
import { Request, Response, NextFunction } from 'express';

export function cacheMiddleware(keyFn: (req: Request) => string, ttl: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    // Перехватываем res.json для кэширования
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      cache.set(key, body, ttl);
      return originalJson(body);
    };

    next();
  };
}
