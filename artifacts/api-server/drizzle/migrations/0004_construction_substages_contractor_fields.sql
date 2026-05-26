-- Migration: sub-stages + contractor extra fields
-- Run manually on production DB

ALTER TABLE "construction_stages"
  ADD COLUMN IF NOT EXISTS "parent_stage_id" integer REFERENCES "construction_stages"("id") ON DELETE SET NULL;

ALTER TABLE "construction_contractors"
  ADD COLUMN IF NOT EXISTS "okpo" text,
  ADD COLUMN IF NOT EXISTS "bic" text,
  ADD COLUMN IF NOT EXISTS "stage_id" integer,
  ADD COLUMN IF NOT EXISTS "payment_milestones" text,
  ADD COLUMN IF NOT EXISTS "paid_amount" numeric(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "document_path" text;
