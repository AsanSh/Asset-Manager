-- Migration 0014: расширение activity_log для diff "до/после"

ALTER TABLE "activity_log"
  ADD COLUMN IF NOT EXISTS "before_data" text,
  ADD COLUMN IF NOT EXISTS "after_data" text,
  ADD COLUMN IF NOT EXISTS "changed_fields" text;
