-- CRM Module Database Migration
-- Creates tables for Leads, Clients, Deals, Sales Contracts, and Sales Properties

-- ════════════════════════════════════════════════════════════════════════════
-- CRM LEADS (Лиды)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_leads (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT, -- call/website/referral/advertising/other
  status TEXT NOT NULL DEFAULT 'new', -- new/contacted/qualified/lost/converted
  property_type TEXT, -- apartment/commercial/land/etc
  budget NUMERIC(15, 2),
  currency TEXT DEFAULT 'KGS',
  notes TEXT,
  assigned_user_id INTEGER,
  created_by INTEGER,
  lead_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_id ON crm_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads(source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_user_id ON crm_leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_date ON crm_leads(lead_date);

-- ════════════════════════════════════════════════════════════════════════════
-- CRM CLIENTS (Клиенты)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_clients (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  full_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'individual', -- individual/company
  phone TEXT,
  email TEXT,
  address TEXT,
  inn TEXT, -- Tax ID
  passport_data TEXT,
  birth_date TIMESTAMPTZ,
  budget NUMERIC(15, 2),
  currency TEXT DEFAULT 'KGS',
  credit_approved TEXT, -- yes/no/pending
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active/inactive
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_clients_company_id ON crm_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_type ON crm_clients(type);
CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON crm_clients(status);
CREATE INDEX IF NOT EXISTS idx_crm_clients_email ON crm_clients(email);
CREATE INDEX IF NOT EXISTS idx_crm_clients_phone ON crm_clients(phone);

-- ════════════════════════════════════════════════════════════════════════════
-- CRM DEALS (Сделки)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_deals (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  client_id INTEGER NOT NULL,
  property_id INTEGER,
  deal_amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KGS',
  stage TEXT NOT NULL DEFAULT 'lead', -- lead/viewing/negotiation/contract/closed_won/closed_lost
  probability INTEGER DEFAULT 10, -- 0-100%
  expected_close_date TIMESTAMPTZ,
  actual_close_date TIMESTAMPTZ,
  assigned_user_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_deals_company_id ON crm_deals(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_client_id ON crm_deals(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_property_id ON crm_deals(property_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_assigned_user_id ON crm_deals(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_expected_close_date ON crm_deals(expected_close_date);

-- ════════════════════════════════════════════════════════════════════════════
-- CRM SALES CONTRACTS (Договоры продажи)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_sales_contracts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  contract_number TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  total_amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KGS',
  payment_schedule JSONB, -- Array of {date, amount, status, description}
  sign_date TIMESTAMPTZ,
  registration_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- draft/signed/registered/cancelled
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_sales_contracts_company_id ON crm_sales_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_contracts_client_id ON crm_sales_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_contracts_property_id ON crm_sales_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_contracts_status ON crm_sales_contracts(status);
CREATE INDEX IF NOT EXISTS idx_crm_sales_contracts_contract_number ON crm_sales_contracts(contract_number);

-- ════════════════════════════════════════════════════════════════════════════
-- CRM SALES PROPERTIES (Объекты на продажу)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_sales_properties (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,
  property_id INTEGER NOT NULL,
  sale_price NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KGS',
  status TEXT NOT NULL DEFAULT 'available', -- available/reserved/sold
  marketing_description TEXT,
  photos JSONB, -- Array of URLs
  available_from TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_sales_properties_company_id ON crm_sales_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_properties_property_id ON crm_sales_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_properties_status ON crm_sales_properties(status);

-- ════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE crm_leads IS 'CRM Leads table - potential customers who have shown interest';
COMMENT ON TABLE crm_clients IS 'CRM Clients table - qualified customers who can make purchases';
COMMENT ON TABLE crm_deals IS 'CRM Deals table - sales opportunities with clients';
COMMENT ON TABLE crm_sales_contracts IS 'CRM Sales Contracts table - formal agreements for property sales';
COMMENT ON TABLE crm_sales_properties IS 'CRM Sales Properties table - properties listed for sale';

-- ════════════════════════════════════════════════════════════════════════════
-- FOREIGN KEY CONSTRAINTS (optional, add if needed)
-- ════════════════════════════════════════════════════════════════════════════

-- Uncomment these if you want referential integrity enforcement:

-- ALTER TABLE crm_leads
--   ADD CONSTRAINT fk_crm_leads_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_crm_leads_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
--   ADD CONSTRAINT fk_crm_leads_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ALTER TABLE crm_clients
--   ADD CONSTRAINT fk_crm_clients_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- ALTER TABLE crm_deals
--   ADD CONSTRAINT fk_crm_deals_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_crm_deals_client FOREIGN KEY (client_id) REFERENCES crm_clients(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_crm_deals_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
--   ADD CONSTRAINT fk_crm_deals_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ALTER TABLE crm_sales_contracts
--   ADD CONSTRAINT fk_crm_sales_contracts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_crm_sales_contracts_client FOREIGN KEY (client_id) REFERENCES crm_clients(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_crm_sales_contracts_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- ALTER TABLE crm_sales_properties
--   ADD CONSTRAINT fk_crm_sales_properties_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_crm_sales_properties_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS FOR updated_at
-- ════════════════════════════════════════════════════════════════════════════

-- Create or replace the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all CRM tables
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_clients_updated_at
  BEFORE UPDATE ON crm_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_sales_contracts_updated_at
  BEFORE UPDATE ON crm_sales_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_sales_properties_updated_at
  BEFORE UPDATE ON crm_sales_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
