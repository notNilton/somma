ALTER TABLE accounts
    DROP COLUMN IF EXISTS bank_agency,
    DROP COLUMN IF EXISTS bank_code;
