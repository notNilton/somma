ALTER TABLE accounts
    DROP CONSTRAINT IF EXISTS accounts_holder_document_check,
    DROP COLUMN IF EXISTS balance_cents,
    DROP COLUMN IF EXISTS holder_document,
    DROP COLUMN IF EXISTS holder_document_type,
    DROP COLUMN IF EXISTS holder_name,
    DROP COLUMN IF EXISTS bank_name,
    DROP COLUMN IF EXISTS bank_code;
