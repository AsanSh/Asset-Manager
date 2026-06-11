-- Migration 0024: construction work management (subtasks, checklist, activity, task fields)
-- Run manually on Neon; register in meta/_journal.json before API deploy.

-- ── Extend construction_tasks ─────────────────────────────────────────────
ALTER TABLE "construction_tasks"
  ADD COLUMN IF NOT EXISTS "parent_task_id" integer REFERENCES "construction_tasks"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "progress_percent" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "progress_mode" text NOT NULL DEFAULT 'checklist',
  ADD COLUMN IF NOT EXISTS "planned_start_date" text,
  ADD COLUMN IF NOT EXISTS "planned_end_date" text,
  ADD COLUMN IF NOT EXISTS "actual_start_date" text,
  ADD COLUMN IF NOT EXISTS "actual_end_date" text,
  ADD COLUMN IF NOT EXISTS "work_type" text NOT NULL DEFAULT 'construction',
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;

-- Backfill stage_id for legacy tasks (first stage of project)
UPDATE "construction_tasks" t
SET "stage_id" = sub.first_stage_id
FROM (
  SELECT DISTINCT ON (s.project_id, s.company_id)
    s.project_id,
    s.company_id,
    s.id AS first_stage_id
  FROM "construction_stages" s
  WHERE s.parent_stage_id IS NULL
  ORDER BY s.project_id, s.company_id, s.sort_order ASC, s.id ASC
) sub
WHERE t.stage_id IS NULL
  AND t.project_id = sub.project_id
  AND (t.company_id = sub.company_id OR (t.company_id IS NULL AND sub.company_id IS NOT NULL));

-- Progress from legacy status
UPDATE "construction_tasks"
SET "progress_percent" = 100
WHERE "status" = 'done' AND "progress_percent" = 0;

UPDATE "construction_tasks"
SET "progress_percent" = 50
WHERE "status" IN ('in_progress', 'review') AND "progress_percent" = 0;

-- ── Subtasks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "construction_task_subtasks" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "task_id" integer NOT NULL REFERENCES "construction_tasks"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'todo',
  "assigned_to" integer,
  "due_date" text,
  "progress_percent" integer NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_subtasks_task" ON "construction_task_subtasks" ("task_id");

-- ── Checklist ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "construction_task_checklist_items" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "task_id" integer NOT NULL REFERENCES "construction_tasks"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "is_done" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "done_at" timestamp with time zone,
  "done_by" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_checklist_task" ON "construction_task_checklist_items" ("task_id");

-- ── Activity log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "construction_task_activity" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "task_id" integer NOT NULL REFERENCES "construction_tasks"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL,
  "action" text NOT NULL,
  "field_name" text,
  "old_value" text,
  "new_value" text,
  "meta" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_activity_task" ON "construction_task_activity" ("task_id", "created_at");

-- ── Task comments: threads (phase 0 prep) ───────────────────────────────────
ALTER TABLE "task_comments"
  ADD COLUMN IF NOT EXISTS "parent_comment_id" integer REFERENCES "task_comments"("id") ON DELETE SET NULL;

-- DOWN (manual rollback):
-- DROP TABLE IF EXISTS construction_task_activity;
-- DROP TABLE IF EXISTS construction_task_checklist_items;
-- DROP TABLE IF EXISTS construction_task_subtasks;
-- ALTER TABLE construction_tasks DROP COLUMN IF EXISTS parent_task_id, ...;
