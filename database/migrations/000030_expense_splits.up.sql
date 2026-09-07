CREATE TABLE expense_splits (
    id                 TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    transaction_id     TEXT         NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id            TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_name        VARCHAR(120) NOT NULL,
    share_pct          NUMERIC(5, 2),
    share_amount_cents BIGINT       NOT NULL,
    settled_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_splits_user ON expense_splits(user_id, member_name);
CREATE INDEX idx_expense_splits_transaction ON expense_splits(transaction_id);
