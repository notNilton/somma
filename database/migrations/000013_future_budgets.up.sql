DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;

CREATE TABLE IF NOT EXISTS budgets (
    id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    target_date  DATE        NOT NULL,
    notes        TEXT,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id       ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_target_date   ON budgets(user_id, target_date) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS budget_items (
    id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    budget_id    TEXT        NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id  TEXT        REFERENCES categories(id) ON DELETE SET NULL,
    name         VARCHAR(120) NOT NULL,
    amount_cents BIGINT      NOT NULL,
    sort_order   INT         NOT NULL DEFAULT 0,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS budget_id TEXT REFERENCES budgets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS budget_item_id TEXT REFERENCES budget_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_budget_id      ON transactions(budget_id);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_item_id ON transactions(budget_item_id);
