-- Migration 0026: task comments mentions + attachments linkage
-- Run manually on production Neon.

ALTER TABLE "task_comments"
  ADD COLUMN IF NOT EXISTS "mentions" text,
  ADD COLUMN IF NOT EXISTS "attachment_ids" text;

-- mentions: JSON string array of user ids, ex: "[12,45]"
-- attachment_ids: JSON string array of attachment ids linked to comment

