-- Remove Planning column from transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS planning_plan_id;

-- Drop Tables
DROP TABLE IF EXISTS planning_contributions;
DROP TABLE IF EXISTS planning_plan_items;
DROP TABLE IF EXISTS planning_plans;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS vehicle_maintenances;

-- Note: We generally don't drop types in migrations if they might be used elsewhere, 
-- but since we are simplifying and these were specific to these modules, we could.
-- However, for safety in this step, I'll just leave the enums but they won't be used.
