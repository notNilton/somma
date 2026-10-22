CREATE TABLE credit_cards (
    id                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id            TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name               VARCHAR(80) NOT NULL,
    brand              VARCHAR(30),
    last4              VARCHAR(4),
    credit_limit_cents BIGINT      NOT NULL DEFAULT 0,
    closing_day        SMALLINT    NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day            SMALLINT    NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id) WHERE is_active = TRUE;

ALTER TABLE transactions
    ADD COLUMN card_id              TEXT REFERENCES credit_cards(id) ON DELETE SET NULL,
    ADD COLUMN installment_group_id TEXT,
    ADD COLUMN installment_number   SMALLINT,
    ADD COLUMN total_installments   SMALLINT,
    ADD COLUMN is_invoice_payment   BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_transactions_card_date ON transactions(card_id, date) WHERE card_id IS NOT NULL;
CREATE INDEX idx_transactions_installment_group ON transactions(installment_group_id) WHERE installment_group_id IS NOT NULL;

CREATE TABLE card_invoice_payments (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id         TEXT        NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    reference_month DATE        NOT NULL,
    amount_cents    BIGINT      NOT NULL,
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id  TEXT        REFERENCES transactions(id) ON DELETE SET NULL,
    UNIQUE (card_id, reference_month)
);

CREATE INDEX idx_card_invoice_payments_user ON card_invoice_payments(user_id, reference_month DESC);
