CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Espelha database/migrations (000026 + 000033).
CREATE TABLE accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'CHECKING',
    currency_code VARCHAR(3) NOT NULL DEFAULT 'BRL',
    initial_balance_cents BIGINT NOT NULL DEFAULT 0,
    balance_cents BIGINT NOT NULL DEFAULT 0,
    bank_code VARCHAR(3),
    bank_name VARCHAR(100),
    holder_name VARCHAR(120),
    holder_document_type VARCHAR(4),
    holder_document VARCHAR(14),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_limit_cents BIGINT NOT NULL,
    closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE invoice_status AS ENUM ('open', 'closed', 'paid', 'overdue');

CREATE TABLE credit_card_invoices (
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

CREATE TYPE transaction_type AS ENUM ('pix_in', 'pix_out', 'debit', 'invoice_payment', 'transfer');

CREATE TABLE account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL,
    type transaction_type NOT NULL,
    description VARCHAR(255) NOT NULL,
    invoice_id UUID REFERENCES credit_card_invoices(id),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE credit_card_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    total_amount_cents BIGINT NOT NULL,
    installments_count INT NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoice_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES credit_card_purchases(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    amount_cents BIGINT NOT NULL
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_transactions_account ON account_transactions(account_id);
CREATE INDEX idx_invoices_card_status ON credit_card_invoices(credit_card_id, status);
CREATE INDEX idx_installments_invoice ON invoice_installments(invoice_id);

-- Tabela de lançamentos do app (database/migrations). Só as colunas usadas aqui;
-- os enums do banco (transaction_direction, transaction_kind, transaction_status)
-- ficam como VARCHAR para não colidir com transaction_type acima.
CREATE TABLE transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL,
    category_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    amount_cents BIGINT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description VARCHAR(255) NOT NULL,
    notes TEXT,
    type VARCHAR(20) NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'EXPENSE',
    card_id TEXT,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    transfer_id TEXT,
    is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    installment_group_id TEXT,
    installment_number SMALLINT,
    total_installments SMALLINT,
    is_invoice_payment BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_freq VARCHAR(20),
    recurrence_end_date DATE,
    recurring_origin_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
