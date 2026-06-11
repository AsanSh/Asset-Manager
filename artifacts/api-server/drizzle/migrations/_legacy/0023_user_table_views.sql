-- Saved DataTable layouts per user (sync across devices)
CREATE TABLE IF NOT EXISTS user_table_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_table_views_user_table_idx
  ON user_table_views (user_id, table_id);

-- Rollback (manual):
-- DROP INDEX IF EXISTS user_table_views_user_table_idx;
-- DROP TABLE IF EXISTS user_table_views;
