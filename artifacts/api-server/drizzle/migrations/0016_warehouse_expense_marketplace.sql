-- Migration 0016: Track B — связь склад→расход стройки + B2B маркетплейс

-- 1. Ссылка на расход стройки из списания склада
ALTER TABLE "warehouse_outgoing"
  ADD COLUMN IF NOT EXISTS "construction_expense_id" integer;

CREATE INDEX IF NOT EXISTS "idx_warehouse_outgoing_expense"
  ON "warehouse_outgoing" ("construction_expense_id")
  WHERE "construction_expense_id" IS NOT NULL;

-- 2. Каталог материалов платформы (super_admin)
CREATE TABLE IF NOT EXISTS "marketplace_products" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "category" text NOT NULL DEFAULT 'materials',
  "unit" text NOT NULL DEFAULT 'шт',
  "unit_price" numeric(12, 2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'KGS',
  "description" text,
  "image_url" text,
  "min_order_qty" numeric(12, 3) DEFAULT 1,
  "stock_available" numeric(12, 3),
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_marketplace_products_active"
  ON "marketplace_products" ("is_active", "sort_order");

-- 3. Заявки компаний на покупку из маркетплейса
CREATE TABLE IF NOT EXISTS "marketplace_orders" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  "quantity" numeric(12, 3) NOT NULL,
  "unit_price_snapshot" numeric(12, 2) NOT NULL,
  "total_amount" numeric(15, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'KGS',
  "project_id" integer,
  "requested_by_user_id" integer,
  "status" text NOT NULL DEFAULT 'pending',
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_marketplace_orders_company"
  ON "marketplace_orders" ("company_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_marketplace_orders_status"
  ON "marketplace_orders" ("status");
