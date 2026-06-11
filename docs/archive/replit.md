# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: BuildFlow PropTech Platform

A comprehensive PropTech platform for property and rental management, targeting construction companies and real estate developers in Kazakhstan. Full-stack app with React+Vite frontend, Express 5 backend, PostgreSQL with Drizzle ORM.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, wouter routing, TanStack Query

## Packages

- `artifacts/api-server` — Express 5 API server (port 8080)
- `artifacts/proptech` — React+Vite frontend
- `lib/db` — Drizzle ORM schema + migrations
- `lib/api-spec` — OpenAPI YAML specification
- `lib/api-client-react` — Auto-generated React hooks from OpenAPI spec

## Key Commands

```bash
# Run DB push
pnpm --filter @workspace/db run push

# Run DB seed
cd lib/db && /path/to/tsx src/seed.ts

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-client-react run codegen

# Build API server
pnpm --filter @workspace/api-server run build
```

## Construction Module — COMPLETED ✅

10 fully working pages with real API backend:
- **Dashboard** — KPIs, budget progress, project summary
- **Projects** — building type/construction type/floors/units/area, cost per sqm with multi-currency + bank rate selection, auto-calculated cost in KGS
- **Stages** — progress bars, dates, budget per stage
- **Tasks** — Kanban columns (todo/in_progress/review/done), priority, quick status change
- **Workers** — brigades, specializations, daily rates, project assignment
- **Contractors** — type (company/IP), star rating, contract details
- **Materials** — categories, units, quantity × price calculation, delivery status
- **Budget** — grouped by category, plan vs actual with progress bars, multi-currency
- **Expenses** — multi-currency with bank rate source (НБКР/Optima/RSB/Bakai/DoBank/MBank), auto KGS conversion
- **Chess (Шахматка)** — visual floor grid, bulk generation, status colors (available/reserved/sold/occupied)
- **Reports** — budget vs actual, task completion, sales summary

API: `/api/construction/*` with full CRUD for all 10 entities.
DB: 10 tables (`construction_projects`, `construction_stages`, `construction_tasks`, `construction_workers`, `construction_contractors`, `construction_materials`, `construction_budget_items`, `construction_expenses`, `construction_units`, `currency_rates`).

## Database Schema (27+ tables)

- `companies` — Construction companies
- `users` — System users with roles (admin, manager, staff)
- `counterparties` — Buyers/clients with `category` field (tenant/buyer/supplier/contractor/owner/other)
- `properties` — Real estate units (apartment, office, commercial, etc.) with floor/block/projectName
- `contracts` — Sales contracts
- `documents` — Document attachments
- `import_jobs` — Excel import batch jobs
- `tenants` — Rental tenants
- `lease_contracts` — Rental lease contracts with discount/grace period fields
- `accruals` — Monthly rental accruals with льготы (discountType, discountAmount, discountReason, gracePeriodDays)
- `payments` — Rent payments
- `payment_allocations` — Links payments to specific accruals with amounts (partial payment support)
- `deposits` — Security deposits
- `expenses` — Property expenses
- `owner_statements` — Owner financial statements
- `activity_log` — System activity log
- `module_settings` — Per-company module enable/disable flags

## Authentication & Multi-Tenancy (SaaS)

- **Registration**: `POST /auth/register` creates company + admin user atomically; returns JWT token
- Session-based auth using in-memory Map; token → userId → companyId
- Passwords hashed with SHA-256 + "proptech_salt"
- Default admin: `admin@buildflow.kz` / `admin123`
- **Middleware**: `requireAuth` — validates token, sets req.userId/companyId/userRole; `requireRole("admin")` — role guard
- **Tenant isolation**: ALL data routes filter by `companyId` from session; users can only see their own org's data
- **Roles**: admin (full CRUD + user management), manager/staff (read + limited write)

## API Routes

