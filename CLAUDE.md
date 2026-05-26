# CLAUDE.md

Project instructions for AI agents in this repo.

## Rules (source of truth)

| Topic | File |
|-------|------|
| Assumptions, success criteria, dead code | [.cursor/rules/agent-execution.mdc](.cursor/rules/agent-execution.mdc) |
| DB, auth, migrations, destructive ops | [.cursor/rules/project-safety.mdc](.cursor/rules/project-safety.mdc) |
| Simplicity, surgical diffs, scope | Cursor **user rules** (global) |

Do not duplicate those guidelines here.

## Stack (Asset-Manager)

- **Frontend:** `artifacts/proptech` — React, Vite, TanStack Query, Orval api-client
- **API:** `artifacts/api-server` — Express, Drizzle, Vercel serverless
- **Shared schemas (legacy duplicate):** `lib/db` vs `artifacts/api-server/src/lib/db` — runtime uses api-server copy

## Deploy

- Frontend: `artifacts/proptech` → Vercel (`proptech-sigma-eight.vercel.app`)
- API: `artifacts/api-server` → Vercel
