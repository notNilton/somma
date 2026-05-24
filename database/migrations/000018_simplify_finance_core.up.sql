CREATE TYPE transaction_direction AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE transaction_kind AS ENUM ('INCOME', 'EXPENSE', 'SAVING', 'BUDGET', 'CREDIT');

ALTER TABLE categories
    ADD COLUMN direction transaction_direction;

UPDATE categories
SET direction = CASE
    WHEN type = 'INCOME' THEN 'INCOME'::transaction_direction
    ELSE 'EXPENSE'::transaction_direction
END;

ALTER TABLE categories
    ALTER COLUMN direction SET NOT NULL;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_name_type_key;
ALTER TABLE categories DROP COLUMN type;
ALTER TABLE categories RENAME COLUMN direction TO type;
ALTER TABLE categories ADD CONSTRAINT categories_user_id_name_type_key UNIQUE (user_id, name, type);

ALTER TABLE budgets
    ADD COLUMN allocated_amount_cents BIGINT NOT NULL DEFAULT 0;

ALTER TABLE transactions
    ADD COLUMN direction transaction_direction,
    ADD COLUMN kind transaction_kind NOT NULL DEFAULT 'EXPENSE';

UPDATE transactions
SET
    direction = CASE
        WHEN type IN ('INCOME', 'RETURN') THEN 'INCOME'::transaction_direction
        ELSE 'EXPENSE'::transaction_direction
    END,
    kind = CASE
        WHEN type = 'INCOME' THEN 'INCOME'::transaction_kind
        WHEN type = 'RETURN' THEN 'INCOME'::transaction_kind
        WHEN type = 'INVESTMENT' THEN 'SAVING'::transaction_kind
        WHEN type = 'CREDIT' THEN 'CREDIT'::transaction_kind
        ELSE 'EXPENSE'::transaction_kind
    END;

ALTER TABLE transactions
    ALTER COLUMN direction SET NOT NULL;

ALTER TABLE transactions DROP COLUMN type;
ALTER TABLE transactions RENAME COLUMN direction TO type;

ALTER TABLE transactions
    DROP COLUMN IF EXISTS budget_item_id,
    DROP COLUMN IF EXISTS classification,
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS channel,
    DROP COLUMN IF EXISTS is_recurring,
    DROP COLUMN IF EXISTS total_installments,
    DROP COLUMN IF EXISTS paid_installments,
    DROP COLUMN IF EXISTS affects_account,
    DROP COLUMN IF EXISTS account_id,
    DROP COLUMN IF EXISTS card_id;

DROP TABLE IF EXISTS refueling_logs CASCADE;
DROP TABLE IF EXISTS vehicle_maintenances CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS account_access CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS import_fingerprints CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;

DROP INDEX IF EXISTS idx_transactions_budget_item_id;
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);
