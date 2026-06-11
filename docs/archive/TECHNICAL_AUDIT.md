# BuildFlow — Техническое ТЗ-Аудит платформы
**Дата:** 06 апреля 2026  
**Версия системы:** MVP (в разработке)

---

## 1. Обзор системы

**BuildFlow** — B2B SaaS PropTech-платформа для девелоперских и управляющих компаний Кыргызстана. Позволяет вести учёт объектов недвижимости, управлять арендой, отслеживать начисления и платежи, формировать отчёты.

**Целевая аудитория:** строительные компании, УК, девелоперы (ОсОО, ЗАО) в КР.  
**Валюта:** KGS (Кыргызский сом).  
**Язык UI:** Русский.

---

## 2. Архитектура

### 2.1 Монорепозиторий (pnpm workspaces)

```
workspace/
├── artifacts/
│   ├── api-server/          Express 5 + TypeScript, порт 8080
│   ├── proptech/            React 18 + Vite (веб-клиент)
│   └── buildflow-mobile/    Expo React Native (мобильное приложение)
├── lib/
│   ├── db/                  Drizzle ORM + PostgreSQL схема
│   ├── api-client-react/    Сгенерированный клиент (React Query hooks)
│   └── api-zod/             Zod-схемы для валидации
```

### 2.2 Стек технологий

| Слой | Технология |
|------|-----------|
| База данных | PostgreSQL (Replit managed) |
| ORM | Drizzle ORM с `drizzle-zod` |
| Backend | Express 5, TypeScript, pino (логи) |
| API-клиент | Orval-генерация (React Query hooks) |
| Веб-фронт | React 18, Vite, TailwindCSS, shadcn/ui |
| Мобайл | Expo SDK, React Native |
| Аутентификация | Bearer-токен, сессии в БД (PostgreSQL) |
| Деплой | Replit (dev); production через Replit Deployments |

### 2.3 Multi-tenancy

Все таблицы содержат `company_id`. Middleware `requireAuth` устанавливает `req.companyId` из сессии — все SQL-запросы фильтруются по нему. **Изоляция данных реализована на уровне каждого запроса.**

---

## 3. База данных — Схема (18 таблиц)

### 3.1 Таблица: `companies`
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| name | text NOT NULL | Название компании |
| inn | text | ИНН/ИНО |
| address | text | Адрес |
| phone | text | |
| email | text | |
| created_at | timestamp TZ | |

### 3.2 Таблица: `users`
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | FK → companies |
| email | text UNIQUE NOT NULL | Логин |
| password_hash | text NOT NULL | bcrypt-хэш |
| first_name | text NOT NULL | |
| last_name | text NOT NULL | |
| role | text NOT NULL DEFAULT 'staff' | admin / rental_manager / finance / staff / company_admin / sales_manager |
| is_active | boolean NOT NULL DEFAULT true | Блокировка аккаунта |
| created_at / updated_at | timestamp TZ | |

### 3.3 Таблица: `sessions`
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| user_id | integer NOT NULL | FK → users |
| token | text UNIQUE NOT NULL | Bearer-токен (random UUID) |
| created_at | timestamp TZ | |

**Примечание:** срок истечения сессий не реализован — токены живут вечно.

### 3.4 Таблица: `properties` (объекты недвижимости)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | FK → companies |
| project_name | text NOT NULL | Название ЖК/проекта |
| block | text | Блок / секция |
| floor | integer | Этаж |
| unit_number | text NOT NULL | Номер квартиры / помещения |
| type | text DEFAULT 'apartment' | apartment / commercial / parking / office |
| area | numeric(10,2) | Площадь, кв.м |
| status | text DEFAULT 'available' | available / sold / reserved |
| rental_status | text | free / rented / overdue |
| comment | text | |
| external_id / source_type / sync_status | text | Для импорта из внешних систем |
| last_synced_at | timestamp TZ | |

### 3.5 Таблица: `tenants` (арендаторы)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| full_name | text NOT NULL | ФИО |
| phone | text | |
| email | text | |
| iin | text | ИНН физ/юр лица |
| status | text DEFAULT 'active' | active / inactive / blacklisted |
| comment | text | |

