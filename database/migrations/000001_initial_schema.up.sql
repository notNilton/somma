-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE account_type AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'WALLET', 'INVESTMENT');
CREATE TYPE account_ownership AS ENUM ('PERSONAL', 'BUSINESS');
CREATE TYPE card_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE access_role AS ENUM ('EDITOR', 'VIEWER');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT');
CREATE TYPE transaction_classification AS ENUM ('COMMON', 'FUEL', 'MAINTENANCE', 'TRANSFER');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');
CREATE TYPE payment_method AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE transaction_channel AS ENUM ('CARD_CREDIT', 'CARD_DEBIT', 'PIX', 'BANK');
CREATE TYPE maintenance_type AS ENUM ('OIL_CHANGE', 'TIRE_CHANGE', 'PREVENTIVE', 'REPAIR', 'PART_REPLACEMENT', 'OTHER');
CREATE TYPE fuel_type AS ENUM ('GASOLINA_COMUM', 'GASOLINA_ADITIVADA', 'ETANOL', 'DIESEL', 'GNV');

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE users (
    id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email                VARCHAR(255) NOT NULL UNIQUE,
    password_hash        TEXT        NOT NULL,
    name                 TEXT,
    phone                VARCHAR(20),
    cpf                  VARCHAR(14) UNIQUE,
    cnpj                 VARCHAR(18) UNIQUE,
    avatar_url           TEXT,
    privacy_mode_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Accounts
-- Valores monetários em centavos (BIGINT) — sem Decimal
-- ============================================================
CREATE TABLE accounts (
    id                 TEXT             PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id            TEXT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name               VARCHAR(100)     NOT NULL,
    type               account_type     NOT NULL,
    ownership          account_ownership NOT NULL DEFAULT 'PERSONAL',
    bank_name          VARCHAR(100),
    cpf                VARCHAR(14),
    cnpj               VARCHAR(18),
    color              VARCHAR(7),
    icon               TEXT,
    currency_code      VARCHAR(3)       NOT NULL DEFAULT 'BRL',
    balance_cents      BIGINT           NOT NULL DEFAULT 0,
    credit_limit_cents BIGINT,
    has_debit          BOOLEAN          NOT NULL DEFAULT TRUE,
    has_pix            BOOLEAN          NOT NULL DEFAULT TRUE,
    has_credit         BOOLEAN          NOT NULL DEFAULT FALSE,
    include_in_total   BOOLEAN          NOT NULL DEFAULT TRUE,
    closing_day        INT,
    due_day            INT,
    is_active          BOOLEAN          NOT NULL DEFAULT TRUE,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Cards
-- ============================================================
CREATE TABLE cards (
    id                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id            TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id         TEXT        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name               VARCHAR(100) NOT NULL,
    brand              VARCHAR(50),
    last4              VARCHAR(4),
    type               card_type   NOT NULL,
    credit_limit_cents BIGINT,
    color              VARCHAR(7),
    icon               TEXT,
    closing_day        INT,
    due_day            INT,
    is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Account Access (compartilhamento)
-- ============================================================
CREATE TABLE account_access (
    id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id TEXT        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       access_role NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, user_id)
);

-- ============================================================
-- Categories
-- ============================================================
CREATE TABLE categories (
    id          TEXT             PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id     TEXT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(50)      NOT NULL,
    type        transaction_type NOT NULL,
    description VARCHAR(255),
    color       VARCHAR(7),
    parent_id   TEXT             REFERENCES categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name, type)
);

-- ============================================================
-- Tags
-- ============================================================
CREATE TABLE tags (
    id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name       TEXT        NOT NULL,
    color      VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Transactions
-- amount em centavos (BIGINT)
-- ============================================================
CREATE TABLE transactions (
    id                 TEXT                     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id            TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id         TEXT                     NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    card_id            TEXT                     REFERENCES cards(id) ON DELETE SET NULL,
    category_id        TEXT                     REFERENCES categories(id) ON DELETE SET NULL,
    type               transaction_type         NOT NULL,
    classification     transaction_classification NOT NULL DEFAULT 'COMMON',
    payment_method     payment_method           NOT NULL DEFAULT 'DEBIT',
    channel            transaction_channel      NOT NULL DEFAULT 'BANK',
    status             transaction_status       NOT NULL DEFAULT 'COMPLETED',
    is_recurring       BOOLEAN                  NOT NULL DEFAULT FALSE,
    amount_cents       BIGINT                   NOT NULL,
    total_installments INT,
    paid_installments  INT,
    date               TIMESTAMPTZ              NOT NULL,
    description        VARCHAR(255)             NOT NULL,
    notes              TEXT,
    currency_code      VARCHAR(3)               NOT NULL DEFAULT 'BRL',
    affects_account    BOOLEAN                  NOT NULL DEFAULT TRUE,
    is_active          BOOLEAN                  NOT NULL DEFAULT TRUE,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Transaction-Tag (many-to-many)
-- ============================================================
CREATE TABLE transaction_tags (
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id         TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

-- ============================================================
-- Transfers (link entre transações de origem e destino)
-- ============================================================
CREATE TABLE transfers (
    id                         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    source_transaction_id      TEXT        NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    destination_transaction_id TEXT        NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Vehicles
-- tank em litros (NUMERIC) — não é dinheiro, mantém decimal
-- ============================================================
CREATE TABLE vehicles (
    id            TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id       TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    license_plate VARCHAR(10),
    brand         VARCHAR(50),
    model         VARCHAR(50),
    year          INT,
    tank          NUMERIC(10,2) DEFAULT 50.00,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Refueling Logs
-- price_per_liter em centavos, current_km e liters são grandezas físicas
-- ============================================================
CREATE TABLE refueling_logs (
    id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    vehicle_id           TEXT        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    transaction_id       TEXT        NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    station              VARCHAR(100),
    fuel_type            fuel_type,
    current_km           NUMERIC(10,2),
    liters               NUMERIC(8,3),
    price_per_liter_cents BIGINT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Vehicle Maintenances
-- ============================================================
CREATE TABLE vehicle_maintenances (
    id               TEXT             PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    vehicle_id       TEXT             NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    transaction_id   TEXT             NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    maintenance_type maintenance_type NOT NULL,
    provider         VARCHAR(100),
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Import Fingerprints (deduplicação de CSV)
-- hash é a PK — ON CONFLICT DO NOTHING é a interface principal
-- ============================================================
CREATE TABLE import_fingerprints (
    hash       VARCHAR(64) PRIMARY KEY,
    account_id TEXT        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_accounts_user_id        ON accounts(user_id);
CREATE INDEX idx_accounts_active         ON accounts(user_id, is_active);
CREATE INDEX idx_cards_user_id           ON cards(user_id);
CREATE INDEX idx_categories_user_id      ON categories(user_id);
CREATE INDEX idx_transactions_user_id    ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date       ON transactions(date);
CREATE INDEX idx_transactions_user_date  ON transactions(user_id, date);
CREATE INDEX idx_vehicles_user_id        ON vehicles(user_id);
