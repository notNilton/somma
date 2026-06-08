CREATE TABLE budget_alerts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    budget_name TEXT NOT NULL,
    threshold_pct INT NOT NULL,
    percent_used NUMERIC(5,2) NOT NULL,
    allocated_cents BIGINT NOT NULL,
    spent_cents BIGINT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_budget_alerts_user_id ON budget_alerts(user_id, created_at DESC);
CREATE INDEX idx_budget_alerts_budget_id ON budget_alerts(budget_id, created_at DESC);
