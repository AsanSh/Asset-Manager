# Database schema (source of truth)

All Drizzle table definitions live in `lib/db/src/schema/`.

- **Runtime:** `artifacts/api-server` imports via `@workspace/db` / `@workspace/db/schema`.
- **Migrations:** `artifacts/api-server/drizzle/migrations/` — baseline `0000_prod_baseline` + архив `_legacy/`.
- **Generate:** только `cd artifacts/api-server && npx drizzle-kit generate --config drizzle.config.ts --name …`.
- **Introspect prod:** `npx drizzle-kit introspect --config drizzle.config.ts` → снимок в `drizzle/baseline/introspect-prod/` (не в `migrations/`).

Do not duplicate schema files under `api-server/src/lib/db/schema/` — only the re-export `index.ts` remains.
