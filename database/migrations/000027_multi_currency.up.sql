ALTER TABLE transactions
    ADD COLUMN original_amount_cents BIGINT,
    ADD COLUMN exchange_rate         NUMERIC(14, 6),
    ADD COLUMN iof_amount_cents      BIGINT NOT NULL DEFAULT 0;
