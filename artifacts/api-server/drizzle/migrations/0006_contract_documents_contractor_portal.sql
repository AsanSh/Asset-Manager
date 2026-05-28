-- Migration: contract document uploads + contractor portal
-- Run manually on production DB

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "linked_contractor_id" integer;

ALTER TABLE "construction_contractors"
  ADD COLUMN IF NOT EXISTS "contract_document_meta" text;

ALTER TABLE "warehouse_suppliers"
  ADD COLUMN IF NOT EXISTS "contract_number" text,
  ADD COLUMN IF NOT EXISTS "contract_document_meta" text;
