UPDATE budgets
SET target_date = CURRENT_DATE
WHERE target_date IS NULL;

ALTER TABLE budgets
    ALTER COLUMN target_date SET NOT NULL;
