-- Seed data for Mirante
-- Versao minima coerente com o sistema simplificado atual.

BEGIN;

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

-- Users
INSERT INTO users (id, email, name, phone, cpf, privacy_mode_enabled, password_hash)
VALUES
    (
        'd290f1ee-6c54-4b01-90e6-d701748f0851',
        'nilton.naab@gmail.com',
        'Nilton Santos',
        '65999990001',
        '123.456.789-00',
        FALSE,
        '$2a$12$.XnRfSRpVjfhFU0UQ22nIeNP1sFTsC4behpNxSjCfPUepv2wklE2u'
    ),
    (
        'bf5b4d17-6db3-41aa-b86a-c5d1f90f1152',
        'ana.parceira@example.com',
        'Ana Parceira',
        '65999990002',
        '987.654.321-00',
        TRUE,
        '$2a$10$NW57BAuRGOxHi45/go9XVOgAXf8UEFE52vMxdR.CV/5oFTE5aW7SK'
    )
ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    cpf = EXCLUDED.cpf,
    privacy_mode_enabled = EXCLUDED.privacy_mode_enabled,
    password_hash = EXCLUDED.password_hash;

-- Accounts
INSERT INTO accounts (
    id, user_id, name, type, ownership, bank_name, bank_code, bank_agency,
    cpf, cnpj, color, icon, currency_code,
    balance_cents, credit_limit_cents, has_debit, has_pix, has_credit,
    include_in_total, closing_day, due_day, is_active
)
VALUES
    ('acc-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank CPF',  'CHECKING', 'PERSONAL', 'Nubank', '0260', '0001', '123.456.789-00', NULL, '#8A05BE', 'bank', 'BRL',  50000, 830000, TRUE, TRUE, TRUE, TRUE,  7, 15, TRUE),
    ('acc-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank CNPJ', 'CHECKING', 'BUSINESS', 'Nubank', '0260', '0001', NULL, '12.345.678/0001-90', '#5E35B1', 'briefcase', 'BRL', 0, 320000, TRUE, TRUE, TRUE, TRUE, 10, 20, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Vehicles
INSERT INTO vehicles (
    id, user_id, name, brand, model, year, license_plate, tank, is_active
)
VALUES
    ('veh-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Fiat Uno Mille', 'Fiat', 'Uno Mille', 2012, 'OBH-2417', 45.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, user_id, name, type, description, color, parent_id)
VALUES
    ('cat-1',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Alimentacao', 'EXPENSE', 'Restaurantes, mercado e lanches', '#EF5350', NULL),
    ('cat-2',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Combustivel', 'EXPENSE', 'Abastecimentos e postos', '#FFB300', NULL),
    ('cat-3',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Salario', 'INCOME', 'Recebimentos mensais de trabalho', '#43A047', NULL),
    ('cat-4',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Lazer', 'EXPENSE', 'Cinema, cafes e saidas', '#1E88E5', NULL),
    ('cat-5',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Saude', 'EXPENSE', 'Consultas e farmacia', '#D81B60', NULL),
    ('cat-6',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Educacao', 'EXPENSE', 'Cursos e assinaturas de estudo', '#8E24AA', NULL),
    ('cat-7',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Streaming', 'EXPENSE', 'Assinaturas digitais recorrentes', '#546E7A', NULL),
    ('cat-8',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Manutencao Veiculo', 'EXPENSE', 'Troca de oleo, pneus e revisoes', '#6D4C41', NULL),
    ('cat-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Mercado', 'EXPENSE', 'Compras de supermercado', '#FB8C00', 'cat-1'),
    ('cat-11', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Restaurante', 'EXPENSE', 'Refeicoes fora de casa', '#F4511E', 'cat-1'),
    ('cat-12', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Freelance', 'INCOME', 'Receitas extras de projetos', '#00ACC1', NULL),
    ('cat-13', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Moradia', 'EXPENSE', 'Aluguel e condominio', '#5E35B1', NULL),
    ('cat-14', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Internet e Celular', 'EXPENSE', 'Internet residencial e telefonia', '#3949AB', NULL),
    ('cat-15', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Investimentos', 'INCOME', 'Resgates e rendimentos financeiros', '#00897B', NULL),
    ('cat-16', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Bonus', 'INCOME', 'Bonificacoes e premios', '#26A69A', NULL),
    ('cat-17', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Freelance e Servicos', 'INCOME', 'Servicos avulsos e trabalhos extras', '#00ACC1', NULL),
    ('cat-18', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Vendas', 'INCOME', 'Venda de produtos ou ativos', '#7E57C2', NULL),
    ('cat-19', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reembolsos', 'INCOME', 'Valores devolvidos ou estornos', '#5C6BC0', NULL)
ON CONFLICT (user_id, name, type) DO NOTHING;

-- Tags
INSERT INTO tags (id, name, color)
VALUES
    ('tag-1', 'urgente',    '#E53935'),
    ('tag-2', 'viagem',     '#00ACC1'),
    ('tag-3', 'trabalho',   '#43A047'),
    ('tag-4', 'recorrente', '#5E35B1'),
    ('tag-5', 'carro',      '#6D4C41'),
    ('tag-6', 'casa',       '#3949AB')
ON CONFLICT (id) DO NOTHING;

-- Transactions
INSERT INTO transactions (
    id,
    user_id,
    category_id,
    type,
    classification,
    payment_method,
    channel,
    status,
    is_recurring,
    amount_cents,
    total_installments,
    paid_installments,
    date,
    description,
    notes,
    affects_account,
    is_active,
    currency_code
)
VALUES
    ('tra-1',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-3',  'INCOME',  'COMMON',      'DEBIT',  'PIX',        'COMPLETED', FALSE, 1200000, NULL, NULL, TIMESTAMPTZ '2026-04-01 09:00:00-04', 'Salario Mirante',        'Competencia abril',                 TRUE,  TRUE, 'BRL'),
    ('tra-2',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-12', 'INCOME',  'COMMON',      'DEBIT',  'BANK',       'COMPLETED', FALSE,  275000, NULL, NULL, TIMESTAMPTZ '2026-04-03 16:30:00-04', 'Freelance pago',         'Projeto entregue',                  TRUE,  TRUE, 'BRL'),
    ('tra-3',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-11', 'EXPENSE', 'COMMON',      'DEBIT',  'PIX',        'COMPLETED', FALSE,    4850, NULL, NULL, TIMESTAMPTZ '2026-04-02 12:15:00-04', 'Almoco executivo',       NULL,                                TRUE,  TRUE, 'BRL'),
    ('tra-4',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7',  'EXPENSE', 'COMMON',      'CREDIT', 'CARD_CREDIT','COMPLETED', TRUE,     5590, NULL, NULL, TIMESTAMPTZ '2026-04-02 20:00:00-04', 'Netflix',                'Assinatura mensal',                 FALSE, TRUE, 'BRL'),
    ('tra-5',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2',  'EXPENSE', 'FUEL',        'DEBIT',  'BANK',       'COMPLETED', FALSE,   22490, NULL, NULL, TIMESTAMPTZ '2026-04-04 07:30:00-04', 'Abastecimento',          'Tanque quase completo',             TRUE,  TRUE, 'BRL'),
    ('tra-6',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-10', 'EXPENSE', 'COMMON',      'DEBIT',  'BANK',       'COMPLETED', FALSE,   18640, NULL, NULL, TIMESTAMPTZ '2026-04-03 19:40:00-04', 'Mercado',                'Compras para casa',                 TRUE,  TRUE, 'BRL'),
    ('tra-7',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-16', 'INCOME',  'COMMON',      'DEBIT',  'BANK',       'COMPLETED', FALSE,   48000, NULL, NULL, TIMESTAMPTZ '2026-04-05 10:00:00-04', 'Bonus trimestral',       'Premio por meta batida',            TRUE,  TRUE, 'BRL'),
    ('tra-8',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-8',  'EXPENSE', 'MAINTENANCE', 'DEBIT',  'BANK',       'COMPLETED', FALSE,  127500, NULL, NULL, TIMESTAMPTZ '2026-04-06 14:10:00-04', 'Revisao do carro',       'Troca de oleo e filtros',           TRUE,  TRUE, 'BRL'),
    ('tra-9',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-19', 'INCOME',  'COMMON',      'DEBIT',  'PIX',        'COMPLETED', FALSE,   32900, NULL, NULL, TIMESTAMPTZ '2026-04-07 11:20:00-04', 'Reembolso',              'Despesa devolvida pelo fornecedor', TRUE, TRUE, 'BRL'),
    ('tra-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-6',  'EXPENSE', 'COMMON',      'DEBIT',  'CARD_DEBIT', 'COMPLETED', FALSE,    8990, NULL, NULL, TIMESTAMPTZ '2026-04-08 09:15:00-04', 'Curso online',           'Assinatura anual',                  TRUE,  TRUE, 'BRL'),
    ('tra-11', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5',  'EXPENSE', 'COMMON',      'DEBIT',  'BANK',       'COMPLETED', FALSE,   21640, NULL, NULL, TIMESTAMPTZ '2026-04-09 18:25:00-04', 'Farmacia',               'Medicamentos e itens basicos',      TRUE,  TRUE, 'BRL'),
    ('tra-12', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-15', 'INCOME',  'COMMON',      'DEBIT',  'BANK',       'COMPLETED', FALSE,   15750, NULL, NULL, TIMESTAMPTZ '2026-04-10 08:00:00-04', 'Rendimento financeiro',  'Aplicacao de curto prazo',          TRUE,  TRUE, 'BRL'),
    ('tra-13', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-14', 'EXPENSE', 'COMMON',      'DEBIT',  'BANK',       'PENDING',   TRUE,   14990, NULL, NULL, TIMESTAMPTZ '2026-04-11 08:00:00-04', 'Internet e celular',     'Fatura agendada',                   TRUE,  TRUE, 'BRL'),
    ('tra-14', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4',  'EXPENSE', 'COMMON',      'DEBIT',  'PIX',        'COMPLETED', FALSE,    7200, NULL, NULL, TIMESTAMPTZ '2026-04-12 21:00:00-04', 'Cinema',                 'Saida no fim de semana',            TRUE,  TRUE, 'BRL'),
    ('tra-15', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-18', 'INCOME',  'COMMON',      'DEBIT',  'PIX',        'COMPLETED', FALSE,   92000, NULL, NULL, TIMESTAMPTZ '2026-04-14 17:45:00-04', 'Venda de equipamento',   'Equipamento parado no estoque',     TRUE,  TRUE, 'BRL'),
    ('tra-16', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-13', 'EXPENSE', 'COMMON',      'DEBIT',  'BANK',       'COMPLETED', TRUE,   68000, NULL, NULL, TIMESTAMPTZ '2026-04-15 08:00:00-04', 'Conta de energia',       'Agendada para debito automatico',   TRUE,  TRUE, 'BRL')
ON CONFLICT (id) DO NOTHING;

UPDATE accounts
SET balance_cents = CASE id
        WHEN 'acc-1' THEN 1075570
        WHEN 'acc-4' THEN 430750
        ELSE balance_cents
    END,
    updated_at = NOW()
WHERE id IN ('acc-1', 'acc-4');

-- Refueling logs
INSERT INTO refueling_logs (
    id, vehicle_id, transaction_id, station, fuel_type, current_km, liters, price_per_liter_cents
)
VALUES
    ('log-1', 'veh-1', 'tra-5', 'Posto Shell Centro', 'GASOLINA_COMUM', 125850.2, 38.250, 588)
ON CONFLICT (id) DO NOTHING;

-- Tags em transacoes
INSERT INTO transaction_tags (transaction_id, tag_id)
VALUES
    ('tra-1', 'tag-3'),
    ('tra-2', 'tag-3'),
    ('tra-4', 'tag-4'),
    ('tra-5', 'tag-5'),
    ('tra-6', 'tag-6'),
    ('tra-8', 'tag-5'),
    ('tra-10', 'tag-6'),
    ('tra-11', 'tag-1'),
    ('tra-13', 'tag-2'),
    ('tra-8', 'tag-1')
ON CONFLICT DO NOTHING;

COMMIT;
