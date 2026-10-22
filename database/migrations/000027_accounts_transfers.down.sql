DROP INDEX IF EXISTS idx_transactions_transfer_id;
DROP INDEX IF EXISTS idx_transactions_account_date;

ALTER TABLE transactions
    DROP COLUMN IF EXISTS is_transfer,
    DROP COLUMN IF EXISTS transfer_id,
    DROP COLUMN IF EXISTS account_id;

DROP INDEX IF EXISTS idx_accounts_user_id;
DROP TABLE IF EXISTS accounts;