All routes require `Authorization: Bearer <token>` (via `requireAuth` middleware).
Registered under `artifacts/api-server/src/routes/`:
- `auth.ts` — Login, logout, register (create org+admin), /auth/me
- `companies.ts` — GET/PATCH /companies/my (org settings); cross-tenant access forbidden
- `users.ts` — Org-scoped user management; admin-only create/update/delete
- `counterparties.ts` — CRUD, filtered by companyId
- `properties.ts` — CRUD, filtered by companyId
- `contracts.ts` — CRUD, filtered by companyId
- `documents.ts` — CRUD, filtered by companyId
- `import.ts` — Excel import (preview + commit), filtered by companyId
- `rental.ts` — Tenants, leases, accruals (with льготы via POST /accruals/:id/discount), payments (with smart auto/manual allocation to accruals), deposits, expenses, statements, rental-properties — all filtered by companyId. Includes `buildAccrualRows()` helper with proration: first/last month calculated proportionally if startDate/endDate not on 1st/last day.
- `dashboard.ts` — Summary stats, activity feed, rental overview — filtered by companyId
- `activity.ts` — Activity log (GET/POST), filtered by companyId
- `reports.ts` — GET /reports/debt, /reports/rental-summary, /reports/cashflow, /reports/payments, /reports/counterparties — all filtered by companyId
- `modules.ts` — GET /modules (list with enabled status), POST /modules/:key/toggle, GET /modules/enabled

## Frontend Pages

Under `artifacts/proptech/src/pages/`:
- `login.tsx` — Authentication (with "Зарегистрировать компанию" link)
- `register.tsx` — 2-step SaaS registration (org data → admin data)
- `settings.tsx` — Org settings (admin: edit company; any user: view profile)
- `dashboard.tsx` — Main analytics dashboard (KPI + AI recommendations + recent ops)
- `companies.tsx` — Company management
- `users.tsx` — User management (admin-only create/edit/delete)
- `properties.tsx` — Property management (реестр объектов)
- `counterparties.tsx` — Counterparty/client management (full CRUD)
- `import-center.tsx` — Excel Import Center (XLSX upload, preview, validate, commit, history)
- `activity-log.tsx` — System activity log (grouped by date, filterable)
- `rental/rental-dashboard.tsx` — Rental-specific dashboard (KPI + pending accruals + recent payments)
- `rental/tenants.tsx` — Tenant management (CRUD)
- `rental/leases.tsx` — Lease contract management: create/edit dialogs, row actions (edit, recalculate), proration preview showing first/last month amounts when dates are mid-month
- `rental/accruals.tsx` — Monthly accruals (approve/cancel + Льгота button opens discount dialog)
- `rental/payments.tsx` — Payment registration with auto/manual allocation to open accruals
- `rental/deposits.tsx` — Deposit management
- `rental/expenses.tsx` — Property expense tracking
- `rental/rental-properties.tsx` — Rental property overview
- `rental/statements.tsx` — Owner statements (generate + list)
- `ChessBoard.tsx` — Visual grid of properties by project/block/floor with status colors
- `reports/DebtReport.tsx` — Debt/overdue report (by contract)
- `reports/RentalSummaryReport.tsx` — Monthly rental summary (charged vs paid, collection rate)
- `reports/CashflowReport.tsx` — Cash flow (inflow vs outflow by month)
- `reports/PaymentsReport.tsx` — Payment history with allocation detail

## Sidebar Navigation Groups

- (ungrouped): Рабочий стол
- Аренда: Дашборд аренды, Объекты, Арендаторы, Договоры
- Финансы: Начисления, Платежи, Депозиты, Расходы, Акты собственников
- Справочник: Контрагенты, Шахматка (/properties/chess), Реестр объектов, Сотрудники
- Отчёты: Задолженность, Сводка аренды, Денежный поток, История платежей
- Система: Центр импорта, Лог активности, Настройки

## Seeded Data

- 1 company: BuildFlow KZ
- 1 admin user: admin@buildflow.kz
- 2 counterparties: Иванов Иван Иванович, ТОО "Казстрой Инвест"
- 4 properties: А-101 (available), Б-205 (sold), О-301 (office), В-403 (reserved)
- 2 tenants: Петров Петр Петрович, Садыкова Айгерим Болатовна

## Notifications & Chat

- DB tables: `notifications` (per-user, per-company), `messages` (user-to-user)
- API routes: `/notifications` (CRUD + read-all), `/messages` (conversations, thread, send, unread-count)
- Frontend components: `notifications-panel.tsx` (dropdown, tabs, icons), `chat-panel.tsx` (conversations, thread, new-chat search)
- Both panels integrated into `layout.tsx` header
- Default app route is `/rental/dashboard` (Аренда module)

## Notes

- All numeric DB fields use `numeric()` type, returned as strings — parse with `parseFloat()` in routes
- Default currency: KGS (Kyrgyz Som) — formatCurrency uses ru-KG locale
- Frontend uses `wouter` for routing with `import.meta.env.BASE_URL` base path
- API server listens on port 8080 (set via `PORT` env var)
