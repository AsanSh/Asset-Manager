-- CRM lead intake: channel, project, external id for social/webhook dedup
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS project_id integer;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS external_id text;

CREATE INDEX IF NOT EXISTS idx_crm_leads_channel ON crm_leads(channel);
CREATE INDEX IF NOT EXISTS idx_crm_leads_project_id ON crm_leads(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_company_channel_external
  ON crm_leads(company_id, channel, external_id)
  WHERE external_id IS NOT NULL AND channel IS NOT NULL;

-- Rollback (manual):
-- DROP INDEX IF EXISTS idx_crm_leads_company_channel_external;
-- DROP INDEX IF EXISTS idx_crm_leads_project_id;
-- DROP INDEX IF EXISTS idx_crm_leads_channel;
-- ALTER TABLE crm_leads DROP COLUMN IF EXISTS external_id;
-- ALTER TABLE crm_leads DROP COLUMN IF EXISTS project_id;
-- ALTER TABLE crm_leads DROP COLUMN IF EXISTS channel;
