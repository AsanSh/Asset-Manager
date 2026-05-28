-- Migration: add created_by to construction_tasks
-- Run manually on production DB

ALTER TABLE "construction_tasks"
  ADD COLUMN IF NOT EXISTS "created_by" integer;
