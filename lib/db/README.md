# Database schema (source of truth)

All Drizzle table definitions live in `lib/db/src/schema/`.

- **Runtime:** `artifacts/api-server` imports via `@workspace/db` / `@workspace/db/schema`.
- **Migrations:** run from `lib/db` (`pnpm --filter @workspace/db push`) or `artifacts/api-server` drizzle config (points here).

Do not duplicate schema files under `api-server/src/lib/db/schema/` — only the re-export `index.ts` remains.
