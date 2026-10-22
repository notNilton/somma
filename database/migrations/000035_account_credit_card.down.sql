DROP INDEX IF EXISTS idx_credit_cards_account;
ALTER TABLE credit_cards DROP COLUMN IF EXISTS account_id;
