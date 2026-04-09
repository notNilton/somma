CREATE TABLE planning_plans (
    id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id             TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                TEXT        NOT NULL,
    target_amount_cents BIGINT      NOT NULL CHECK (target_amount_cents > 0),
    target_date         DATE,
    status              TEXT        NOT NULL DEFAULT 'ACTIVE',
    notes               TEXT,
    color               TEXT,
    icon                TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE planning_plan_items (
    id                     TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    plan_id                TEXT        NOT NULL REFERENCES planning_plans(id) ON DELETE CASCADE,
    category_id            TEXT        REFERENCES categories(id) ON DELETE SET NULL,
    name                   TEXT        NOT NULL,
    estimated_amount_cents BIGINT      NOT NULL CHECK (estimated_amount_cents > 0),
    notes                  TEXT,
    sort_order             INT         NOT NULL DEFAULT 0,
    is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE planning_contributions (
    id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    plan_id           TEXT        NOT NULL REFERENCES planning_plans(id) ON DELETE CASCADE,
    amount_cents      BIGINT      NOT NULL CHECK (amount_cents > 0),
    contribution_date DATE        NOT NULL,
    notes             TEXT,
    is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_planning_plans_user_id ON planning_plans(user_id) WHERE is_active = true;
CREATE INDEX idx_planning_plan_items_plan_id ON planning_plan_items(plan_id) WHERE is_active = true;
CREATE INDEX idx_planning_contributions_plan_id ON planning_contributions(plan_id) WHERE is_active = true;
