DROP INDEX IF EXISTS idx_transactions_planning_plan_id;

ALTER TABLE transactions
DROP COLUMN IF EXISTS planning_plan_id;
