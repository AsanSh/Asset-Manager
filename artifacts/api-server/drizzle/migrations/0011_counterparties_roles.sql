-- Migration 0011: Master Data + Roles для контрагентов
-- Один контрагент = одна запись с массивом ролей
-- Специализированные таблицы получают FK на counterparties

-- 1. Массив ролей в counterparties
ALTER TABLE "counterparties"
  ADD COLUMN IF NOT EXISTS "categories" text[] DEFAULT ARRAY[]::text[];

-- Заполнить categories[] из старого category для существующих записей
UPDATE "counterparties"
  SET "categories" = ARRAY[COALESCE("category", 'other')]
  WHERE "categories" IS NULL OR array_length("categories", 1) IS NULL;

-- GIN индекс для быстрого фильтра по ролям
CREATE INDEX IF NOT EXISTS "counterparties_categories_gin"
  ON "counterparties" USING GIN ("categories");

-- 2. FK на counterparties в специализированных таблицах
ALTER TABLE "construction_contractors"
  ADD COLUMN IF NOT EXISTS "counterparty_id" integer;
CREATE INDEX IF NOT EXISTS "construction_contractors_counterparty_id_idx"
  ON "construction_contractors" ("counterparty_id");

ALTER TABLE "warehouse_suppliers"
  ADD COLUMN IF NOT EXISTS "counterparty_id" integer;
CREATE INDEX IF NOT EXISTS "warehouse_suppliers_counterparty_id_idx"
  ON "warehouse_suppliers" ("counterparty_id");

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "counterparty_id" integer;
CREATE INDEX IF NOT EXISTS "tenants_counterparty_id_idx"
  ON "tenants" ("counterparty_id");

-- 3. Backfill: создать counterparties для специализированных записей где нужно
-- Стратегия: попытаться смэтчить по полному совпадению fullName + ИИН/ИНН.
-- Если совпадение есть — добавить роль, иначе создать новую запись.

-- 3.1 construction_contractors → service_provider
DO $$
DECLARE
  r RECORD;
  matched_id INTEGER;
BEGIN
  FOR r IN
    SELECT * FROM construction_contractors WHERE counterparty_id IS NULL
  LOOP
    matched_id := NULL;
    -- Попытка смэтчить по fullName + inn
    SELECT id INTO matched_id FROM counterparties
      WHERE company_id = r.company_id
        AND full_name = r.full_name
        AND (
          (r.inn IS NOT NULL AND iin = r.inn)
          OR (r.inn IS NULL AND iin IS NULL)
        )
      LIMIT 1;

    IF matched_id IS NOT NULL THEN
      -- Добавляем роль service_provider если её нет
      UPDATE counterparties
        SET categories = CASE
          WHEN 'service_provider' = ANY(categories) THEN categories
          ELSE array_append(categories, 'service_provider')
        END
        WHERE id = matched_id;
      UPDATE construction_contractors SET counterparty_id = matched_id WHERE id = r.id;
    ELSE
      -- Создаём новую запись
      INSERT INTO counterparties (company_id, type, category, categories, full_name, iin, phone, email)
        VALUES (
          r.company_id,
          COALESCE(r.type, 'company'),
          'service_provider',
          ARRAY['service_provider'],
          r.full_name,
          r.inn,
          r.phone,
          r.email
        ) RETURNING id INTO matched_id;
      UPDATE construction_contractors SET counterparty_id = matched_id WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 3.2 warehouse_suppliers → material_supplier
DO $$
DECLARE
  r RECORD;
  matched_id INTEGER;
BEGIN
  FOR r IN
    SELECT * FROM warehouse_suppliers WHERE counterparty_id IS NULL
  LOOP
    matched_id := NULL;
    SELECT id INTO matched_id FROM counterparties
      WHERE company_id = r.company_id
        AND full_name = r.name
      LIMIT 1;

    IF matched_id IS NOT NULL THEN
      UPDATE counterparties
        SET categories = CASE
          WHEN 'material_supplier' = ANY(categories) THEN categories
          ELSE array_append(categories, 'material_supplier')
        END
        WHERE id = matched_id;
      UPDATE warehouse_suppliers SET counterparty_id = matched_id WHERE id = r.id;
    ELSE
      INSERT INTO counterparties (company_id, type, category, categories, full_name, phone, email)
        VALUES (
          r.company_id,
          'company',
          'material_supplier',
          ARRAY['material_supplier'],
          r.name,
          r.phone,
          r.email
        ) RETURNING id INTO matched_id;
      UPDATE warehouse_suppliers SET counterparty_id = matched_id WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 3.3 tenants → tenant
DO $$
DECLARE
  r RECORD;
  matched_id INTEGER;
BEGIN
  FOR r IN
    SELECT * FROM tenants WHERE counterparty_id IS NULL
  LOOP
    matched_id := NULL;
    SELECT id INTO matched_id FROM counterparties
      WHERE company_id = r.company_id
        AND full_name = r.full_name
        AND (
          (r.iin IS NOT NULL AND iin = r.iin)
          OR (r.iin IS NULL AND iin IS NULL)
        )
      LIMIT 1;

    IF matched_id IS NOT NULL THEN
      UPDATE counterparties
        SET categories = CASE
          WHEN 'tenant' = ANY(categories) THEN categories
          ELSE array_append(categories, 'tenant')
        END
        WHERE id = matched_id;
      UPDATE tenants SET counterparty_id = matched_id WHERE id = r.id;
    ELSE
      INSERT INTO counterparties (company_id, type, category, categories, full_name, iin, phone, email)
        VALUES (
          r.company_id,
          'individual',
          'tenant',
          ARRAY['tenant'],
          r.full_name,
          r.iin,
          r.phone,
          r.email
        ) RETURNING id INTO matched_id;
      UPDATE tenants SET counterparty_id = matched_id WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
