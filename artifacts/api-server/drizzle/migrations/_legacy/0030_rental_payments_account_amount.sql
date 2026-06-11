-- Сумма зачисления на расчётный счёт (в валюте счёта) и курс НБКР для платежей аренды
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_amount numeric(14, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate numeric(14, 6);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate_date text;

-- Для существующих строк: зачисление = сумма платежа (исторические данные без конвертации)
UPDATE payments
SET account_amount = amount::numeric
WHERE account_amount IS NULL;
