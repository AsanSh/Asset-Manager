-- Migration 0027: task dependencies (FS / SS)
-- Run manually on production Neon before API deploy.

CREATE TABLE IF NOT EXISTS "construction_task_dependencies" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "predecessor_task_id" integer NOT NULL REFERENCES "construction_tasks"("id") ON DELETE CASCADE,
  "successor_task_id" integer NOT NULL REFERENCES "construction_tasks"("id") ON DELETE CASCADE,
  "dependency_type" text NOT NULL DEFAULT 'FS',
  -- FS | SS
  "lag_days" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uniq_task_dependency" UNIQUE ("predecessor_task_id", "successor_task_id", "dependency_type")
);

CREATE INDEX IF NOT EXISTS "idx_task_deps_predecessor" ON "construction_task_dependencies" ("predecessor_task_id");
CREATE INDEX IF NOT EXISTS "idx_task_deps_successor" ON "construction_task_dependencies" ("successor_task_id");
