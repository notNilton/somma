DROP INDEX IF EXISTS idx_transactions_recurring;

ALTER TABLE transactions
    DROP COLUMN IF EXISTS is_recurring,
    DROP COLUMN IF EXISTS recurrence_freq,
    DROP COLUMN IF EXISTS recurrence_end_date,
    DROP COLUMN IF EXISTS recurring_origin_id;
