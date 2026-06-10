# TASKS — рабочий план

Порядок списка = порядок исполнения. Не делать нижнее раньше верхнего.

## Сегодня (фундамент, ~2 часа) — блокеры demo-path

- [ ] **1. Схема в api-server.** Решить судьбу инлайна из коммита `bfb0fa2`: либо `git add` всех ~90 untracked-файлов `artifacts/api-server/src/lib/db/schema/` + коммит, либо откат к импорту из `lib/db`. Одно из двух. Проверить, что `pnpm build` проходит и `proptech-api` собирается из git.
- [ ] **2. Ключ деплоя.** Убрать `.ssh/deploy_key` из папки проекта в `~/.ssh/`. Проверить, что `.gitignore` покрывает `.ssh/` и `.env*` — работает автопуш, утечка ключа — вопрос времени.
- [ ] **3. Env на `proptech-api`** (production + preview): `NIKITA_SMS_LOGIN`, `NIKITA_SMS_PWD`, `NIKITA_SMS_SENDER`, `SENTRY_DSN`, `CRON_SECRET`. Установить `@sentry/node` в api-server (`pnpm add @sentry/node`) — сейчас `sentry.ts` заглушка.
- [ ] **4. Neon-консоль.** Найти боевой бранч (реальные `users`, сегодняшние коннекты), сравнить хост с `ep-icy-mouse-appigv0u` (domiq-api). Совпал — убрать `DATABASE_URL` у `domiq-api` или переключить его фронт на основной API.
- [ ] **5. Vercel → `proptech` → Settings → Git → Production Branch = `legacy/proptech`** (если ещё не сделано). Ручной шаг в UI.

## На этой неделе (консолидация)

- [ ] **6. Правда по базе.** Скопировать connection string боевого Neon-бранча и явно перезаписать `DATABASE_URL` в `proptech-api`. Переключить `VITE_API_URL` обоих фронтов (нового и legacy) на `proptech-api`, передеплоить, проверить логин и шахматку руками на обоих.
- [ ] **7. Удалить лишние Vercel-проекты:** `dist`, `planalitycai`, `api-server` (после п.6, когда на него никто не смотрит). `domiq`/`domiq-api` — по итогам п.4.
- [ ] **8. Правило в `.cursor/rules`:** пока жива legacy-ветка — изменения API только аддитивные; никаких переименований и удалений полей/эндпоинтов; миграции только с `IF NOT EXISTS` / без DROP.
- [ ] **9. Перенос из Replit-копии:** barter и client-relations — как **новые миграции 0034+** и файлы поверх main, не копированием 0031–0033. Конфликт моделей цены юнита: живёт модель из main (`sale_coefficient`, `approved_sale_price_per_sqm`), реплитовская (`base_sale_price_per_sqm` + `price_coefficient`) умирает. После переноса Replit-окружение — read-only архив.
- [ ] **10. Корень репо:** 10+ устаревших MD-статусов → `docs/archive/`.

## После демо (долг, не раньше)

- [ ] **11. Baseline миграций:** `drizzle-kit introspect` против боевой базы → новый снапшот → дальше только `drizzle-kit generate`. Никаких рукописных SQL и фейковых timestamps в журнале.
- [ ] **12. Схлопнуть двойную схему** `lib/db` ↔ `artifacts/api-server/src/lib/db` в один источник (выбор зависит от решения в п.1).
- [ ] **13. 10–15 интеграционных тестов на финансовое ядро:** payment-allocation, finance-reconciliation, payroll-расчёт, accruals — до того, как клиенты нальют реальные данные.
- [ ] **14. Хеширование сессионных токенов** перед хранением в `sessions`.
- [ ] **15. Дата пересадки legacy-клиента на новый UI** → удаление ветки `legacy/proptech` и проекта `proptech`.

## Контекст

- Пункты 1–5 — блокеры demo-path: без них SMS-вход не работает, API деплоится из неопределённого состояния, ключ лежит под автопушем.
- Только после п.6 возвращаться к 14-дневному плану демо: шахматка → Excel-импорт → 1С → rental → прогон.
- Деплой фронтов: `./deploy/frontend-legacy.sh` (старый UI, ветка `legacy/proptech`) и `./deploy/frontend-new.sh` (новый UI, `main`). Подробности — `.cursor/rules/vercel-deploy-production.mdc`.
