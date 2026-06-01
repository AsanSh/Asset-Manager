# Architecture V2 — PropTech ERP для девелопера

> Статус: **draft v1** для согласования  
> Дата: 2026-05-31  
> Принцип: **расширять, не ломать**. `company_id` = холдинг/tenant навсегда.

---

## 1. Целевая модель

```
Холдинг (companies)
 ├── legal_entities (ОсОО)          ← уже есть
 ├── projects                        ← уже есть
 ├── project_legal_entities (M:N)    ← NEW
 ├── counterparties (Master Data)    ← уже есть, categories[]
 │
 ├── Integration Layer               ← NEW (единый контур импорта)
 ├── Finance Reconciliation          ← ~40%, расширить
 │
 ├── Construction (этапы, бюджет L1-L3)
 ├── Supply Chain (снабжение)        ← NEW, параллельно warehouse
 ├── CRM / Sales
 ├── Rental / Investors
 └── Platform Catalog (global)       ← NEW, cross-tenant read
      └── supplier_products (tenant) ← NEW, per company
```

**Не делаем:** BIM, AI-сметчик, Gectaro-клон, bidirectional 1С на старте.

---

## 2. Global Catalog — предложение

### 2.1. Проблема

Один товар = много названий у поставщиков. Без канонического SKU matching в маркетплейсе и plan-fact не работает.

### 2.2. Два слоя (ключевое решение)

| Слой | Scope | Кто владеет |
|------|-------|-------------|
| **Platform catalog** | Cross-tenant | Platform admin / модерация |
| **Supplier catalog** | Per `company_id` | Снабженец / поставщик |

**Почему не только tenant-catalog:** маркетплейс B2B требует общих SKU для matching «Арматура d12» ↔ «Арм 12 A500» между разными девелоперами. Иначе каждая компания изобретает свой справочник.

**Почему не только platform:** цены, условия, отсрочка — всегда per supplier per tenant.

### 2.3. Таблицы

```sql
-- PLATFORM (без company_id)
global_product_categories (
  id, parent_id nullable, slug, name_ru, sort_order, is_active
)

global_products (
  id,
  category_id,
  canonical_name,           -- "Арматура A500C Ø12"
  slug,
  unit_default,             -- 'т', 'м³', 'шт'
  attributes_schema jsonb,  -- JSON Schema для атрибутов категории
  attributes jsonb,         -- { "diameter_mm": 12, "steel_class": "A500C" }
  search_vector tsvector,   -- full-text для matching
  status,                   -- draft | active | deprecated
  created_at, updated_at
)

global_product_aliases (
  id, global_product_id, alias text, source  -- 'supplier_import' | 'manual'
)

-- TENANT
supplier_products (
  id,
  company_id,
  supplier_id,              -- FK → counterparties (category material_supplier)
  global_product_id nullable,  -- null = ещё не сматчен
  local_name,
  local_sku,
  unit,
  price,
  currency,
  min_order_qty,
  lead_time_days,
  is_active,
  last_import_at,
  metadata jsonb,
  UNIQUE(company_id, supplier_id, local_sku)
)

supplier_price_imports (
  id, company_id, supplier_id,
  source_type,              -- excel | csv | api | 1c_export
  file_name, status,        -- uploaded | parsing | review | committed | failed
  stats jsonb,              -- { total, matched, pending, errors }
  created_by, created_at
)

supplier_price_import_rows (
  id, import_id,
  row_number,
  raw jsonb,                -- исходная строка
  parsed_name, parsed_unit, parsed_price,
  suggested_global_product_id nullable,
  match_confidence numeric, -- 0..1
  match_status,             -- auto | manual | skipped | committed
  supplier_product_id nullable
)
```

### 2.4. Атрибуты (JSONB)

Категория задаёт `attributes_schema`. Примеры:

**Арматура:** `diameter_mm`, `steel_class`, `length_m`, `gost`  
**Бетон:** `grade`, `slump`, `frost`, `w_ratio`  
**Газоблок:** `lxwxh_mm`, `density`, `strength`

UI: динамическая форма из schema (не hardcode полей).

### 2.5. Matching pipeline (этап 1 — без ML)

```
Import row
  → normalize (lower, trim, ё→е, убрать спецсимволы)
  → alias lookup (global_product_aliases)
  → fuzzy: pg_trgm similarity > 0.6 на canonical_name
  → category filter (если указана в импорте)
  → confidence score
  → if >= 0.85: auto-match
  → else: queue manual review UI
```

Этап 2: embeddings / LLM — **не сейчас**.

### 2.6. Связь со снабжением

```
supply_request_items.global_product_id  -- канонический товар (optional)
supply_request_items.custom_name        -- fallback до каталога
supply_request_items.supplier_product_id -- после выбора предложения
```

**Правило:** заявка может жить без каталога (free-text). Каталог обогащает, не блокирует.

