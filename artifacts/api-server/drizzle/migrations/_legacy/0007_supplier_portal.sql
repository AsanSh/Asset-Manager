-- Migration: supplier portal + contract amounts
-- Run manually on production DB

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "linked_supplier_id" integer;

ALTER TABLE "warehouse_suppliers"
  ADD COLUMN IF NOT EXISTS "contract_amount" numeric(15, 2),
  ADD COLUMN IF NOT EXISTS "paid_amount" numeric(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'KGS';