### 3.6 Таблица: `lease_contracts` (договоры аренды)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| property_id | integer NOT NULL | FK → properties |
| tenant_id | integer NOT NULL | FK → tenants |
| contract_number | text NOT NULL | Номер договора |
| sign_date | text | Дата подписания |
| start_date | text NOT NULL | Дата начала начислений |
| end_date | text | Дата окончания |
| rent_amount | numeric(14,2) NOT NULL | Месячная ставка аренды |
| currency | text DEFAULT 'KGS' | |
| deposit_amount | numeric(14,2) | Сумма залога |
| accrual_day | integer | День месяца для срока оплаты |
| status | text DEFAULT 'draft' | draft / active / completed / terminated |
| comment | text | |
| grace_period_days | integer DEFAULT 0 | Льготный период (дней) |
| discount_type | text | Тип скидки на уровне договора |
| discount_value | numeric(10,2) | Значение скидки |
| discount_reason | text | |
| utilities_mode | text DEFAULT 'included' | Режим коммунальных платежей |

### 3.7 Таблица: `accruals` (начисления)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| lease_contract_id | integer NOT NULL | FK → lease_contracts |
| period | text NOT NULL | Формат YYYY-MM |
| accrual_type | text DEFAULT 'rent' | rent / utility / penalty |
| amount | numeric(14,2) NOT NULL | Начисленная сумма |
| currency | text DEFAULT 'KGS' | |
| due_date | text NOT NULL | Срок оплаты |
| paid_amount | numeric(14,2) DEFAULT 0 | Уже оплачено |
| balance | numeric(14,2) DEFAULT 0 | Остаток к оплате |
| status | text DEFAULT 'pending' | pending / approved / partial / paid / overdue / cancelled |
| discount_type | text | percent / fixed / grace |
| discount_amount | numeric(14,2) | |
| discount_reason | text | |
| grace_period_days | integer | |
| notes | text | |

### 3.8 Таблица: `payments` (платежи)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| lease_contract_id | integer NOT NULL | |
| accrual_id | integer | (legacy, не используется — заменён allocations) |
| amount | numeric(14,2) NOT NULL | |
| currency | text DEFAULT 'KZT' | ⚠️ БАГ: захардкожен KZT вместо KGS |
| payment_date | text NOT NULL | |
| payment_method | text | cash / bank / card / transfer |
| note | text | |

### 3.9 Таблица: `payment_allocations` (распределение платежей)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| payment_id | integer NOT NULL | FK → payments |
| accrual_id | integer NOT NULL | FK → accruals |
| amount | numeric(14,2) NOT NULL | Сумма распределения |
| note | text | |

### 3.10 Таблица: `deposits` (залоги)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| lease_contract_id | integer NOT NULL | |
| amount | numeric(14,2) NOT NULL | |
| currency | text DEFAULT 'KZT' | ⚠️ БАГ: KZT вместо KGS |
| status | text DEFAULT 'held' | held / returned / applied |
| received_date | text NOT NULL | |
| returned_amount | numeric(14,2) | |
| returned_date | text | |
| note | text | |

### 3.11 Таблица: `expenses` (расходы)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| property_id | integer NOT NULL | |
| lease_contract_id | integer | (необязательный) |
| category | text DEFAULT 'other' | maintenance / repair / utility / management / other |
| amount | numeric(14,2) NOT NULL | |
| currency | text DEFAULT 'KZT' | ⚠️ БАГ: KZT вместо KGS |
| expense_date | text NOT NULL | |
| description | text | |

### 3.12 Таблица: `owner_statements` (отчёты собственнику)
| Поле | Тип | Описание |
|------|-----|---------|
| id | serial PK | |
| company_id | integer | |
| property_id | integer NOT NULL | |
| period | text NOT NULL | YYYY-MM |
| total_income | numeric(14,2) | |
| total_expenses | numeric(14,2) | |
| net_income | numeric(14,2) | |
| management_fee | numeric(14,2) | |
| owner_payout | numeric(14,2) | |
| status | text | draft / sent / confirmed |
| generated_at | timestamp TZ | |

### 3.13 Таблица: `module_settings`
| Поле | Тип | Описание |
|------|-----|---------|
| company_id | integer NOT NULL | |
| module_key | text NOT NULL | rental / sales / reports / notifications / crm / maintenance / analytics / documents |
| is_enabled | boolean DEFAULT false | |
| enabled_at | timestamp TZ | |
| settings | text | JSON-строка для будущих настроек модуля |

