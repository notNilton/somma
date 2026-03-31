CREATE INDEX IF NOT EXISTS idx_transactions_card_date
    ON transactions(card_id, date)
    WHERE is_active = true AND card_id IS NOT NULL;
