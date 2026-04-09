ALTER TABLE transactions
ADD COLUMN planning_plan_id TEXT REFERENCES planning_plans(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_planning_plan_id
ON transactions(planning_plan_id)
WHERE is_active = true AND planning_plan_id IS NOT NULL;
