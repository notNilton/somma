-- Instituição financeira e titular da conta (CPF para pessoa física, CNPJ para jurídica).
-- bank_code é o código COMPE de 3 dígitos (ex.: 001 Banco do Brasil, 260 Nubank).
ALTER TABLE accounts
    ADD COLUMN bank_code            VARCHAR(3),
    ADD COLUMN bank_name            VARCHAR(100),
    ADD COLUMN holder_name          VARCHAR(120),
    ADD COLUMN holder_document_type VARCHAR(4)
                                    CHECK (holder_document_type IN ('CPF', 'CNPJ')),
    ADD COLUMN holder_document      VARCHAR(14),
    ADD COLUMN balance_cents        BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT accounts_holder_document_check CHECK (
        (holder_document IS NULL AND holder_document_type IS NULL)
        OR (holder_document_type = 'CPF'  AND holder_document ~ '^[0-9]{11}$')
        OR (holder_document_type = 'CNPJ' AND holder_document ~ '^[0-9]{14}$')
    );

-- Saldo corrente parte do depósito inicial.
UPDATE accounts SET balance_cents = initial_balance_cents;
