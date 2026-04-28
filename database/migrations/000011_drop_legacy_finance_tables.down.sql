CREATE TYPE IF NOT EXISTS card_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE IF NOT EXISTS access_role AS ENUM ('EDITOR', 'VIEWER');

CREATE TABLE IF NOT EXISTS cards (
    id                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id            TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id         TEXT        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name               VARCHAR(100) NOT NULL,
    brand              VARCHAR(50),
    last4              VARCHAR(4),
    type               card_type   NOT NULL,
    credit_limit_cents BIGINT,
    color              VARCHAR(7),
    icon               TEXT,
    closing_day        INT,
    due_day            INT,
    is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_access (
    id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id TEXT        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       access_role NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, user_id)
);

CREATE TABLE IF NOT EXISTS transfers (
    id                         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    source_transaction_id      TEXT        NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    destination_transaction_id TEXT        NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_fingerprints (
    hash       VARCHAR(64) PRIMARY KEY,
    account_id TEXT        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS account_id TEXT,
    ADD COLUMN IF NOT EXISTS card_id TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