### 2.7. Связь с warehouse

```
warehouse_items.global_product_id nullable
warehouse_incoming.supplier_product_id nullable
```

Склад остаётся; снабжение пишет в склад через `supply_order_id`.

### 2.8. API (draft)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/catalog/categories` | дерево категорий |
| GET | `/catalog/products?q=&category=` | поиск platform catalog |
| GET | `/catalog/supplier-products?supplierId=` | прайс tenant |
| POST | `/catalog/imports` | upload Excel/CSV |
| GET | `/catalog/imports/:id/rows?status=pending` | ручной матчинг |
| POST | `/catalog/imports/:id/rows/:rowId/match` | подтвердить match |
| POST | `/catalog/imports/:id/commit` | записать в supplier_products |

Platform admin (будущее): `POST /platform-admin/catalog/products`.

### 2.9. Наполнение каталога

1. **Seed** — 18 категорий из ТЗ + ~200 top SKU (арматура, бетон, блоки, цемент).
2. **Импорты поставщиков** — основной рост.
3. **Moderation queue** — новые global_products из unmatched rows (platform admin approves).

---

## 3. Integration Layer — предложение

### 3.1. Проблема

Сейчас: reconciliation, warehouse, CRM intake, import center — каждый со своим форматом.  
Нужен: **единая нормализованная операция** перед ERP и сверкой.

### 3.2. Концепция: Staging → Match → Commit

```
External source (1C / Bank CSV / Excel / API)
        ↓
  integration_import_jobs
        ↓
  integration_staging_lines   ← нормализованный JSON
        ↓
  matching engine             ← контрагент, проект, дубликат
        ↓
  review (optional)
        ↓
  commit → target module
        (finance_reconciliation_lines | construction_operations | payments | ...)
```

### 3.3. Таблицы

```sql
integration_sources (
  id, company_id,
  type,                     -- bank_csv | bank_mt940 | 1c_excel | 1c_xml | manual
  name,
  config jsonb,             -- { bankAccountId, legalEntityId, columnMapping }
  is_active,
  created_at
)

integration_import_jobs (
  id, company_id, source_id,
  status,                   -- uploaded | parsing | matching | review | committed | failed
  file_name nullable,
  file_hash,                -- dedup
  period_from, period_to,
  stats jsonb,
  error_message,
  created_by, created_at, committed_at
)

integration_staging_lines (
  id, job_id, company_id,
  line_index,
  -- Normalized operation (единый формат)
  operation_date date,
  amount numeric(15,2),
  currency text default 'KGS',
  direction text,           -- in | out
  counterparty_name text,
  counterparty_inn nullable,
  description text,
  external_id text,         -- id из 1С / банка
  raw_payload jsonb,
  -- Matching
  match_status text,        -- pending | matched | duplicate | error
  matched_counterparty_id nullable,
  matched_project_id nullable,
  matched_legal_entity_id nullable,
  matched_erp_line_id nullable,
  match_confidence numeric,
  review_status text,       -- pending | approved | rejected
  committed_target nullable,-- reconciliation | operation | payment
  committed_record_id nullable,
  created_at
)
```

### 3.4. Нормализованная операция (TypeScript)

```typescript
type NormalizedOperation = {
  operationDate: string;      // YYYY-MM-DD
  amount: number;
  currency: "KGS" | "USD";
  direction: "in" | "out";
  counterpartyName?: string;
  counterpartyInn?: string;
  description?: string;
  externalId?: string;
  bankAccountRef?: string;
  legalEntityInn?: string;
  projectCode?: string;
  raw: unknown;
};
```

Все парсеры (1C, bank, manual) **только** мапят в `NormalizedOperation[]`.

### 3.5. Парсеры (приоритет)

| Парсер | Фаза | Формат |
|--------|------|--------|
| `bank_csv` | M1 | mBank/Optima/DKIB шаблоны + generic CSV mapper UI |
| `manual_excel` | M1 | уже частично в reconciliation |
| `1c_excel` | M2 | выгрузка «Банковская выписка», «Платежи» |
| `1c_xml` | M4+ | CommerceML / типовая конфигурация |
| `bank_api` | M6+ | по одному банку |

**Read-only.** ERP не пишет в 1С на старте.

### 3.6. Matching engine

Порядок правил:

1. `external_id` exact (повторный импорт)
2. `amount + date + counterparty_inn`
3. `amount + date + fuzzy counterparty name` (pg_trgm)
4. `description regex` (шаблоны: «аренда», «бетон», project code)
5. unmatched → `review_status = pending`

Связь с `finance_reconciliation_lines`:

```
finance_reconciliation_lines.staging_line_id → integration_staging_lines.id
```

Существующая таблица **не ломается** — добавляется nullable FK.

