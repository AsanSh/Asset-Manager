-- Поставщики платформенного маркетплейса + импорт прайс-листов Excel

CREATE TABLE IF NOT EXISTS "marketplace_suppliers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "phone" text,
  "email" text,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_marketplace_suppliers_code"
  ON "marketplace_suppliers" (lower(trim("code")))
  WHERE "code" IS NOT NULL AND trim("code") <> '';

CREATE INDEX IF NOT EXISTS "idx_marketplace_suppliers_active"
  ON "marketplace_suppliers" ("is_active", "name");

ALTER TABLE "marketplace_products"
  ADD COLUMN IF NOT EXISTS "supplier_id" integer REFERENCES "marketplace_suppliers"("id") ON DELETE SET NULL;

ALTER TABLE "marketplace_products"
  ADD COLUMN IF NOT EXISTS "sku" text;

ALTER TABLE "marketplace_products"
  ADD COLUMN IF NOT EXISTS "last_import_id" integer;

CREATE INDEX IF NOT EXISTS "idx_marketplace_products_supplier"
  ON "marketplace_products" ("supplier_id", "is_active", "sort_order");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_marketplace_products_supplier_sku"
  ON "marketplace_products" ("supplier_id", lower(trim("sku")))
  WHERE "supplier_id" IS NOT NULL AND "sku" IS NOT NULL AND trim("sku") <> '';

CREATE TABLE IF NOT EXISTS "marketplace_price_imports" (
  "id" serial PRIMARY KEY NOT NULL,
  "supplier_id" integer NOT NULL REFERENCES "marketplace_suppliers"("id") ON DELETE CASCADE,
  "file_name" text,
  "status" text NOT NULL DEFAULT 'review',
  "stats" text,
  "rows_preview" text,
  "created_by" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_marketplace_price_imports_supplier"
  ON "marketplace_price_imports" ("supplier_id", "created_at" DESC);
