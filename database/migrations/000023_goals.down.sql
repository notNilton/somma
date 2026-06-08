DROP INDEX IF EXISTS idx_transactions_goal_id;
DROP INDEX IF EXISTS idx_goals_user_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS goal_id;
DROP TABLE IF EXISTS goals;
