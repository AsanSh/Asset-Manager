-- Migration 0015: индексы на горячие колонки + backfill company_id
-- НЕ добавляем FK сейчас — нужна предварительная очистка orphan rows (Фаза 2 поздняя).
-- НЕ меняем text → date для start_date/due_date — это требует data migration с валидацией.

-- ── Индексы на (company_id, X) для часто используемых таблиц ───────────────

CREATE INDEX IF NOT EXISTS "idx_construction_projects_company"
  ON "construction_projects" ("company_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_construction_units_company_project"
  ON "construction_units" ("company_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_construction_units_status"
  ON "construction_units" ("company_id", "status");

CREATE INDEX IF NOT EXISTS "idx_construction_tasks_company"
  ON "construction_tasks" ("company_id", "project_id", "status");

CREATE INDEX IF NOT EXISTS "idx_construction_tasks_assigned"
  ON "construction_tasks" ("company_id", "assigned_to");

CREATE INDEX IF NOT EXISTS "idx_construction_stages_company"
  ON "construction_stages" ("company_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_construction_operations_company"
  ON "construction_operations" ("company_id", "date" DESC);

CREATE INDEX IF NOT EXISTS "idx_construction_operations_contract"
  ON "construction_operations" ("contract_id", "status");

CREATE INDEX IF NOT EXISTS "idx_construction_operations_accounts"
  ON "construction_operations" ("from_account_id", "to_account_id");

CREATE INDEX IF NOT EXISTS "idx_construction_accruals_contract"
  ON "construction_accruals" ("contract_id", "status");

CREATE INDEX IF NOT EXISTS "idx_construction_accruals_company"
  ON "construction_accruals" ("company_id", "due_date");

CREATE INDEX IF NOT EXISTS "idx_construction_sales_contracts_company"
  ON "construction_sales_contracts" ("company_id", "status");

CREATE INDEX IF NOT EXISTS "idx_construction_sales_contracts_unit"
  ON "construction_sales_contracts" ("unit_id");

CREATE INDEX IF NOT EXISTS "idx_lease_contracts_tenant"
  ON "lease_contracts" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_lease_contracts_company"
  ON "lease_contracts" ("company_id", "status");

CREATE INDEX IF NOT EXISTS "idx_payments_lease"
  ON "payments" ("lease_contract_id", "payment_date");

CREATE INDEX IF NOT EXISTS "idx_accruals_lease"
  ON "accruals" ("lease_contract_id", "due_date");

CREATE INDEX IF NOT EXISTS "idx_warehouse_incoming_company"
  ON "warehouse_incoming" ("company_id", "document_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_warehouse_outgoing_company"
  ON "warehouse_outgoing" ("company_id", "issued_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_warehouse_items_company"
  ON "warehouse_items" ("company_id");

CREATE INDEX IF NOT EXISTS "idx_activity_log_company"
  ON "activity_log" ("company_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_activity_log_entity"
  ON "activity_log" ("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_consolidated_logs_module"
  ON "consolidated_logs" ("company_id", "module", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
  ON "notifications" ("user_id", "is_read", "created_at" DESC);

-- ── Backfill: найти записи с company_id IS NULL ────────────────────────────
-- Если их много, NOT NULL не накатим. Здесь только диагностика.
-- ВАЖНО: NOT NULL не делаем автоматически — сначала нужно ручное решение
-- что делать с NULL-записями (удалить / привязать к компании по умолчанию).

DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM construction_projects WHERE company_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'construction_projects: % rows with NULL company_id', null_count;
  END IF;

  SELECT COUNT(*) INTO null_count FROM users WHERE company_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'users: % rows with NULL company_id (это нормально для super_admin)', null_count;
  END IF;
END $$;
