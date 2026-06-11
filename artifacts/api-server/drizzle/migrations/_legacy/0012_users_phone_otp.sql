-- Migration 0012: телефон в users + таблица otp_codes для SMS-логина

-- 1. Телефон у пользователей (для портальных входов по телефону)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" text;

-- Уникальность телефона — только когда он заполнен (партиал-индекс)
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_unique_idx"
  ON "users" ("phone")
  WHERE "phone" IS NOT NULL;

-- 2. Снимаем NOT NULL и UNIQUE с email — теперь хотя бы одно из (email, phone) должно быть
-- Не делаем DROP UNIQUE напрямую (имя индекса неизвестно), используем DO для безопасности
DO $$
DECLARE
  cons_name text;
BEGIN
  SELECT conname INTO cons_name
    FROM pg_constraint
    WHERE conrelid = '"users"'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = '"users"'::regclass AND attname = 'email');
  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "users" DROP CONSTRAINT %I', cons_name);
  END IF;
END $$;

ALTER TABLE "users"
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "password_hash" DROP NOT NULL;

-- Уникальность email — только когда заполнен
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique_idx"
  ON "users" ("email")
  WHERE "email" IS NOT NULL;

-- 3. Таблица OTP-кодов для SMS-логина
CREATE TABLE IF NOT EXISTS "otp_codes" (
  "id" serial PRIMARY KEY,
  "phone" text NOT NULL,
  "code" text NOT NULL,
  "purpose" text NOT NULL DEFAULT 'login',
  "attempts" integer NOT NULL DEFAULT 0,
  "consumed_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "otp_codes_phone_idx" ON "otp_codes" ("phone", "purpose");
CREATE INDEX IF NOT EXISTS "otp_codes_expires_idx" ON "otp_codes" ("expires_at");
