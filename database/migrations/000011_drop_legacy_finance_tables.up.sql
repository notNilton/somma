ALTER TABLE transactions DROP COLUMN IF EXISTS account_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS card_id;

DROP INDEX IF EXISTS idx_transactions_account_id;

DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS import_fingerprints CASCADE;
DROP TABLE IF EXISTS account_access CASCADE;
DROP TABLE IF EXISTS cards CASCADE;

DROP TYPE IF EXISTS access_role;
DROP TYPE IF EXISTS card_type;
