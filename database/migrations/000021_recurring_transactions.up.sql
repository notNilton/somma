ALTER TABLE transactions
    ADD COLUMN is_recurring         BOOLEAN  NOT NULL DEFAULT FALSE,
    ADD COLUMN recurrence_freq      VARCHAR(20),
    ADD COLUMN recurrence_end_date  DATE,
    ADD COLUMN recurring_origin_id  TEXT REFERENCES transactions(id);

CREATE INDEX idx_transactions_recurring
    ON transactions(user_id, is_recurring)
    WHERE is_recurring = TRUE AND is_active = TRUE;
