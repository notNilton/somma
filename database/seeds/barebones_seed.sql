TRUNCATE TABLE
    transactions,
    budgets,
    categories,
    users
RESTART IDENTITY CASCADE;

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
        '$2y$12$wIeB0/bWpmLYhsIbzroCnOWP8KVCOJhFQEHjd3WvUxio5vWtwirdm'
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
    ('cat-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Renda Principal', 'INCOME', 'Entrada principal', '#16a34a', NULL),
    ('cat-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Despesas Gerais', 'EXPENSE', 'Saidas gerais', '#dc2626', NULL),
    ('cat-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Economia', 'EXPENSE', 'Reserva e poupanca', '#2563eb', NULL)
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO budgets (id, user_id, name, allocated_amount_cents, notes, is_active)
VALUES
    ('bud-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva Geral', 300000, 'Budget inicial', TRUE)
ON CONFLICT (id) DO NOTHING;
