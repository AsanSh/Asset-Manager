-- Migration 0009: chess area tracking, task comments, consolidated logs, company module
-- Run manually on production DB

-- 1. Area modification tracking on construction_units
ALTER TABLE "construction_units"
  ADD COLUMN IF NOT EXISTS "original_area"        numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "area_modified"        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "area_modified_by"     integer,
  ADD COLUMN IF NOT EXISTS "area_modified_at"     timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "area_delta"           numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "recalculation_price"  numeric(15, 2),
  ADD COLUMN IF NOT EXISTS "supplement_status"    text DEFAULT 'none';
  -- supplement_status: none | pending | generated | signed

-- 2. Area change history log (for audit trail)
CREATE TABLE IF NOT EXISTS "construction_unit_area_changes" (
  "id"            serial PRIMARY KEY,
  "company_id"    integer NOT NULL,
  "unit_id"       integer NOT NULL,
  "changed_by"    integer NOT NULL,
  "old_area"      numeric(10, 2),
  "new_area"      numeric(10, 2),
  "delta"         numeric(10, 2),
  "reason"        text,
  "created_at"    timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Additional agreements (дополнительное соглашение)
CREATE TABLE IF NOT EXISTS "construction_supplements" (
  "id"                serial PRIMARY KEY,
  "company_id"        integer NOT NULL,
  "unit_id"           integer NOT NULL,
  "contract_id"       integer,
  "old_area"          numeric(10, 2) NOT NULL,
  "new_area"          numeric(10, 2) NOT NULL,
  "price_per_sqm"     numeric(15, 2) NOT NULL,
  "balance_delta"     numeric(15, 2) NOT NULL,
  -- positive = client owes company, negative = company owes client
  "currency"          text NOT NULL DEFAULT 'KGS',
  "status"            text NOT NULL DEFAULT 'draft',
  -- draft | signed | cancelled
  "document_meta"     text,
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL,
  "signed_at"         timestamp with time zone
);

-- 4. Contractor category (services vs materials)
ALTER TABLE "construction_contractors"
  ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'service';
  -- service | material | both

-- 5. Company module type + INN suffix
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "module_type"  text,
  ADD COLUMN IF NOT EXISTS "inn_suffix"   text;
  -- module_type: arenda | kontrol | zakup | crm | all
  -- inn_suffix:  А | К | З | Ц

-- 6. Task comments (chat interface)
CREATE TABLE IF NOT EXISTS "task_comments" (
  "id"            serial PRIMARY KEY,
  "company_id"    integer NOT NULL,
  "task_id"       integer NOT NULL,
  "user_id"       integer NOT NULL,
  "content"       text NOT NULL,
  "comment_type"  text NOT NULL DEFAULT 'message',
  -- message | status_change | return | result
  "created_at"    timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Consolidated logs (read-only aggregator)
CREATE TABLE IF NOT EXISTS "consolidated_logs" (
  "id"                serial PRIMARY KEY,
  "company_id"        integer NOT NULL,
  "module"            text NOT NULL,
  -- arenda | kontrol | zakup | crm
  "operation_type"    text NOT NULL,
  -- income | expense | contract | payment | accrual
  "amount"            numeric(15, 2),
  "currency"          text DEFAULT 'KGS',
  "counterparty_id"   integer,
  "counterparty_name" text,
  "description"       text,
  "source_table"      text,
  "source_id"         integer,
  "operation_date"    date,
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "consolidated_logs_company_module"
  ON "consolidated_logs" ("company_id", "module");
CREATE INDEX IF NOT EXISTS "consolidated_logs_counterparty"
  ON "consolidated_logs" ("company_id", "counterparty_id");
