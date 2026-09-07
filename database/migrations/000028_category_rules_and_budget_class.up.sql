ALTER TABLE categories
    ADD COLUMN budget_class VARCHAR(12) CHECK (budget_class IN ('ESSENTIAL', 'LIFESTYLE', 'FINANCIAL'));

CREATE TABLE category_rules (
    id          TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id     TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern     VARCHAR(255) NOT NULL,
    match_type  VARCHAR(10)  NOT NULL DEFAULT 'CONTAINS' CHECK (match_type IN ('CONTAINS', 'REGEX')),
    category_id TEXT         NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    priority    INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_category_rules_user ON category_rules(user_id, priority DESC);
