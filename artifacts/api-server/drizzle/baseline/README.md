# Baseline миграций (п.11)

## Источник правды

1. **TypeScript-схема:** `lib/db/src/schema/` — единственный источник для `drizzle-kit generate`.
2. **Проверка против prod:** `drizzle-kit introspect` (BuildFlow / `production`) → `introspect-prod/schema.ts` (снимок, не импортировать в runtime).

## Рабочий процесс (после baseline)

```bash
cd artifacts/api-server
export DATABASE_URL='…'   # prod или dev

npx drizzle-kit check --config drizzle.config.ts
npx drizzle-kit generate --config drizzle.config.ts --name descriptive_name
# миграции на prod — вручную через Neon, не drizzle-kit migrate в CI
```

Запрещено: рукописные `.sql` в `drizzle/migrations/` и фейковые `when` в `_journal.json`.

## Prod-переход

При деплое API `runMigrations()`:

- **Новая БД** — выполняет `0000_prod_baseline.sql`.
- **Legacy prod** (таблица `companies` уже есть) — вставляет hash baseline в `drizzle.__drizzle_migrations` без повторного CREATE (см. `src/lib/migrate.ts`).

Ручной fallback (если нужен): `drizzle/baseline/mark-prod-baseline.sql`.
