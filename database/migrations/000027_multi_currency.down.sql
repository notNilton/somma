ALTER TABLE transactions
    DROP COLUMN IF EXISTS iof_amount_cents,
    DROP COLUMN IF EXISTS exchange_rate,
    DROP COLUMN IF EXISTS original_amount_cents;
