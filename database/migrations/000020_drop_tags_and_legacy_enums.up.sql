-- Drop tags (not part of simplified model)
DROP TABLE IF EXISTS transaction_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Drop unused budget target_date (nullable and never exposed by the API)
ALTER TABLE budgets DROP COLUMN IF EXISTS target_date;

-- Drop legacy enum types left over from the original schema
DROP TYPE IF EXISTS account_type;
DROP TYPE IF EXISTS account_ownership;
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS transaction_channel;
DROP TYPE IF EXISTS transaction_classification;
DROP TYPE IF EXISTS maintenance_type;
DROP TYPE IF EXISTS fuel_type;
DROP TYPE IF EXISTS transaction_type;
