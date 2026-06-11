# 🚀 РУКОВОДСТВО ПО ЗАПУСКУ

## Быстрый старт

### 1. Запуск Backend API

```bash
cd /Users/asans/Desktop/4Project/Asset-Manager/artifacts/api-server

# Запуск с environment variables
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/proptech" \
PORT=3000 \
NODE_ENV=development \
node --enable-source-maps ./dist/index.mjs
```

**Проверка:**
```bash
curl http://localhost:3000/health
# Должен вернуть: {"status":"ok",...}
```

### 2. Запуск Frontend

```bash
cd /Users/asans/Desktop/4Project/Asset-Manager/artifacts/proptech
pnpm run dev
```

**Откройте:** http://localhost:5173

---

## ⚠️ ВАЖНЫЕ ИСПРАВЛЕНИЯ

### Проблема 1: Модули не видны в дропдауне
**Исправлено:** `src/components/layout.tsx:396`
- Было: `text-white` (белый текст на белом фоне)
- Стало: `text-gray-700` (темный текст на белом фоне)

### Проблема 2: Проекты не загружаются
**Исправлено:** `src/pages/construction/projects.tsx:287-292`
- API теперь возвращает `{data: [...], meta: {...}}`
- Фронтенд обновлен для работы с пагинацией

### Проблема 3: XSS Protection ломает query params
**Исправлено:** `artifacts/api-server/src/middleware/validation.ts:106`
- Express 5 делает `req.query` read-only
- XSS protection теперь чистит только `req.body`

---

## 📋 CHECKLIST ПЕРЕД ЗАПУСКОМ

- [ ] PostgreSQL запущен на порту 5432
- [ ] База данных `proptech` создана
- [ ] Frontend dev server НЕ запущен на порту 3000
- [ ] API Server собран (`pnpm run build`)

---

## 🔧 TROUBLESHOOTING

### API не стартует

**Ошибка:** `DATABASE_URL must be set`
```bash
# Решение: запускать с inline env vars
DATABASE_URL="postgresql://..." PORT=3000 NODE_ENV=development node --enable-source-maps ./dist/index.mjs
```

**Ошибка:** `Cannot set property query`
```bash
# Решение: пересобрать с исправленным validation.ts
cd artifacts/api-server
pnpm run build
```

### Frontend не видит API

**Проверить:**
```bash
# 1. API работает
curl http://localhost:3000/health

# 2. Frontend смотрит на правильный порт
cat artifacts/proptech/.env | grep VITE_API_URL
# Должно быть: VITE_API_URL=http://localhost:3000
```

### Проекты не сохраняются

**Проверить в DevTools Console:**
- Есть ли ошибки 401 (не залогинен)
- Есть ли ошибки 429 (rate limit)
- Есть ли ошибки 400 (validation)

**Решение:**
1. Перелогиниться
2. Подождать 15 минут (rate limit reset)
3. Проверить формат данных

### Модули не видны

**Проверить:**
```bash
# Файл исправлен?
grep -A2 "m.id === activeModuleId" artifacts/proptech/src/components/layout.tsx
# Должно быть: text-gray-700 (не text-white)
```

---

## 🎯 ПОЛЕЗНЫЕ КОМАНДЫ

### Пересобрать Backend
```bash
cd artifacts/api-server
pnpm run build
```

### Проверить здоровье API
```bash
curl http://localhost:3000/health | jq .
```

### Проверить rate limits
```bash
curl -I http://localhost:3000/api/construction/projects
# Смотреть headers: X-RateLimit-*
```

### Убить зависший процесс
```bash
# Убить API server
pkill -9 -f "node.*dist/index"

# Убить Frontend dev server  
lsof -ti:5173 | xargs kill -9
```

### Логи API в реальном времени
```bash
cd artifacts/api-server
DATABASE_URL="..." PORT=3000 NODE_ENV=development node --enable-source-maps ./dist/index.mjs
# Логи будут в консоли
```

---

## 📊 ENDPOINTS

### API Base URL
```
http://localhost:3000/api
```

### Основные endpoints:
```
GET  /health                        - Health check
POST /auth/login                    - Логин
POST /auth/register                 - Регистрация
GET  /auth/me                       - Текущий пользователь

GET  /construction/projects         - Список проектов (с пагинацией)
POST /construction/projects         - Создать проект
PATCH /construction/projects/:id    - Обновить проект
DELETE /construction/projects/:id   - Удалить проект

GET  /dashboard/summary             - Dashboard (с кэшем 5 мин)
```

### Pagination:
```bash
GET /api/construction/projects?page=1&limit=20

# Response:
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🔒 SECURITY

### Rate Limits:
- **General API:** 100 req / 15 min
- **Auth endpoints:** 5 req / 15 min
- **API calls:** 60 req / min
- **Uploads:** 50 req / hour
- **Exports:** 10 req / min

### Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1234567890
```

---

## ✅ ВСЕ РАБОТАЕТ, ЕСЛИ:

1. ✅ `curl http://localhost:3000/health` возвращает `{"status":"ok"}`
2. ✅ Frontend открывается на http://localhost:5173
3. ✅ Можно залогиниться
4. ✅ Видны все модули (Строительство, Аренда, CRM, Закуп, Сводное)
5. ✅ Проекты загружаются и сохраняются

**Если что-то не работает** - смотри раздел TROUBLESHOOTING выше.
