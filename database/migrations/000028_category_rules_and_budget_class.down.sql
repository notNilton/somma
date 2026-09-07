DROP INDEX IF EXISTS idx_category_rules_user;
DROP TABLE IF EXISTS category_rules;

ALTER TABLE categories
    DROP COLUMN IF EXISTS budget_class;