### 3.14 Таблица: `counterparties` (контрагенты)
Подрядчики, поставщики, партнёры. Отдельно от арендаторов.

### 3.15 Таблица: `contracts` (общие договоры)
Закупочные / подрядные договоры (не аренда). Отдельный модуль.

### 3.16 Таблица: `documents`
Хранение метаданных документов (ссылки на файлы).

### 3.17 Таблица: `import_jobs`
Задачи импорта данных из внешних источников.

### 3.18 Таблица: `activity_log`
Журнал действий пользователей в системе.

---

## 4. Backend API — Полный перечень эндпоинтов

### Аутентификация (`/auth`)
| Метод | Путь | Описание | Auth |
|-------|------|---------|------|
| POST | `/auth/login` | Вход (email + password), возвращает Bearer-токен | — |
| POST | `/auth/register` | Регистрация новой компании + первого администратора | — |
| POST | `/auth/logout` | Удаление сессии | ✅ |
| GET | `/auth/me` | Данные текущего пользователя | ✅ |

### Компании (`/companies`)
| Метод | Путь | Описание | Auth |
|-------|------|---------|------|
| GET | `/companies` | Список компаний | ✅ |
| POST | `/companies` | Создание компании | ✅ |
| PATCH | `/companies/:id` | Обновление | ✅ |

### Пользователи (`/users`)
| Метод | Путь | Описание | Auth |
|-------|------|---------|------|
| GET | `/users` | Список сотрудников компании | ✅ |
| POST | `/users` | Создание сотрудника | ✅ |
| PATCH | `/users/:id` | Обновление (имя, роль) | ✅ |
| DELETE | `/users/:id` | Удаление | ✅ |

### Объекты недвижимости (`/rental/properties`)
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/rental/properties` | Список с фильтрами (status, projectName) |
| POST | `/rental/properties` | Создание объекта |
| GET | `/rental/properties/:id/performance` | Доходность объекта |
| POST | `/rental/properties/:id/activate` | Активация |

### Арендаторы (`/rental/tenants`)
| Метод | Путь | |
|-------|------|--|
| GET | `/rental/tenants` | Список (фильтры: search, status) |
| POST | `/rental/tenants` | Создание |
| GET | `/rental/tenants/:id` | Детали |
| PATCH | `/rental/tenants/:id` | Обновление |
| DELETE | `/rental/tenants/:id` | Удаление |

### Договоры аренды (`/rental/contracts`)
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/rental/contracts` | Список (фильтры: propertyId, tenantId, status) |
| POST | `/rental/contracts` | Создание + авто-генерация начислений |
| GET | `/rental/contracts/:id` | Детали |
| PATCH | `/rental/contracts/:id` | Обновление |

### Начисления (`/rental/accruals`)
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/rental/accruals` | Список (фильтры: leaseContractId, status, month) |
| PATCH | `/rental/accruals/:id` | Изменение статуса, скидки, заметок |
| POST | `/rental/accruals/:id/discount` | Применение льготы (%, фикс, отсрочка) |
| POST | `/rental/accruals/recalculate` | Пересчёт начислений по договору (пропорционально) |

### Платежи (`/rental/payments`)
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/rental/payments` | Список платежей |
| POST | `/rental/payments` | Создание платежа с авто- или ручной аллокацией на начисления |

### Залоги (`/rental/deposits`)
| Метод | Путь | |
|-------|------|--|
| GET | `/rental/deposits` | |
| POST | `/rental/deposits` | |
| PATCH | `/rental/deposits/:id` | Статус, возврат |

### Расходы (`/rental/expenses`)
| Метод | Путь | |
|-------|------|--|
| GET | `/rental/expenses` | |
| POST | `/rental/expenses` | |

### Отчёты собственнику (`/rental/statements`)
| Метод | Путь | |
|-------|------|--|
| GET | `/rental/statements` | |
| POST | `/rental/statements/generate` | Генерация за период |

### Дашборд (`/dashboard`)
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/dashboard/summary` | KPI-сводка (объекты, арендаторы, баланс) |
| GET | `/dashboard/rental-overview` | Статусы объектов, топ должников, последние платежи |
| GET | `/dashboard/activity` | Лента активности |

### Отчёты (`/reports`)
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/reports/debt` | Задолженности арендаторов |
| GET | `/reports/rental-summary` | Сводка начислений/оплат за период |
| GET | `/reports/cashflow` | Денежный поток (доходы vs расходы) |
| GET | `/reports/payments` | История платежей с деталями |
| GET | `/reports/counterparties` | Активность контрагентов |

