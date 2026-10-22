-- Transaction archival table (same schema as transactions)
CREATE TABLE IF NOT EXISTS transactions_archive (
    id                    TEXT                     PRIMARY KEY,
    user_id               TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id            TEXT                     REFERENCES accounts(id) ON DELETE SET NULL,
    card_id               TEXT                     REFERENCES credit_cards(id) ON DELETE SET NULL,
    category_id           TEXT                     REFERENCES categories(id) ON DELETE SET NULL,
    budget_id             TEXT                     REFERENCES budgets(id) ON DELETE SET NULL,
    goal_id               TEXT                     REFERENCES goals(id) ON DELETE SET NULL,
    transfer_id           TEXT,
    is_transfer           BOOLEAN                  NOT NULL DEFAULT FALSE,
    is_invoice_payment    BOOLEAN                  NOT NULL DEFAULT FALSE,
    type                  transaction_direction    NOT NULL,
    kind                  transaction_kind         NOT NULL DEFAULT 'EXPENSE',
    status                transaction_status       NOT NULL DEFAULT 'COMPLETED',
    amount_cents          BIGINT                   NOT NULL,
    date                  TIMESTAMPTZ              NOT NULL,
    description           VARCHAR(255)             NOT NULL,
    notes                 TEXT,
    currency_code         VARCHAR(3)               NOT NULL DEFAULT 'BRL',
    original_amount_cents BIGINT,
    exchange_rate         NUMERIC(14, 6),
    iof_amount_cents      BIGINT                   NOT NULL DEFAULT 0,
    installment_group_id  TEXT,
    installment_number    SMALLINT,
    total_installments    SMALLINT,
    is_recurring          BOOLEAN                  NOT NULL DEFAULT FALSE,
    recurrence_freq       VARCHAR(20),
    recurrence_end_date   DATE,
    recurring_origin_id   TEXT,
    is_active             BOOLEAN                  NOT NULL DEFAULT TRUE,
    deleted_at            TIMESTAMPTZ,
    archived_at           TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_archive_user_date ON transactions_archive(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_archive_archived_at ON transactions_archive(archived_at);

-- Combined view for full transaction history when needed
CREATE OR REPLACE VIEW v_all_transactions AS
    SELECT 
        id, user_id, category_id, budget_id,
        type, kind, status, amount_cents, date,
        description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
        is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id,
        card_id, account_id, installment_group_id, installment_number, total_installments,
        is_invoice_payment, transfer_id, is_transfer,
        original_amount_cents, exchange_rate, iof_amount_cents,
        FALSE AS is_archived
    FROM transactions
    UNION ALL
    SELECT 
        id, user_id, category_id, budget_id,
        type, kind, status, amount_cents, date,
        description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
        is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id,
        card_id, account_id, installment_group_id, installment_number, total_installments,
        is_invoice_payment, transfer_id, is_transfer,
        original_amount_cents, exchange_rate, iof_amount_cents,
        TRUE AS is_archived
    FROM transactions_archive;
