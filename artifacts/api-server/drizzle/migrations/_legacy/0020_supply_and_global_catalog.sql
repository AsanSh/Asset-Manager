CREATE TABLE IF NOT EXISTS "project_legal_entities" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "project_id" integer NOT NULL,
  "legal_entity_id" integer NOT NULL,
  "role" text NOT NULL DEFAULT 'owner',
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_legal_entities_unique"
  ON "project_legal_entities" ("project_id", "legal_entity_id");
CREATE INDEX IF NOT EXISTS "idx_project_legal_entities_company"
  ON "project_legal_entities" ("company_id", "project_id");

CREATE TABLE IF NOT EXISTS "supply_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "project_id" integer,
  "construction_stage_id" integer,
  "requested_by" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "priority" text NOT NULL DEFAULT 'normal',
  "needed_by_date" text,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_supply_requests_company_status"
  ON "supply_requests" ("company_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "supply_request_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "request_id" integer NOT NULL,
  "global_product_id" integer,
  "supplier_product_id" integer,
  "custom_name" text,
  "quantity" numeric(14,3) NOT NULL DEFAULT '0',
  "unit" text NOT NULL DEFAULT 'шт',
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_supply_request_items_request"
  ON "supply_request_items" ("request_id");

CREATE TABLE IF NOT EXISTS "supply_approvals" (
  "id" serial PRIMARY KEY NOT NULL,
  "request_id" integer NOT NULL,
  "approver_id" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "comment" text,
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_supply_approvals_request"
  ON "supply_approvals" ("request_id", "status");

CREATE TABLE IF NOT EXISTS "supply_orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "request_id" integer,
  "status" text NOT NULL DEFAULT 'draft',
  "payment_type" text NOT NULL DEFAULT 'prepaid',
  "total_amount" numeric(15,2) NOT NULL DEFAULT '0',
  "currency" text NOT NULL DEFAULT 'KGS',
  "notes" text,
  "created_by" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_supply_orders_company_status"
  ON "supply_orders" ("company_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "company_supplier_credit_limits" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "limit_amount" numeric(15,2) NOT NULL DEFAULT '0',
  "used_amount" numeric(15,2) NOT NULL DEFAULT '0',
  "term_days" integer NOT NULL DEFAULT 0,
  "markup_percent" numeric(7,4) NOT NULL DEFAULT '0',
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_credit_limits_company_supplier"
  ON "company_supplier_credit_limits" ("company_id", "supplier_id");

CREATE TABLE IF NOT EXISTS "installment_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "order_id" integer NOT NULL,
  "principal_amount" numeric(15,2) NOT NULL DEFAULT '0',
  "markup_amount" numeric(15,2) NOT NULL DEFAULT '0',
  "total_amount" numeric(15,2) NOT NULL DEFAULT '0',
  "due_date" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_installment_plans_order"
  ON "installment_plans" ("order_id", "status");

CREATE TABLE IF NOT EXISTS "global_product_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_id" integer,
  "slug" text NOT NULL,
  "name_ru" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_global_product_categories_slug"
  ON "global_product_categories" ("slug");

CREATE TABLE IF NOT EXISTS "global_products" (
  "id" serial PRIMARY KEY NOT NULL,
  "category_id" integer NOT NULL,
  "canonical_name" text NOT NULL,
  "slug" text NOT NULL,
  "unit_default" text NOT NULL DEFAULT 'шт',
  "attributes_schema" text,
  "attributes" text,
  "status" text NOT NULL DEFAULT 'active',
  "search_text" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_global_products_slug"
  ON "global_products" ("slug");
CREATE INDEX IF NOT EXISTS "idx_global_products_category"
  ON "global_products" ("category_id", "status");

CREATE TABLE IF NOT EXISTS "global_product_aliases" (
  "id" serial PRIMARY KEY NOT NULL,
  "global_product_id" integer NOT NULL,
  "alias" text NOT NULL,
  "source" text NOT NULL DEFAULT 'manual',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_global_product_aliases_alias"
  ON "global_product_aliases" ("alias");

CREATE TABLE IF NOT EXISTS "supplier_products" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "global_product_id" integer,
  "local_name" text NOT NULL,
  "local_sku" text,
  "unit" text NOT NULL DEFAULT 'шт',
  "price" numeric(15,2) NOT NULL DEFAULT '0',
  "currency" text NOT NULL DEFAULT 'KGS',
  "min_order_qty" numeric(12,3) DEFAULT '1',
  "lead_time_days" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "metadata" text,
  "last_import_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_products_company_supplier_sku"
  ON "supplier_products" ("company_id", "supplier_id", "local_sku");
CREATE INDEX IF NOT EXISTS "idx_supplier_products_company_supplier"
  ON "supplier_products" ("company_id", "supplier_id", "is_active");

CREATE TABLE IF NOT EXISTS "supplier_price_imports" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "source_type" text NOT NULL DEFAULT 'excel',
  "file_name" text,
  "status" text NOT NULL DEFAULT 'uploaded',
  "stats" text,
  "created_by" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_supplier_price_imports_company_status"
  ON "supplier_price_imports" ("company_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "supplier_price_import_rows" (
  "id" serial PRIMARY KEY NOT NULL,
  "import_id" integer NOT NULL,
  "row_number" integer NOT NULL,
  "raw" text,
  "parsed_name" text,
  "parsed_unit" text,
  "parsed_price" numeric(15,2),
  "suggested_global_product_id" integer,
  "match_confidence" numeric(6,4),
  "match_status" text NOT NULL DEFAULT 'pending',
  "supplier_product_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_supplier_price_import_rows_import"
  ON "supplier_price_import_rows" ("import_id", "match_status");
