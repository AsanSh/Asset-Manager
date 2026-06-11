-- MVP: ценообразование шахматки, Client Relations, себестоимость снабжения

ALTER TABLE construction_projects
  ADD COLUMN IF NOT EXISTS base_sale_price_per_sqm NUMERIC(12, 2);

ALTER TABLE construction_units
  ADD COLUMN IF NOT EXISTS price_coefficient NUMERIC(8, 4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS price_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS price_approved_at TIMESTAMPTZ;

ALTER TABLE construction_expenses
  ADD COLUMN IF NOT EXISTS construction_task_id INTEGER;

ALTER TABLE supply_requests
  ADD COLUMN IF NOT EXISTS construction_task_id INTEGER;

ALTER TABLE supply_orders
  ADD COLUMN IF NOT EXISTS construction_expense_id INTEGER;

ALTER TABLE counterparties
  ADD COLUMN IF NOT EXISTS client_segment_id INTEGER;

CREATE TABLE IF NOT EXISTS client_segments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_portal_publications (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  segment_id INTEGER,
  project_id INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_portal_appeals (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  contract_id INTEGER,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_publications_company ON client_portal_publications(company_id);
CREATE INDEX IF NOT EXISTS idx_client_appeals_buyer ON client_portal_appeals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_construction_expenses_task ON construction_expenses(construction_task_id);

-- Rollback (manual):
-- DROP TABLE IF EXISTS client_portal_appeals;
-- DROP TABLE IF EXISTS client_portal_publications;
-- DROP TABLE IF EXISTS client_segments;
