CREATE TABLE IF NOT EXISTS barter_assets (
  id serial PRIMARY KEY,
  company_id integer NOT NULL,
  asset_type varchar(32) NOT NULL DEFAULT 'vehicle',
  title varchar(512) NOT NULL,
  identifier varchar(128),
  project_id integer,
  contract_id integer,
  status varchar(32) NOT NULL DEFAULT 'in_stock',
  accepted_amount_kgs numeric NOT NULL DEFAULT 0,
  disposed_amount_kgs numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barter_assets_company_idx ON barter_assets (company_id);
CREATE INDEX IF NOT EXISTS barter_assets_contract_idx ON barter_assets (contract_id);
CREATE INDEX IF NOT EXISTS barter_assets_project_idx ON barter_assets (project_id);

CREATE TABLE IF NOT EXISTS barter_movements (
  id serial PRIMARY KEY,
  company_id integer NOT NULL,
  asset_id integer NOT NULL REFERENCES barter_assets(id),
  direction varchar(8) NOT NULL,
  amount_kgs numeric NOT NULL,
  date varchar(16) NOT NULL,
  counterparty_id integer,
  contractor_id integer,
  project_id integer,
  contract_id integer,
  accrual_id integer,
  operation_id integer,
  purpose text,
  notes text,
  status varchar(32) NOT NULL DEFAULT 'approved',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barter_movements_company_idx ON barter_movements (company_id);
CREATE INDEX IF NOT EXISTS barter_movements_asset_idx ON barter_movements (asset_id);
CREATE INDEX IF NOT EXISTS barter_movements_operation_idx ON barter_movements (operation_id);
