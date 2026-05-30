# Production Operations Manual

## Резервное копирование БД

**Платформа: Neon (serverless Postgres)**

- **Point-in-Time Recovery**: уже включено по умолчанию (Free tier — 7 дней, Pro — 30 дней)
- **Не нужно** настраивать `pg_dump` или внешнее хранилище
- **Восстановление**: Neon Console → проект → Backups → выбрать момент → создать branch с восстановленными данными
- **Branching**: при критичных миграциях можно создать branch БД, прогнать миграцию, проверить, потом сделать promote или откатить

**Дополнительно (опционально):**
- Скрипт `scripts/diagnose-balance-drift.sql` — диагностика расхождений балансов
- `npm run db:export` (если будет добавлен) — снэпшот в файл для офлайн-анализа

## Мониторинг ошибок

**Sentry интеграция:**
1. Создать проект на sentry.io (бесплатный план — 5k errors/мес)
2. Добавить в Vercel env: `SENTRY_DSN=https://...`
3. Установить пакет: `pnpm add @sentry/node` (в api-server)
4. Подключить в `app.ts` (см. `src/lib/sentry.ts`)

## SMS-провайдер (Nikita.kg)

Env-переменные в Vercel:
```
NIKITA_SMS_LOGIN=<логин>
NIKITA_SMS_PWD=<пароль>
NIKITA_SMS_SENDER=<имя_отправителя>
NIKITA_SMS_TEST=1     # для теста (статус 11), 0 на проде
```

Если переменные не выставлены — код OTP выводится только в логи Vercel.

## Диагностика расхождений балансов

```bash
psql "$DATABASE_URL" -f scripts/diagnose-balance-drift.sql
```

Показывает: `stored_balance` (в БД) vs `computed_from_operations` (пересчёт по истории) для каждого счёта.

## Idempotency

Endpoint `POST /cashier/payment` принимает header `Idempotency-Key`. Защита от двойного клика клиента — повторный запрос с тем же ключом вернёт сохранённый ответ (TTL 24 часа).

## Файлы документов

Сейчас: base64 в text-колонке `contract_document_meta` (лимит 5 МБ).
Планируется: Vercel Blob (см. Фаза 1.5).

## Заметки по безопасности

- Сессии в БД (не JWT). Отзыв через `DELETE FROM sessions WHERE user_id = X`.
- OTP-логин порталов: throttle 60 сек, max 5 попыток на код.
- Anti-enumeration в `/auth/send-otp`: одинаковый ответ для существующих и несуществующих номеров.
- Phone normalization: всегда E.164 (`+XXX`).
- Idempotency-keys: TTL 24 часа.

## Полезные SQL-запросы

```sql
-- Расхождения балансов
\i scripts/diagnose-balance-drift.sql

-- Активные сессии конкретного пользователя
SELECT * FROM sessions WHERE user_id = $1 AND expires_at > now();

-- OTP-коды для отладки (только в dev)
SELECT phone, code, expires_at FROM otp_codes
WHERE expires_at > now() ORDER BY created_at DESC LIMIT 10;

-- Idempotency-cache
SELECT * FROM idempotency_keys WHERE expires_at > now();
```
