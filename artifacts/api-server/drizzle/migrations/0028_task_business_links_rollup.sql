-- Migration 0028: task business links (contractor / sales contract / supply request)
-- Run manually on production Neon before API deploy.

ALTER TABLE "construction_tasks"
  ADD COLUMN IF NOT EXISTS "contractor_id" integer,
  ADD COLUMN IF NOT EXISTS "sales_contract_id" integer,
  ADD COLUMN IF NOT EXISTS "supply_request_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'construction_tasks_contractor_id_fkey'
  ) THEN
    ALTER TABLE "construction_tasks"
      ADD CONSTRAINT "construction_tasks_contractor_id_fkey"
      FOREIGN KEY ("contractor_id") REFERENCES "construction_contractors"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'construction_tasks_sales_contract_id_fkey'
  ) THEN
    ALTER TABLE "construction_tasks"
      ADD CONSTRAINT "construction_tasks_sales_contract_id_fkey"
      FOREIGN KEY ("sales_contract_id") REFERENCES "construction_sales_contracts"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'construction_tasks_supply_request_id_fkey'
  ) THEN
    ALTER TABLE "construction_tasks"
      ADD CONSTRAINT "construction_tasks_supply_request_id_fkey"
      FOREIGN KEY ("supply_request_id") REFERENCES "supply_requests"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_construction_tasks_contractor_id" ON "construction_tasks" ("contractor_id");
CREATE INDEX IF NOT EXISTS "idx_construction_tasks_sales_contract_id" ON "construction_tasks" ("sales_contract_id");
CREATE INDEX IF NOT EXISTS "idx_construction_tasks_supply_request_id" ON "construction_tasks" ("supply_request_id");
