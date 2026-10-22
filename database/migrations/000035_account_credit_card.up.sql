-- Cada conta bancária tem no máximo um cartão de crédito (a função crédito da conta).
ALTER TABLE credit_cards
    ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_credit_cards_account ON credit_cards(account_id)
    WHERE account_id IS NOT NULL AND is_active = TRUE;
