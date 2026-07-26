BEGIN;

TRUNCATE TABLE
    transactions,
    budgets,
    categories,
    users
RESTART IDENTITY CASCADE;

-- dev credentials: nilton.naab@gmail.com / dev-password-123
INSERT INTO users (id, email, name, phone, cpf, privacy_mode_enabled, password_hash)
VALUES
    (
        'd290f1ee-6c54-4b01-90e6-d701748f0851',
        'nilton.naab@gmail.com',
        'Nilton Santos',
        '65999990001',
        '123.456.789-00',
        FALSE,
        '$2a$12$WrIQ0w9BpDBQBGRdJtq.6.r1lsF1FEEovx2b2xRi6.Yg.qkGzxKWC'
    )
ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    cpf = EXCLUDED.cpf,
    privacy_mode_enabled = EXCLUDED.privacy_mode_enabled,
    password_hash = EXCLUDED.password_hash;

INSERT INTO categories (id, user_id, name, type, description, color, parent_id)
VALUES
    ('cat-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Renda Principal', 'INCOME', 'Entradas principais do mes', '#16a34a', NULL),
    ('cat-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Freelancer',      'INCOME', 'Entradas extras',           '#0f766e', NULL),
    ('cat-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Moradia',         'EXPENSE', 'Casa e contas fixas',      '#dc2626', NULL),
    ('cat-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Alimentacao',     'EXPENSE', 'Mercado e refeicoes',      '#ea580c', NULL),
    ('cat-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva',         'EXPENSE', 'Economia e caixa futuro',  '#2563eb', NULL),
    ('cat-6', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Cartao',          'EXPENSE', 'Compras feitas no credito','#7c3aed', NULL),
    ('cat-7', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Combustível',     'EXPENSE', 'Gastos com veículos e combustivel', '#0284c7', NULL)
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO budgets (id, user_id, name, allocated_amount_cents, notes, is_active)
VALUES
    ('bud-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Viagem Sao Paulo', 900000, 'Reserva principal da viagem',              TRUE),
    ('bud-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Fundo da Casa',    250000, 'Pequenos ajustes e manutencao da casa',     TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, user_id, name, license_plate, brand, model, year, tank_liters, fuel_type, odometer_km, is_active)
VALUES
    ('veh-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Honda Civic', 'ABC-1D23', 'Honda', 'Civic EXL', 2022, 50.00, 'Gasolina', 45800.00, TRUE),
    ('veh-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Fiat Toro',   'XYZ-9876', 'Fiat',  'Toro Ultra', 2024, 60.00, 'Diesel',   28500.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (
    id, user_id, category_id, budget_id, type, kind, status,
    amount_cents, date, description, notes, currency_code, is_active
)
VALUES
    ('tra-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-1', NULL,    'INCOME',  'INCOME',  'COMPLETED', 1200000, TIMESTAMPTZ '2026-05-02 12:00:00Z', 'Salario',          NULL, 'BRL', TRUE),
    ('tra-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2', NULL,    'INCOME',  'INCOME',  'COMPLETED',  280000, TIMESTAMPTZ '2026-05-04 12:00:00Z', 'Freelancer',       NULL, 'BRL', TRUE),
    ('tra-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-3', NULL,    'EXPENSE', 'EXPENSE', 'COMPLETED',  310000, TIMESTAMPTZ '2026-05-05 12:00:00Z', 'Aluguel',          NULL, 'BRL', TRUE),
    ('tra-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL,    'EXPENSE', 'EXPENSE', 'COMPLETED',    8640, TIMESTAMPTZ '2026-05-06 12:00:00Z', 'Almoco',           NULL, 'BRL', TRUE),
    ('tra-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL,    'EXPENSE', 'SAVING',  'COMPLETED',  150000, TIMESTAMPTZ '2026-05-07 12:00:00Z', 'Reserva do mes',   NULL, 'BRL', TRUE),
    ('tra-6', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-6', NULL,    'EXPENSE', 'CREDIT',  'COMPLETED',   45990, TIMESTAMPTZ '2026-05-08 12:00:00Z', 'Compra parcelada', NULL, 'BRL', TRUE),
    ('tra-7', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', 'bud-1', 'EXPENSE', 'BUDGET',  'COMPLETED',  120000, TIMESTAMPTZ '2026-05-10 12:00:00Z', 'Passagem',         NULL, 'BRL', TRUE),
    ('tra-8', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-3', 'bud-2', 'EXPENSE', 'BUDGET',  'PENDING',     35000, TIMESTAMPTZ '2026-06-01 12:00:00Z', 'Ajuste eletrica',  NULL, 'BRL', TRUE),
    ('tra-ref-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 23560, TIMESTAMPTZ '2026-07-10 12:00:00Z', 'Abastecimento: Honda Civic (40.0L @ R$ 5,89)', 'Posto Shell', 'BRL', TRUE),
    ('tra-ref-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 31200, TIMESTAMPTZ '2026-07-18 12:00:00Z', 'Abastecimento: Fiat Toro (48.0L @ R$ 6,50)', 'Posto Ipiranga', 'BRL', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO refueling_logs (id, vehicle_id, transaction_id, user_id, date, station, fuel_type, current_km, liters, price_per_liter_cents, total_amount_cents, is_full_tank, notes)
VALUES
    ('ref-1', 'veh-1', 'tra-ref-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', TIMESTAMPTZ '2026-07-10 12:00:00Z', 'Posto Shell',    'Gasolina', 45300.00, 40.000, 589, 23560, TRUE, 'Abastecimento completo'),
    ('ref-2', 'veh-2', 'tra-ref-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', TIMESTAMPTZ '2026-07-18 12:00:00Z', 'Posto Ipiranga', 'Diesel',   28500.00, 48.000, 650, 31200, TRUE, 'Tanque cheio S10')
ON CONFLICT (id) DO NOTHING;

COMMIT;
