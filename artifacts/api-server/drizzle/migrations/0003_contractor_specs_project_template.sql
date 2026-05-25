CREATE TABLE IF NOT EXISTS "construction_contractor_specializations" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "construction_contractor_specs_company_name"
  ON "construction_contractor_specializations" ("company_id", "name");

ALTER TABLE "construction_projects"
  ADD COLUMN IF NOT EXISTS "contract_template_meta" text;
