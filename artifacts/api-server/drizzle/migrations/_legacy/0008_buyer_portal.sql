ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linked_buyer_id" integer;
ALTER TABLE "construction_sales_contracts" ADD COLUMN IF NOT EXISTS "contract_document_meta" text;

CREATE TABLE IF NOT EXISTS "warehouse_supplier_payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "date" text NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "currency" text DEFAULT 'KGS' NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
