CREATE TABLE budgets (
    id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  TEXT        REFERENCES categories(id) ON DELETE SET NULL,
    amount_cents BIGINT      NOT NULL,
    month        INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
    year         INT         NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    notes        TEXT,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, category_id, month, year)
);

CREATE INDEX idx_budgets_user_id     ON budgets(user_id);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, year, month) WHERE is_active = true;