### Модули (`/modules`)
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/modules` | Список модулей с состоянием (вкл/выкл) |
| POST | `/modules/:key/toggle` | Переключение модуля (только admin) |
| GET | `/modules/enabled` | Список включённых ключей |

### Прочее
- `GET /health` — проверка работоспособности API
- `/counterparties` — CRUD контрагентов
- `/contracts` — CRUD общих договоров (не аренда)
- `/documents` — CRUD документов
- `/import` — импорт данных
- `/activity` — журнал действий

---

## 5. Бизнес-логика — Ключевые алгоритмы

### 5.1 Пропорциональное начисление (Proration)

При создании или пересчёте договора аренды автоматически генерируются начисления `buildAccrualRows()`:

- **Первый месяц:** если `startDate > 1-е число` → `amount = (rentAmount / daysInMonth) × daysRented`
- **Последний месяц:** если `endDate < последнее число` → `amount = (rentAmount / daysInMonth) × endDate.getDate()`
- **Один месяц (начало = конец):** пересчёт за фактические дни
- **Граница без endDate:** генерируется +12 месяцев вперёд

### 5.2 Аллокация платежей

При `POST /rental/payments`:
1. **Ручная** (передаётся `allocations[]`) — точное распределение суммы по указанным начислениям
2. **Авто** — остаток распределяется на самые старые начисления с `balance > 0` (FIFO по `due_date`)

После аллокации автоматически пересчитываются `paid_amount`, `balance` и `status` каждого начисления.

### 5.3 Льготы на начисление (Discount)

Три типа:
- **percent** — скидка % от суммы начисления
- **fixed** — фиксированная сумма скидки в KGS
- **grace** — отсрочка (сдвиг `due_date` на N дней)

Льгота пересчитывает `balance = max(0, amount - discount - paid)` и обновляет статус.

---

## 6. Фронтенд — Страницы веб-приложения

### 6.1 Реализованные страницы

| Страница | Файл | Статус | Размер |
|---------|------|--------|--------|
| Вход / Регистрация | login.tsx / register.tsx | ✅ Готово | — |
| Дашборд | dashboard.tsx | ✅ Готово | 247 стр |
| Объекты (портфель) | properties.tsx | ✅ Готово | 331 стр |
| Шахматка | ChessBoard.tsx | ✅ Готово | 245 стр |
| Арендаторы | rental/tenants.tsx | ✅ Готово | 272 стр |
| Договоры аренды | rental/leases.tsx | ✅ Готово | 777 стр |
| Начисления | rental/accruals.tsx | ✅ Готово | 675 стр |
| Платежи | rental/payments.tsx | ✅ Готово | 413 стр |
| Залоги | rental/deposits.tsx | ✅ Готово | 222 стр |
| Расходы | rental/expenses.tsx | ✅ Готово | 225 стр |
| Отчёты собственнику | rental/statements.tsx | ✅ Готово | 237 стр |
| Мини-дашборд аренды | rental/rental-dashboard.tsx | ✅ Готово | 263 стр |
| Объекты в аренде | rental/rental-properties.tsx | ⚠️ Stub | 88 стр |
| Отчёт: Долги | reports/DebtReport.tsx | ✅ Готово | 131 стр |
| Отчёт: Сводка | reports/RentalSummaryReport.tsx | ✅ Готово | 165 стр |
| Отчёт: Денежный поток | reports/CashflowReport.tsx | ✅ Готово | 174 стр |
| Отчёт: Платежи | reports/PaymentsReport.tsx | ✅ Готово | 141 стр |
| Контрагенты | counterparties.tsx | ✅ Готово | 421 стр |
| Компании | companies.tsx | ✅ Готово | 258 стр |
| Пользователи | users.tsx | ✅ Готово | 322 стр |
| Настройки | settings.tsx | ✅ Готово | 471 стр |
| Журнал активности | activity-log.tsx | ✅ Готово | 185 стр |
| Импорт данных | import-center.tsx | ⚠️ Частично | 473 стр |

---

## 7. Мобильное приложение (Expo)

### 7.1 Реализованные экраны

| Экран | Статус |
|-------|--------|
| Аутентификация (логин) | ✅ |
| Дашборд (главный) | ✅ |
| Объекты (список) | ✅ |
| Аренда (список договоров) | ✅ |
| Отчёты | ✅ |
| Профиль | ✅ |

**Стек:** Expo Router, React Native, собственный `lib/api.ts` для запросов.

---

## 8. Выявленные баги и проблемы

### 🔴 Критические

| # | Проблема | Файл | Решение |
|---|---------|------|---------|
| B-01 | `currency` в таблицах `payments`, `deposits`, `expenses` захардкожен как `'KZT'` вместо `'KGS'` | schema/payments.ts, deposits.ts, expenses.ts | Изменить DEFAULT на `'KGS'` + миграция |
| B-02 | Нет срока истечения сессий — токены живут вечно | sessions table | Добавить поле `expires_at`, cron-очистка |
| B-03 | `/reports/debt` — N+1 запросы: для каждого начисления делает отдельный SELECT на contract + tenant + property | reports.ts:37-40 | Batch-запросы через `inArray()`, как в dashboard |
| B-04 | `/reports/counterparties` — N+1 на каждого арендатора: loop с отдельными SELECT payments/accruals | reports.ts:218-241 | Агрегация через SQL JOIN или subquery |
| B-05 | При пересчёте начислений `recalculate` не удаляет `approved` начисления — только `pending` | rental.ts:255-260 | Удалять также `approved` или предупреждать |

### 🟡 Важные недоработки

| # | Проблема | Описание |
|---|---------|---------|
| W-01 | Нет внешних ключей (FK constraints) в БД | Drizzle-схема определяет связи только на уровне TypeScript, в PostgreSQL нет FOREIGN KEY — возможны «висячие» записи |
| W-02 | Нет индексов на `company_id`, `lease_contract_id`, `period` | При росте данных запросы замедлятся |
| W-03 | `accrualId` в таблице `payments` (legacy поле) не используется, но занимает место | Убрать или документировать |
| W-04 | Пароли: нет политики смены, нет сброса по email | |
| W-05 | `requireRole()` middleware существует, но используется только на `/modules/:key/toggle` — остальные защищённые роутеры открыты для любой роли | |
| W-06 | API-клиент (`api-client-react`) генерируется из OpenAPI-спецификации, но не синхронизирован с реальным API — часть хуков (useListCompanies, useGetMe и т.д.) сломана | Ручное обновление api.schemas.ts |
| W-07 | `rental-properties.tsx` — страница-заглушка (88 строк), нет функционала | |

### 🟢 Известные ограничения (технический долг)

| # | Ограничение |
|---|------------|
| L-01 | Коммунальные платежи (utilities_mode в договоре) — поле есть в схеме, но логика не реализована |
| L-02 | Пени за просрочку — поля нет, расчёт не реализован |
| L-03 | Уведомления арендаторам (SMS/email) — модуль определён, логика отсутствует |
| L-04 | CRM (воронка продаж) — модуль определён, страница отсутствует |
| L-05 | Аналитика/BI — модуль определён, страница отсутствует |
| L-06 | Электронный документооборот — файлы не хранятся, только метаданные |
| L-07 | Шахматка — реализована только читаемая версия, нет управления объектами прямо из неё |
| L-08 | Мобильное приложение — не подключено к полному API (только базовые запросы) |

---

## 9. Безопасность

| Аспект | Статус | Замечание |
|--------|--------|----------|
| Хэширование паролей | ✅ | bcrypt (предположительно) — нужно подтвердить в auth.ts |
| Multi-tenant изоляция | ✅ | companyId в каждом запросе |
| Bearer-токен авторизация | ✅ | Сессии в PostgreSQL |
| RBAC (роли) | ⚠️ | Только на 1 эндпоинте; требует расширения |
| Срок жизни токенов | ❌ | Не реализован |
| Rate limiting | ❌ | Не реализован |
| CSRF защита | N/A | SPA + Bearer, не нужен |
| SQL-инъекции | ✅ | Drizzle ORM с параметрами |
| XSS | ✅ | React экранирует вывод |
| HTTPS | ✅ | Через Replit proxy (mTLS) |
| Секреты в коде | ✅ | `SESSION_SECRET` через env-переменные |

---

## 10. Производительность

| Эндпоинт | Статус | Проблема |
|---------|--------|---------|
| `GET /dashboard/summary` | ✅ Оптимизирован | Promise.all() |
| `GET /dashboard/rental-overview` | ✅ Оптимизирован | inArray() batch |
| `GET /rental/contracts` | ⚠️ N+1 | Map-over с отдельными tenant/property запросами |
| `GET /reports/debt` | ❌ N+1 | Тяжёлый loop |
| `GET /reports/payments` | ❌ N+1 | Loop на каждый платёж |
| `GET /reports/counterparties` | ❌ N+1 | Loop на каждого арендатора |

---

## 11. Что нужно сделать (Backlog)

### Приоритет 1 — Исправить баги

- [ ] **B-01** Исправить дефолтную валюту в `payments`, `deposits`, `expenses` с KZT → KGS
- [ ] **B-03, B-04** Устранить N+1 в reports.ts
- [ ] **W-05** Добавить проверку ролей (RBAC) на финансовые операции

### Приоритет 2 — Завершить базовый функционал

- [ ] Срок истечения сессий (например, 30 дней) + кнопка "Выйти со всех устройств"
- [ ] Сброс пароля по email
- [ ] Индексы БД: `CREATE INDEX ON accruals(company_id)`, `(lease_contract_id)`, `(period)`, `(status)`
- [ ] Foreign Key constraints в Drizzle-схеме (`.references()`)
- [ ] Фильтрация начислений по периоду (месяц/год) прямо на странице
- [ ] Пагинация в таблицах (сейчас грузятся все записи)
- [ ] Доработать `rental-properties.tsx` (страница объектов в аренде)

### Приоритет 3 — Новые функции

- [ ] **Пени:** автоматический расчёт штрафа за просрочку (`overdue_days × daily_rate`)
- [ ] **Индексация ставки:** поле `rent_increase_type` (fixed/cpi) и дата следующего пересмотра
- [ ] **Коммунальные:** разделение на арендную ставку + коммунальные платежи
- [ ] **Уведомления:** интеграция SMS (Kyrgyzstan: Megacom/Beeline API) или email через SMTP
- [ ] **Экспорт:** выгрузка Excel/PDF для отчётов и выписок собственнику
- [ ] **Шахматка** — продажи с рассрочкой и статусами (забронировано / в сделке / продано)
- [ ] **CRM** — лиды, воронка продаж
- [ ] **Импорт объектов** из Excel (страница частично готова)

### Приоритет 4 — Инфраструктура

- [ ] Rate limiting (express-rate-limit)
- [ ] Полный API-клиент: переместить все вызовы из raw `fetch` в единый API-клиент
- [ ] Синхронизация OpenAPI → api-client-react (добавить generate script)
- [ ] E2E-тесты на критические пути (логин, создание договора, платёж)
- [ ] Логирование в activity_log для финансовых операций (создание платежа, изменение начисления)

---

## 12. Архитектурные решения, требующие обсуждения

1. **Хранение дат как TEXT** — все даты (`start_date`, `end_date`, `due_date` и т.д.) хранятся как `text` в формате YYYY-MM-DD. Это упрощает работу с фронтом, но снижает возможности SQL-фильтрации и сортировки. Рекомендуется: `date` тип PostgreSQL.

2. **Числа как строки** — `amount`, `balance`, `rent_amount` возвращаются как строки из PostgreSQL (`numeric` → string). В коде везде `parseFloat()`. Следует стандартизировать — либо сериализовать на бэке в Number, либо использовать Decimal.js.

3. **Отсутствие миграций** — схема применяется через `drizzle-kit push` (без version-controlled миграций). В production это риск: сложно откатить изменения.

4. **API-клиент устарел** — сгенерированный `api-client-react` не синхронизирован с реальными API. Фронт использует смесь: где-то hook из клиента, где-то raw `fetch` + `apiFetch()`. Необходимо либо полностью отказаться от генератора, либо настроить CI-генерацию.

---

## 13. Текущее тестовое окружение

- **URL (dev):** `https://<replit-domain>/__replco/workspace_iframe.html?initialPath=/&id=artifacts/proptech`
- **API:** порт 8080, проксируется через путь `/api`
- **Тестовый аккаунт:** `asan.kg@mail.ru` / `asankg` — компания ОсОО "СмартСтрой" (companyId=3)
- **БД:** PostgreSQL (Replit managed), одна база для dev и нет отдельного prod (при деплое нужно разделить)
