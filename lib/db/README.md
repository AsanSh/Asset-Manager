# Database schema (source of truth)

Все Drizzle-таблицы и клиент `db`/`pool` — **только** в `lib/db/src/`.

| Что | Где |
|-----|-----|
| Схема | `lib/db/src/schema/` |
| Клиент БД | `lib/db/src/index.ts` |
| Seed (dev) | `lib/db/src/seed.ts` — `pnpm --filter @workspace/db seed` |
| Миграции | `artifacts/api-server/drizzle/migrations/` |
| Generate | `cd artifacts/api-server && npx drizzle-kit generate --config drizzle.config.ts --name …` |

`artifacts/api-server/src/lib/db/` — **тонкие re-export**, без дубликатов:

- `index.ts` → `lib/db/src/index.ts`
- `schema/index.ts` → `lib/db/src/schema/index.ts`

Не добавлять таблицы и `Pool` под `api-server/src/lib/db/`.
