-- Начальная миграция: все таблицы и колонки, добавленные после первоначального запуска.
-- Существующие таблицы (companies, users, properties и др.) уже созданы в БД.

CREATE TABLE IF NOT EXISTS "email_verifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "module_settings" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "module_key" TEXT NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "enabled_at" TIMESTAMPTZ,
  "settings" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "construction_unit_statuses" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color_key" TEXT NOT NULL DEFAULT 'slate',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "sale_mode" TEXT NOT NULL DEFAULT 'none',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "construction_unit_statuses_company_code"
  ON "construction_unit_statuses" ("company_id", "code");

ALTER TABLE "construction_operations"
  ADD COLUMN IF NOT EXISTS "accrual_id" INTEGER;

ALTER TABLE "construction_projects"
  ADD COLUMN IF NOT EXISTS "document_meta" TEXT;

ALTER TABLE "construction_sales_contracts"
  ADD COLUMN IF NOT EXISTS "buyer_meta" TEXT;

ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "module" VARCHAR(32);

UPDATE "bank_accounts" SET "module" = 'construction'
WHERE "module" IS NULL AND "id" IN (
  SELECT DISTINCT "from_account_id" FROM "construction_operations"
  WHERE "from_account_id" IS NOT NULL
  UNION
  SELECT DISTINCT "to_account_id" FROM "construction_operations"
  WHERE "to_account_id" IS NOT NULL
);

UPDATE "bank_accounts" SET "module" = 'rental'
WHERE "module" IS NULL AND "id" IN (
  SELECT DISTINCT "account_id" FROM "payments" WHERE "account_id" IS NOT NULL
  UNION
  SELECT DISTINCT "account_id" FROM "expenses" WHERE "account_id" IS NOT NULL
  UNION
  SELECT DISTINCT "account_id" FROM "deposits" WHERE "account_id" IS NOT NULL
);

UPDATE "bank_accounts" SET "module" = 'construction' WHERE "module" IS NULL;
