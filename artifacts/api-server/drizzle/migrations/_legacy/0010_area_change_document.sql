-- Migration 0010: добавить поле document_meta для прикреплённого PDF/фото к изменению площади

ALTER TABLE "construction_unit_area_changes"
  ADD COLUMN IF NOT EXISTS "document_meta" text;
  -- JSON: { fileName, mimeType, base64, uploadedAt }

ALTER TABLE "construction_units"
  ADD COLUMN IF NOT EXISTS "area_change_document_meta" text;
  -- Последний загруженный документ изменения площади
