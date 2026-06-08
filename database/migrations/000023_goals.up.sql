CREATE TABLE goals (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    target_amount_cents BIGINT NOT NULL,
    color       VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    target_date DATE,
    is_achieved BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions
    ADD COLUMN goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL;

CREATE INDEX idx_goals_user_id ON goals(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_transactions_goal_id ON transactions(goal_id) WHERE goal_id IS NOT NULL;
