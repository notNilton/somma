CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuários da aplicação
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas Correntes / Carteiras (Débito e Pix)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    balance_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cartões de Crédito
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_limit_cents BIGINT NOT NULL,
    closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ciclos de Faturas
DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('open', 'closed', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS credit_card_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    reference_month INT NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
    reference_year INT NOT NULL CHECK (reference_year >= 2024),
    closing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status NOT NULL DEFAULT 'open',
    paid_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(credit_card_id, reference_month, reference_year)
);

-- Transações de Contas (Pix, Débito, Salários e Liquidações de Fatura)
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('pix_in', 'pix_out', 'debit', 'invoice_payment', 'transfer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL,
    type transaction_type NOT NULL,
    description VARCHAR(255) NOT NULL,
    invoice_id UUID REFERENCES credit_card_invoices(id),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compras Feitas no Cartão (Registro Pai)
CREATE TABLE IF NOT EXISTS credit_card_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    total_amount_cents BIGINT NOT NULL,
    installments_count INT NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parcelas das Compras (Associadas às Faturas)
CREATE TABLE IF NOT EXISTS invoice_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES credit_card_purchases(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    amount_cents BIGINT NOT NULL
);

-- Índices operacionais
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_card_status ON credit_card_invoices(credit_card_id, status);
CREATE INDEX IF NOT EXISTS idx_installments_invoice ON invoice_installments(invoice_id);
