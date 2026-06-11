-- Ручной fallback: пометить baseline применённым на prod, где схема уже есть.
-- Обычно не нужен — API делает это в runMigrations() при старте.
-- Не удаляет строки users/sessions. Только INSERT в drizzle.__drizzle_migrations.

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT
  '55c5e16e3f705c0972b34d1bc139572190029028b3b668f61822587f8c61d234',
  1781195058608
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'companies'
)
AND NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '55c5e16e3f705c0972b34d1bc139572190029028b3b668f61822587f8c61d234'
);
