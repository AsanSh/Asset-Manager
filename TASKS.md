# TASKS — рабочий план

Порядок списка = порядок исполнения. Не делать нижнее раньше верхнего.

## Сегодня (фундамент, ~2 часа) — блокеры demo-path

- [x] **1. Схема в api-server.** ✅ Инлайн-схемы из `bfb0fa2` не обнаружено: `api-server` импортирует схему из `lib/db`, untracked-файлов `src/lib/db/schema/` нет. `npm run build` (esbuild) проходит.
- [x] **2. Ключ деплоя.** ✅ `deploy_key` в проекте не найден (поиск по всему дереву). `.gitignore` дополнен: `.ssh/`, `*.pem`, `id_rsa*`, `.env*` покрыты.
- [x] **3. Env на `proptech-api`.** ✅ `CRON_SECRET` сгенерирован и установлен (production + preview, через REST API). `@sentry/node` уже установлен, `sentry.ts` — рабочая динамическая интеграция, не заглушка. ⚠️ **Нужны от пользователя:** значения `SENTRY_DSN` (из Sentry dashboard) и `NIKITA_SMS_LOGIN` / `NIKITA_SMS_PWD` / `NIKITA_SMS_SENDER` (из кабинета smspro.nikita.kg) — они sensitive и нигде программно не читаются.
- [x] **4. Neon-консоль.** ✅ Боевой бранч: проект **BuildFlow**, ветка `production`, хост `ep-wandering-boat-apx68ayh` — 16 users (последний 2026-06-08), 6 свежих сессий. Хост `ep-icy-mouse-appigv0u` (domiq-api) — это **другой** проект `neon-amber-clock` (2 users, тестовая копия). Хосты **не совпали** → по условию задачи действий с `domiq-api` не требуется; судьба `domiq`/`domiq-api` решается в п.7.
- [x] **5. Vercel `proptech` Production Branch.** ✅ Проект `proptech` **не подключён к Git** (деплои только через CLI из ветки `legacy/proptech`, последний — `legacy/proptech@1708739`). Push в `main` не может его перезаписать — риск отсутствует. Если позже подключать Git, выставить Production Branch = `legacy/proptech`.

## На этой неделе (консолидация)

- [x] **6. Правда по базе.** ✅ `DATABASE_URL` в `proptech-api` (production + preview) перезаписан на боевой бранч BuildFlow/`production` (`ep-wandering-boat-apx68ayh`), API передеплоен (`vercel redeploy --scope`, alias `proptech-api.vercel.app` + `api-server-rho-six.vercel.app`, оба `/health` → 200). Логин-эндпоинт ходит в базу: `POST /auth/login` с неверным паролем → 401 (не 500). Бандлы обоих фронтов уже содержат `https://proptech-api.vercel.app` — передеплой фронтов не нужен. ⚠️ **Ручная проверка пользователем:** логин и шахматка на обоих UI (нужны реальные креды).
- [x] **7. Удалить лишние Vercel-проекты.** ✅ Удалены `dist`, `planalitycai`, `api-server` (alias `api-server-rho-six.vercel.app` → 404). Перед удалением: fallback в `crm.ts` и `VITE_API_URL` в `artifacts/proptech/vercel.json` переведены на `https://proptech-api.vercel.app`, API передеплоен (prebuilt), внешних webhook'ов на старый домен в боевой базе нет (`module_settings` пуст), живые бандлы обоих фронтов `rho-six` не содержат. Smoke: `proptech-api/health` 200, login c неверным паролем 401, оба фронта 200. `domiq`/`domiq-api` оставлены (смотрят на тестовую БД `neon-amber-clock`, с продом не связаны). Правило `.cursor/rules/vercel-deploy-production.mdc` обновлено под новый URL и prebuilt-сценарий деплоя.
- [x] **8. Правило в `.cursor/rules`.** ✅ Создано `.cursor/rules/legacy-api-compat.mdc` (alwaysApply): только аддитивные изменения API, запрет переименований/удалений полей и эндпоинтов, миграции только `IF NOT EXISTS` / без DROP, паттерн «двойной записи» для переименований колонок. Правило самоликвидируется после п.15.
- [x] **9. Перенос из Replit-копии.** ✅ Уже в `main` (коммиты `24902e3` MVP sales/client-relations, `09e6b10` barter): миграции 0031–0033, schema/API/UI, таблицы в боевой базе. Итоговая модель цены — реплитовская (`base_sale_price_per_sqm` + `price_coefficient` + `price_approved*`), не «sale_coefficient» (в prod её никогда не было). Убраны мёртвые поля `saleCoefficient`/`approvedSalePricePerSqm` из фронта. Replit-копия `~/Desktop/4Project/Asset-Manager-server-20260611` — read-only архив, не источник правды.
- [x] **10. Корень репо.** ✅ 27 устаревших MD-статусов перенесены в `docs/archive/` (Replit/агентские отчёты 2025–2026). В корне остались только `TASKS.md`, `CLAUDE.md`, `PRODUCTION-OPERATIONS.md`. Добавлен `docs/archive/README.md`.

## После демо (долг, не раньше)

- [x] **11. Baseline миграций:** ✅ `drizzle-kit introspect` против BuildFlow/production (98 таблиц); `drizzle-kit generate` → `0000_prod_baseline` + `meta/0000_snapshot.json`. Legacy 0000–0033 в `drizzle/migrations/_legacy/`. Снимок introspect: `drizzle/baseline/introspect-prod/`. `runMigrations()` помечает baseline на prod без повторного CREATE. Дальше только `drizzle-kit generate`.
- [ ] **12. Схлопнуть двойную схему** `lib/db` ↔ `artifacts/api-server/src/lib/db` в один источник (выбор зависит от решения в п.1).
- [ ] **13. 10–15 интеграционных тестов на финансовое ядро:** payment-allocation, finance-reconciliation, payroll-расчёт, accruals — до того, как клиенты нальют реальные данные.
- [ ] **14. Хеширование сессионных токенов** перед хранением в `sessions`.
- [ ] **15. Дата пересадки legacy-клиента на новый UI** → удаление ветки `legacy/proptech` и проекта `proptech`.

## Контекст

- Пункты 1–5 — блокеры demo-path: без них SMS-вход не работает, API деплоится из неопределённого состояния, ключ лежит под автопушем.
- Только после п.6 возвращаться к 14-дневному плану демо: шахматка → Excel-импорт → 1С → rental → прогон.
- Деплой фронтов: `./deploy/frontend-legacy.sh` (старый UI, ветка `legacy/proptech`) и `./deploy/frontend-new.sh` (новый UI, `main`). Подробности — `.cursor/rules/vercel-deploy-production.mdc`.
