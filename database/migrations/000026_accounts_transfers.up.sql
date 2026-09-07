CREATE TABLE accounts (
    id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id               TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                  VARCHAR(80) NOT NULL,
    type                  VARCHAR(20) NOT NULL DEFAULT 'CHECKING'
                          CHECK (type IN ('CHECKING', 'WALLET', 'EMERGENCY', 'INVESTMENT')),
    currency_code         VARCHAR(3)  NOT NULL DEFAULT 'BRL',
    initial_balance_cents BIGINT      NOT NULL DEFAULT 0,
    is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id) WHERE is_active = TRUE;

ALTER TABLE transactions
    ADD COLUMN account_id  TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    ADD COLUMN transfer_id TEXT,
    ADD COLUMN is_transfer BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_transactions_account_date ON transactions(account_id, date) WHERE account_id IS NOT NULL;
CREATE INDEX idx_transactions_transfer_id ON transactions(transfer_id) WHERE transfer_id IS NOT NULL;
