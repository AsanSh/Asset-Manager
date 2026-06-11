-- Контрагент для прихода (плательщик) и расхода (получатель) в операциях стройки
ALTER TABLE construction_operations
  ADD COLUMN IF NOT EXISTS counterparty_id integer;

CREATE INDEX IF NOT EXISTS construction_operations_company_counterparty_idx
  ON construction_operations (company_id, counterparty_id)
  WHERE counterparty_id IS NOT NULL;

-- rollback:
-- DROP INDEX IF EXISTS construction_operations_company_counterparty_idx;
-- ALTER TABLE construction_operations DROP COLUMN IF EXISTS counterparty_id;
