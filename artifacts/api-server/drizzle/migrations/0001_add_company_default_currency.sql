-- Добавляет валюту по умолчанию для компании (для сводного отображения касс).
-- Идемпотентно: безопасно для уже существующей таблицы companies.

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "default_currency" text NOT NULL DEFAULT 'KGS';