### 3.7. API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/integration/sources` | список источников |
| POST | `/integration/sources` | создать (bank account mapping) |
| POST | `/integration/imports` | upload file + sourceId |
| GET | `/integration/imports/:id` | статус + stats |
| GET | `/integration/imports/:id/lines?review=pending` | очередь review |
| POST | `/integration/imports/:id/lines/:lineId/approve` | match + commit target |
| POST | `/integration/imports/:id/commit-all` | bulk approve high confidence |

Finance Reconciliation UI → тонкий клиент над `/integration/*` + legacy lines.

### 3.8. Секреты и токены

- `INTEGRATION_SECRETS_KEY` на Vercel (prod) — AES-256-GCM для OAuth/API keys.
- Уже внедрено для Instagram `accessToken` / `appSecret` (`secret-crypto.ts`).
- Bank API keys → `integration_sources.config` encrypted fields.

### 3.9. Idempotency

- `file_hash` + `source_id` → reject duplicate import same day.
- `external_id` + `source_id` → skip duplicate lines on commit.

---

## 4. Снабжение (кратко, фаза 2)

Параллельно `warehouse_*`, не замена:

```
supply_requests → supply_request_items
               → supply_approvals (pending|approved|rejected)
               → supply_orders (draft→closed)
               → warehouse_incoming.supply_order_id
               → construction_expenses / finance (optional)
```

Маркетплейс = **drawer из заявки**: `GET /supply/requests/:id/supplier-offers` → query `supplier_products` + `global_products`.

---

## 5. Юр. структура (фаза 1)

```sql
project_legal_entities (
  id, project_id, legal_entity_id,
  role text,              -- owner | contractor_account | sales
  is_primary boolean,
  UNIQUE(project_id, legal_entity_id)
)
```

- `construction_projects.legal_entity_id` — **оставить** как primary fallback.
- Новые операции: `legal_entity_id` nullable на `construction_operations`, `finance_reconciliation_lines`.
- Scope helper: `req.allowedLegalEntityIds[]` из project context.

---

## 6. Бюджет L1–L3 (фаза 1)

```sql
ALTER construction_projects
  ADD COLUMN budget_maturity_level smallint NOT NULL DEFAULT 2;
-- 1 = этапы + факт
-- 2 = + статьи (текущее поведение)
-- 3 = + ресурсы / смета (optional module)
```

UI wizard при создании проекта. Level 3 скрыт за feature flag до v3.

---

## 7. Roadmap (согласованный вариант A)

### Неделя 0 (сейчас)
- [x] P0: Sonner toaster, payroll transaction, Instagram encrypt
- [ ] Commit + push накопленного diff
- [x] ADR v1 (этот документ)

### Месяц 1 — Деньги и правда
- Integration Layer: tables + bank CSV parser + staging UI
- Reconciliation ← staging commit
- `project_legal_entities` + UI выбора ОсОО
- Budget level enum + wizard

### Месяц 2 — Снабжение v1
- `supply_requests` / approvals / orders
- Связь order → warehouse
- Без global catalog (free-text items)

### Месяц 3 — Каталог v1
- Platform categories + seed SKU
- `supplier_products` + Excel import + manual match UI
- Matching из заявки (top-3 offers)

### Месяц 4–6
- Marketplace flow end-to-end
- Supplier portal extension
- Credit limits (read-only)
- 1C Excel extended

### Месяц 6–12
- Bank API (one bank)
- Analytics / supplier ratings
- Monetization hooks

---

## 8. Риски

| Риск | Митигация |
|------|-----------|
| Platform catalog moderation overhead | Seed + auto-match; human only for unmatched |
| Integration parser hell (every bank different) | Generic CSV mapper + 3 bank templates |
| Два контура склада | Single write path: only via supply_order |
| M:N legal entities breaks queries | 6-month fallback on scalar legalEntityId |
| Plaintext legacy Instagram tokens | decryptSecret passthrough; re-save encrypts |

---

## 9. Что нужно от вас (sign-off)

1. **Global catalog cross-tenant** — OK / только внутри холдинга?
2. **Integration Layer** — первый парсер: bank CSV или 1C Excel?
3. **Снабжение** — старт без каталога (free-text) — OK?
4. **`INTEGRATION_SECRETS_KEY`** — добавить на Vercel prod (32+ chars).

После ответа — старт **Фазы 1** (migration SQL generate only, не run auto).

---

## 10. Связь с текущим кодом

| Уже есть | Действие |
|----------|----------|
| `legal_entities` | Расширить M:N |
| `finance_reconciliation_lines` | + staging_line_id FK |
| `marketplace_products` | Deprecate → `supplier_products` или migrate |
| `warehouse_*` | Оставить, bridge FK |
| `counterparties.categories[]` | Master Data для supplier_id |
| `direction-reports` dashboard | Встроить в Finance Center позже |
| `module_settings` | Secrets encrypted via secret-crypto |

---

*Документ для репозитория: `docs/ARCHITECTURE_V2.md`*
