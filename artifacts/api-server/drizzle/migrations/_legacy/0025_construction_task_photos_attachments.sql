-- Migration 0025: construction task photos + attachments
-- Run manually on production Neon; do not auto-run.
-- Also add entry in meta/_journal.json before API deploy.

-- Photos (до/процесс/после)
CREATE TABLE IF NOT EXISTS "construction_task_photos" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "task_id" integer NOT NULL REFERENCES "construction_tasks"("id") ON DELETE CASCADE,
  "uploaded_by" integer,
  "photo_type" text NOT NULL,
  -- before | progress | after
  "photo_url" text NOT NULL,
  "thumbnail_url" text,
  "caption" text,
  "taken_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_task_photos_task" ON "construction_task_photos" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_photos_type" ON "construction_task_photos" ("task_id", "photo_type");

-- Attachments (акты, исполнительная документация, чертежи, файлы)
CREATE TABLE IF NOT EXISTS "construction_task_attachments" (
  "id" serial PRIMARY KEY,
  "company_id" integer NOT NULL,
  "task_id" integer NOT NULL REFERENCES "construction_tasks"("id") ON DELETE CASCADE,
  "uploaded_by" integer,
  "doc_type" text NOT NULL DEFAULT 'other',
  -- pdf | dwg | xlsx | docx | photo | other
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text,
  "file_size" bigint,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_task_attachments_task" ON "construction_task_attachments" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_attachments_type" ON "construction_task_attachments" ("task_id", "doc_type");

-- DOWN (manual rollback):
-- DROP TABLE IF EXISTS construction_task_attachments;
-- DROP TABLE IF EXISTS construction_task_photos;

