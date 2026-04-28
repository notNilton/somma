-- Seed baseline minimal para Mirante
-- Usuario, contas bancarias e veiculo para subir a aplicacao sem historico financeiro.

-- 0. Limpeza em ordem respeitando FKs
TRUNCATE TABLE
    transaction_tags,
    refueling_logs,
    transfers,
    transactions,
    import_fingerprints,
    account_access,
    cards,
    categories,
    tags,
    accounts,
    vehicles,
    users
RESTART IDENTITY CASCADE;

-- 1. Usuarios
INSERT INTO users (
    id,
    email,
    name,
    phone,
    cpf,
    privacy_mode_enabled,
    password_hash
)
VALUES
    (
        'd290f1ee-6c54-4b01-90e6-d701748f0851',
        'nilton.naab@gmail.com',
        'Nilton Santos',
        '65999990001',
        '123.456.789-00',
        FALSE,
        '$2a$12$.XnRfSRpVjfhFU0UQ22nIeNP1sFTsC4behpNxSjCfPUepv2wklE2u'
    )
ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    cpf = EXCLUDED.cpf,
    privacy_mode_enabled = EXCLUDED.privacy_mode_enabled,
    password_hash = EXCLUDED.password_hash;

-- 2. Contas
INSERT INTO accounts (
    id,
    user_id,
    name,
    type,
    ownership,
    bank_name,
    cpf,
    cnpj,
    color,
    icon,
    currency_code,
    balance_cents,
    credit_limit_cents,
    has_debit,
    has_pix,
    has_credit,
    include_in_total,
    closing_day,
    due_day,
    is_active
)
VALUES
    ('acc-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank CPF',        'CHECKING', 'PERSONAL', 'Nubank',          '123.456.789-00', NULL, '#8A05BE', 'bank',      'BRL',  50000, 830000, TRUE, TRUE,  TRUE,  TRUE,  7, 15, TRUE),
    ('acc-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Banco do Brasil CPF','CHECKING', 'PERSONAL', 'Banco do Brasil', '123.456.789-00', NULL, '#F4C400', 'bank',      'BRL',   8300,      0, TRUE, TRUE,  FALSE, TRUE, NULL, NULL, TRUE),
    ('acc-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Mercado Pago CPF',   'WALLET',   'PERSONAL', 'Mercado Pago',    '123.456.789-00', NULL, '#00B4D8', 'wallet',    'BRL',      0, 320000, TRUE, TRUE,  TRUE,  TRUE,  5, 15, TRUE),
    ('acc-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank CNPJ',        'CHECKING', 'BUSINESS', 'Nubank',          NULL, '12.345.678/0001-90', '#5E35B1', 'briefcase', 'BRL',      0, 320000, TRUE, TRUE,  TRUE,  TRUE, 10, 20, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Veiculos
INSERT INTO vehicles (
    id,
    user_id,
    name,
    brand,
    model,
    year,
    license_plate,
    tank,
    is_active
)
VALUES
    ('veh-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Fiat Uno Mille', 'Fiat', 'Uno Mille', 2012, 'OBH-2417', 45.00, TRUE)
ON CONFLICT (id) DO NOTHING;
