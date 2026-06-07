ALTER TABLE users
    ADD COLUMN initial_balance_cents BIGINT NOT NULL DEFAULT 0;
