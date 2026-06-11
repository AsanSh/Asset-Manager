-- Тип поставщика (дистрибьютор / продавец) + портал для загрузки прайсов

ALTER TABLE "marketplace_suppliers"
  ADD COLUMN IF NOT EXISTS "supplier_type" text NOT NULL DEFAULT 'seller';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "linked_marketplace_supplier_id" integer;

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_linked_marketplace_supplier_id_fkey"
    FOREIGN KEY ("linked_marketplace_supplier_id")
    REFERENCES "marketplace_suppliers"("id")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_users_linked_marketplace_supplier"
  ON "users" ("linked_marketplace_supplier_id")
  WHERE "linked_marketplace_supplier_id" IS NOT NULL;
