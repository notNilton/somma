DROP TABLE IF EXISTS card_invoice_payments;

DROP INDEX IF EXISTS idx_transactions_installment_group;
DROP INDEX IF EXISTS idx_transactions_card_date;

ALTER TABLE transactions
    DROP COLUMN IF EXISTS is_invoice_payment,
    DROP COLUMN IF EXISTS total_installments,
    DROP COLUMN IF EXISTS installment_number,
    DROP COLUMN IF EXISTS installment_group_id,
    DROP COLUMN IF EXISTS card_id;

DROP INDEX IF EXISTS idx_credit_cards_user_id;
DROP TABLE IF EXISTS credit_cards;
