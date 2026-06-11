-- Migration 0013: Idempotency-keys для платежей + partial unique index
--                  для защиты от двойной продажи одного юнита.

-- 1. Idempotency-keys
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "key" text PRIMARY KEY,
  "company_id" integer NOT NULL,
  "user_id" integer,
  "route" text NOT NULL,
  "response_status" integer,
  "response_body" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_idx"
  ON "idempotency_keys" ("expires_at");

-- 2. Partial unique index: один активный договор продажи на юнит.
-- Если в БД уже есть конфликтующие записи — индекс не создастся.
-- В этом случае нужно вручную разобрать дубли, потом запустить миграцию повторно.
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_sales_contract_per_unit"
  ON "construction_sales_contracts" ("unit_id")
  WHERE "unit_id" IS NOT NULL
    AND "status" IN ('signed', 'review');
