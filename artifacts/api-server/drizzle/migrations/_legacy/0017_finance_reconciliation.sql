-- Migration 0017: Сверка 1С / банк — inbox строк для сопоставления и проводок

CREATE TABLE IF NOT EXISTS "finance_reconciliation_lines" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "source" varchar(16) NOT NULL,
  "external_ref" varchar(256),
  "pair_group_id" varchar(64),
  "operation_date" varchar(16) NOT NULL,
  "amount" numeric(15, 2) NOT NULL DEFAULT 0,
  "currency" varchar(8) NOT NULL DEFAULT 'KGS',
  "counterparty_name" varchar(256),
  "counterparty_inn" varchar(32),
  "description" text,
  "bank_account_ref" varchar(128),
  "raw_payload" text,
  "match_status" varchar(32) NOT NULL DEFAULT 'unmatched',
  "review_status" varchar(32) NOT NULL DEFAULT 'inbox',
  "suggested_project_id" integer,
  "suggested_category" varchar(128),
  "suggested_stage_id" integer,
  "suggestion_reason" text,
  "confirmed_project_id" integer,
  "confirmed_category" varchar(128),
  "confirmed_stage_id" integer,
  "construction_operation_id" integer,
  "reviewed_by" integer,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_fin_recon_company_review"
  ON "finance_reconciliation_lines" ("company_id", "review_status");

CREATE INDEX IF NOT EXISTS "idx_fin_recon_company_pair"
  ON "finance_reconciliation_lines" ("company_id", "pair_group_id")
  WHERE "pair_group_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_fin_recon_company_date"
  ON "finance_reconciliation_lines" ("company_id", "operation_date");
