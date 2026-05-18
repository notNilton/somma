-- Seed baseline minimal para Tallyoh
-- Usuario, contas bancarias e veiculo para subir a aplicacao sem historico financeiro.

-- 0. Limpeza em ordem respeitando FKs
TRUNCATE TABLE
    transaction_tags,
    refueling_logs,
    transactions,
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
        '$2a$12$iq.G1.ngHpYLHTFgUNOyQ.wpNq.qJNPOy8sF/uEU8LxRfYjCCStYO'
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
    bank_code,
    bank_agency,
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
    ('acc-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank CPF',        'CHECKING', 'PERSONAL', 'Nubank', '0260', '0001', '123.456.789-00', NULL, '#8A05BE', 'bank',      'BRL',  50000, 830000, TRUE, TRUE,  TRUE,  TRUE,  7, 15, TRUE),
    ('acc-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank CNPJ',       'CHECKING', 'BUSINESS', 'Nubank', '0260', '0001', NULL, '12.345.678/0001-90', '#5E35B1', 'briefcase', 'BRL',      0, 320000, TRUE, TRUE,  TRUE,  TRUE, 10, 20, TRUE)
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

-- 4. Categorias basicas
INSERT INTO categories (id, user_id, name, type, description, color, parent_id)
VALUES
    ('cat-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Salario', 'INCOME', 'Recebimentos mensais de trabalho', '#43A047', NULL),
    ('cat-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Freelance', 'INCOME', 'Servicos avulsos e trabalhos extras', '#00ACC1', NULL),
    ('cat-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reembolsos', 'INCOME', 'Valores devolvidos ou estornos', '#5C6BC0', NULL),
    ('cat-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Alimentacao', 'EXPENSE', 'Mercado, lanches e restaurantes', '#EF5350', NULL),
    ('cat-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Moradia', 'EXPENSE', 'Aluguel, condominio e contas da casa', '#8E24AA', NULL),
    ('cat-6', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Transporte', 'EXPENSE', 'Combustivel, manutencao e deslocamentos', '#FFB300', NULL),
    ('cat-7', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Saude', 'EXPENSE', 'Consultas, farmacia e exames', '#D81B60', NULL),
    ('cat-8', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Lazer', 'EXPENSE', 'Saidas, cinema e entretenimento', '#1E88E5', NULL),
    ('cat-9', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Educacao', 'EXPENSE', 'Cursos, livros e assinaturas de estudo', '#546E7A', NULL)
ON CONFLICT (user_id, name, type) DO NOTHING;
