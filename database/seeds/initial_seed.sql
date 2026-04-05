-- Seed data for Mirante
-- Cenário principal: Nilton Santos com dados suficientes para navegar por
-- dashboard, activity, wallet, planning, vehicles e settings.

-- 0. Limpeza em ordem respeitando FKs
TRUNCATE TABLE
    transaction_tags,
    refueling_logs,
    vehicle_maintenances,
    transfers,
    transactions,
    import_fingerprints,
    budgets,
    account_access,
    cards,
    categories,
    tags,
    accounts,
    vehicles,
    users
RESTART IDENTITY CASCADE;

-- 1. Usuarios
-- Login principal
-- Email: nilton.naab@gmail.com
-- Password: @2Organela
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
        '$2a$10$NW57BAuRGOxHi45/go9XVOgAXf8UEFE52vMxdR.CV/5oFTE5aW7SK'
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

-- 2. Contas
INSERT INTO accounts (
    id,
    user_id,
    name,
    type,
    ownership,
    bank_name,
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
    ('acc-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank',            'CHECKING',   'PERSONAL', 'Nubank',          '#8A05BE', 'bank',        'BRL',   485250, NULL,    TRUE,  TRUE,  TRUE,  TRUE,  NULL, NULL, TRUE),
    ('acc-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Inter',             'CHECKING',   'PERSONAL', 'Inter',           '#FF7A00', 'bank',        'BRL',   214800, NULL,    TRUE,  TRUE,  FALSE, TRUE,  NULL, NULL, TRUE),
    ('acc-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva BB',        'SAVINGS',    'PERSONAL', 'Banco do Brasil', '#F4C400', 'piggy-bank',  'BRL',  3200000, NULL,    FALSE, FALSE, FALSE, TRUE,  NULL, NULL, TRUE),
    ('acc-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Carteira',          'CASH',       'PERSONAL', NULL,               '#34A853', 'wallet',      'BRL',    18500, NULL,    TRUE,  FALSE, FALSE, TRUE,  NULL, NULL, TRUE),
    ('acc-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'XP Investimentos',  'INVESTMENT', 'PERSONAL', 'XP',              '#111827', 'trending-up', 'BRL',  8150000, NULL,    FALSE, FALSE, FALSE, TRUE,  NULL, NULL, TRUE),
    ('acc-6', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Caixa PJ',          'CHECKING',   'BUSINESS', 'Caixa Economica', '#005CA9', 'briefcase',   'BRL',   950000, NULL,    TRUE,  TRUE,  TRUE,  TRUE,  NULL, NULL, TRUE),
    ('acc-7', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Conta Compartilhada', 'CHECKING', 'PERSONAL', 'Sicredi',         '#2E7D32', 'users',       'BRL',   128400, NULL,    TRUE,  TRUE,  FALSE, TRUE,  NULL, NULL, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Cartoes
INSERT INTO cards (
    id,
    user_id,
    account_id,
    name,
    brand,
    last4,
    type,
    credit_limit_cents,
    color,
    icon,
    closing_day,
    due_day,
    is_active
)
VALUES
    ('card-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'Nubank Roxinho',       'Mastercard', '1234', 'CREDIT',  650000, '#8A05BE', 'credit-card',  7, 15, TRUE),
    ('card-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', 'Inter Debito',         'Mastercard', '5678', 'DEBIT',      NULL, '#FF7A00', 'credit-card', NULL, NULL, TRUE),
    ('card-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-6', 'Caixa Empresarial',    'Visa',       '9012', 'CREDIT', 1200000, '#005CA9', 'credit-card', 10, 20, TRUE),
    ('card-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-7', 'Sicredi Compartilhado', 'Visa',      '4421', 'DEBIT',      NULL, '#2E7D32', 'credit-card', NULL, NULL, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Compartilhamento de conta
INSERT INTO account_access (id, account_id, user_id, role)
VALUES
    ('access-1', 'acc-7', 'bf5b4d17-6db3-41aa-b86a-c5d1f90f1152', 'EDITOR'),
    ('access-2', 'acc-6', 'bf5b4d17-6db3-41aa-b86a-c5d1f90f1152', 'VIEWER')
ON CONFLICT (account_id, user_id) DO NOTHING;

-- 5. Veiculos
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
    ('veh-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Fiat Uno Mille', 'Fiat',    'Uno Mille', 2012, 'OBH-2417', 45.00, TRUE),
    ('veh-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Honda CG 160',   'Honda',   'CG 160',    2021, 'QWE-9081', 16.10, TRUE),
    ('veh-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Onix LT',        'Chevrolet', 'Onix LT', 2019, 'RTA-4420', 54.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Categorias
INSERT INTO categories (id, user_id, name, type, description, color, parent_id)
VALUES
    ('cat-1',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Alimentacao',       'EXPENSE', 'Restaurantes, mercado e lanches',          '#EF5350', NULL),
    ('cat-2',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Combustivel',       'EXPENSE', 'Abastecimentos e postos',                  '#FFB300', NULL),
    ('cat-3',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Salario',           'INCOME',  'Recebimentos mensais de trabalho',         '#43A047', NULL),
    ('cat-4',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Lazer',             'EXPENSE', 'Cinema, cafes e saidas',                   '#1E88E5', NULL),
    ('cat-5',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Saude',             'EXPENSE', 'Consultas, farmacia e exames',             '#D81B60', NULL),
    ('cat-6',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Educacao',          'EXPENSE', 'Cursos e assinaturas de estudo',           '#8E24AA', NULL),
    ('cat-7',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Streaming',         'EXPENSE', 'Assinaturas digitais recorrentes',         '#546E7A', NULL),
    ('cat-8',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Manutencao Veiculo','EXPENSE', 'Troca de oleo, pneus e revisoes',          '#6D4C41', NULL),
    ('cat-9',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Transferencia',     'EXPENSE', 'Categoria auxiliar para movimentacoes',    '#9E9E9E', NULL),
    ('cat-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Mercado',           'EXPENSE', 'Compras de supermercado',                  '#FB8C00', 'cat-1'),
    ('cat-11', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Restaurante',       'EXPENSE', 'Refeicoes fora de casa',                   '#F4511E', 'cat-1'),
    ('cat-12', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Freelance',         'INCOME',  'Receitas extras de projetos',              '#00ACC1', NULL),
    ('cat-13', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Moradia',           'EXPENSE', 'Aluguel, condominio e utilidades',         '#5E35B1', NULL),
    ('cat-14', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Internet e Celular','EXPENSE', 'Internet residencial e telefonia',         '#3949AB', NULL),
    ('cat-15', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Investimentos',     'INCOME',  'Resgates e rendimentos financeiros',       '#00897B', NULL)
ON CONFLICT (user_id, name, type) DO NOTHING;

-- 7. Tags
INSERT INTO tags (id, name, color)
VALUES
    ('tag-1', 'urgente',      '#E53935'),
    ('tag-2', 'viagem',       '#00ACC1'),
    ('tag-3', 'trabalho',     '#43A047'),
    ('tag-4', 'recorrente',   '#5E35B1'),
    ('tag-5', 'carro',        '#6D4C41'),
    ('tag-6', 'casa',         '#3949AB')
ON CONFLICT (id) DO NOTHING;

-- 8. Transacoes
INSERT INTO transactions (
    id,
    user_id,
    account_id,
    card_id,
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
    ('tra-1',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', NULL,     'cat-3',  'INCOME',   'COMMON',      'DEBIT',  'PIX',         'COMPLETED', FALSE, 1200000, NULL, NULL, TIMESTAMPTZ '2026-04-01 09:00:00-04', 'Salario Mirante',                     'Competencia abril',                         TRUE,  TRUE, 'BRL'),
    ('tra-2',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-6', NULL,     'cat-12', 'INCOME',   'COMMON',      'DEBIT',  'PIX',         'COMPLETED', FALSE,  275000, NULL, NULL, TIMESTAMPTZ '2026-04-03 16:30:00-04', 'Freelance landing page',               'Projeto entregue para cliente local',       TRUE,  TRUE, 'BRL'),
    ('tra-3',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', NULL,     'cat-11', 'EXPENSE',  'COMMON',      'DEBIT',  'BANK',        'COMPLETED', FALSE,    4850, NULL, NULL, TIMESTAMPTZ '2026-04-02 12:15:00-04', 'Almoco executivo',                     NULL,                                        TRUE,  TRUE, 'BRL'),
    ('tra-4',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'card-1', 'cat-7',  'EXPENSE',  'COMMON',      'CREDIT', 'CARD_CREDIT', 'COMPLETED', TRUE,     5590, NULL, NULL, TIMESTAMPTZ '2026-04-02 20:00:00-04', 'Netflix',                             'Assinatura mensal',                         FALSE, TRUE, 'BRL'),
    ('tra-5',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'card-1', 'cat-7',  'EXPENSE',  'COMMON',      'CREDIT', 'CARD_CREDIT', 'COMPLETED', TRUE,     1990, NULL, NULL, TIMESTAMPTZ '2026-04-03 08:00:00-04', 'iCloud 200GB',                         'Backup da familia',                         FALSE, TRUE, 'BRL'),
    ('tra-6',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', NULL,     'cat-10', 'EXPENSE',  'COMMON',      'DEBIT',  'BANK',        'COMPLETED', FALSE,   18640, NULL, NULL, TIMESTAMPTZ '2026-04-03 19:40:00-04', 'Atacadao da semana',                   'Compras para casa',                         TRUE,  TRUE, 'BRL'),
    ('tra-7',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', NULL,     'cat-2',  'EXPENSE',  'FUEL',        'DEBIT',  'BANK',        'COMPLETED', FALSE,   22490, NULL, NULL, TIMESTAMPTZ '2026-04-04 07:30:00-04', 'Abastecimento Uno',                    'Tanque quase completo',                     TRUE,  TRUE, 'BRL'),
    ('tra-8',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', NULL,     'cat-8',  'EXPENSE',  'MAINTENANCE', 'DEBIT',  'BANK',        'COMPLETED', FALSE,   34800, NULL, NULL, TIMESTAMPTZ '2026-03-25 10:10:00-04', 'Troca de oleo Uno',                    'Filtro e oleo 15W40',                       TRUE,  TRUE, 'BRL'),
    ('tra-9',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-7', 'card-4', 'cat-13', 'EXPENSE',  'COMMON',      'DEBIT',  'CARD_DEBIT',  'COMPLETED', TRUE,   145000, NULL, NULL, TIMESTAMPTZ '2026-04-05 08:00:00-04', 'Aluguel apartamento',                  'Conta compartilhada',                       TRUE,  TRUE, 'BRL'),
    ('tra-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-7', NULL,     'cat-14', 'EXPENSE',  'COMMON',      'DEBIT',  'PIX',         'COMPLETED', TRUE,     9990, NULL, NULL, TIMESTAMPTZ '2026-04-05 09:30:00-04', 'Internet fibra',                       'Mensalidade abril',                         TRUE,  TRUE, 'BRL'),
    ('tra-11', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', NULL,     NULL,     'TRANSFER', 'TRANSFER',    'DEBIT',  'PIX',         'COMPLETED', FALSE,   50000, NULL, NULL, TIMESTAMPTZ '2026-04-05 13:15:00-04', 'Transferencia Nubank para Inter',      'Reserva para despesas da semana',           TRUE,  TRUE, 'BRL'),
    ('tra-12', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', NULL,     NULL,     'TRANSFER', 'TRANSFER',    'DEBIT',  'PIX',         'COMPLETED', FALSE,   50000, NULL, NULL, TIMESTAMPTZ '2026-04-05 13:15:10-04', 'Transferencia Nubank para Inter',      'Entrada correspondente',                    TRUE,  TRUE, 'BRL'),
    ('tra-13', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', NULL,     NULL,     'TRANSFER', 'TRANSFER',    'DEBIT',  'BANK',        'COMPLETED', FALSE,  120000, NULL, NULL, TIMESTAMPTZ '2026-04-06 18:00:00-04', 'Aplicacao XP',                          'Movimentacao para investimento',            TRUE,  TRUE, 'BRL'),
    ('tra-14', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-5', NULL,     NULL,     'TRANSFER', 'TRANSFER',    'DEBIT',  'BANK',        'COMPLETED', FALSE,  120000, NULL, NULL, TIMESTAMPTZ '2026-04-06 18:00:10-04', 'Aplicacao XP',                          'Entrada na conta de investimentos',         TRUE,  TRUE, 'BRL'),
    ('tra-15', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-5', NULL,     'cat-15', 'INCOME',   'COMMON',      'DEBIT',  'BANK',        'COMPLETED', FALSE,    8750, NULL, NULL, TIMESTAMPTZ '2026-04-08 09:00:00-04', 'Rendimento CDB',                        'Credito automatico da corretora',           TRUE,  TRUE, 'BRL'),
    ('tra-16', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-6', 'card-3', 'cat-6',  'EXPENSE',  'COMMON',      'CREDIT', 'CARD_CREDIT', 'COMPLETED', FALSE,   32990,    6,    1, TIMESTAMPTZ '2026-04-09 11:20:00-04', 'Curso de design',                      'Parcelado para equipe interna',             FALSE, TRUE, 'BRL'),
    ('tra-17', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-6', NULL,     'cat-13', 'EXPENSE',  'COMMON',      'DEBIT',  'BANK',        'PENDING',   TRUE,    68000, NULL, NULL, TIMESTAMPTZ '2026-04-12 08:00:00-04', 'Conta de energia escritorio',          'Agendada para debito automatico',           TRUE,  TRUE, 'BRL'),
    ('tra-18', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-4', NULL,     'cat-4',  'EXPENSE',  'COMMON',      'DEBIT',  'BANK',        'COMPLETED', FALSE,     750, NULL, NULL, TIMESTAMPTZ '2026-04-02 18:40:00-04', 'Cafe na praca',                         NULL,                                        TRUE,  TRUE, 'BRL'),
    ('tra-19', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', NULL,     'cat-5',  'EXPENSE',  'COMMON',      'DEBIT',  'BANK',        'COMPLETED', FALSE,   12490, NULL, NULL, TIMESTAMPTZ '2026-04-01 17:15:00-04', 'Farmacia Drogasil',                    'Medicamentos e vitaminas',                  TRUE,  TRUE, 'BRL'),
    ('tra-20', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'card-1', 'cat-4',  'EXPENSE',  'COMMON',      'CREDIT', 'CARD_CREDIT', 'COMPLETED', FALSE,   18990, NULL, NULL, TIMESTAMPTZ '2026-04-10 21:00:00-04', 'Cinema e jantar',                      'Saida de sexta',                            FALSE, TRUE, 'BRL'),
    ('tra-21', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', NULL,     'cat-2',  'EXPENSE',  'FUEL',        'DEBIT',  'BANK',        'COMPLETED', FALSE,    6200, NULL, NULL, TIMESTAMPTZ '2026-04-11 08:10:00-04', 'Abastecimento CG 160',                  'Gasolina para a moto',                      TRUE,  TRUE, 'BRL'),
    ('tra-22', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', NULL,     'cat-12', 'INCOME',   'COMMON',      'DEBIT',  'PIX',         'COMPLETED', FALSE,   95000, NULL, NULL, TIMESTAMPTZ '2026-03-20 14:00:00-04', 'Freela dashboard',                      'Projeto concluido em marco',                TRUE,  TRUE, 'BRL'),
    ('tra-23', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', NULL,     'cat-10', 'EXPENSE',  'COMMON',      'DEBIT',  'BANK',        'COMPLETED', FALSE,   15420, NULL, NULL, TIMESTAMPTZ '2026-03-28 19:20:00-04', 'Mercado do mes',                        'Compras finais de marco',                   TRUE,  TRUE, 'BRL'),
    ('tra-24', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-6', NULL,     NULL,     'ADJUSTMENT','COMMON',      'DEBIT',  'BANK',        'COMPLETED', FALSE,   15000, NULL, NULL, TIMESTAMPTZ '2026-04-01 08:30:00-04', 'Ajuste de caixa pequeno',               'Correcao de saldo inicial do escritorio',   TRUE,  TRUE, 'BRL')
ON CONFLICT (id) DO NOTHING;

-- 9. Vínculos de transferencia
INSERT INTO transfers (id, source_transaction_id, destination_transaction_id)
VALUES
    ('trf-1', 'tra-11', 'tra-12'),
    ('trf-2', 'tra-13', 'tra-14')
ON CONFLICT (id) DO NOTHING;

-- 10. Abastecimentos
INSERT INTO refueling_logs (
    id,
    vehicle_id,
    transaction_id,
    station,
    fuel_type,
    current_km,
    liters,
    price_per_liter_cents
)
VALUES
    ('log-1', 'veh-1', 'tra-7',  'Posto Shell Centro',   'GASOLINA_COMUM',   125850.2, 38.250, 588),
    ('log-2', 'veh-2', 'tra-21', 'Posto Avenida Norte',  'GASOLINA_COMUM',    18240.5, 10.120, 612)
ON CONFLICT (id) DO NOTHING;

-- 11. Manutencoes
INSERT INTO vehicle_maintenances (
    id,
    vehicle_id,
    transaction_id,
    maintenance_type,
    provider
)
VALUES
    ('mnt-1', 'veh-1', 'tra-8', 'OIL_CHANGE', 'Auto Center Rapido')
ON CONFLICT (id) DO NOTHING;

-- 12. Orcamentos
INSERT INTO budgets (
    id,
    user_id,
    category_id,
    amount_cents,
    month,
    year,
    notes,
    is_active
)
VALUES
    ('bud-1',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-1',  90000, 4, 2026, 'Meta geral de alimentacao do mes', TRUE),
    ('bud-2',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2',  35000, 4, 2026, 'Combustivel do Uno e da moto', TRUE),
    ('bud-3',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4',  25000, 4, 2026, 'Lazer em finais de semana', TRUE),
    ('bud-4',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5',  30000, 4, 2026, 'Farmacia e consultas', TRUE),
    ('bud-5',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7',  12000, 4, 2026, 'Assinaturas recorrentes', TRUE),
    ('bud-6',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-13', 160000, 4, 2026, 'Moradia compartilhada', TRUE),
    ('bud-7',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-14',  12000, 4, 2026, 'Internet e celular', TRUE),
    ('bud-8',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-1',  85000, 3, 2026, 'Historico de marco', TRUE),
    ('bud-9',  'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2',  28000, 3, 2026, 'Historico de marco', TRUE),
    ('bud-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4',  22000, 3, 2026, 'Historico de marco', TRUE)
ON CONFLICT (user_id, category_id, month, year) DO NOTHING;

-- 13. Tags em transacoes
INSERT INTO transaction_tags (transaction_id, tag_id)
VALUES
    ('tra-1',  'tag-3'),
    ('tra-2',  'tag-3'),
    ('tra-4',  'tag-4'),
    ('tra-5',  'tag-4'),
    ('tra-7',  'tag-5'),
    ('tra-8',  'tag-5'),
    ('tra-9',  'tag-6'),
    ('tra-10', 'tag-6'),
    ('tra-17', 'tag-1'),
    ('tra-20', 'tag-2')
ON CONFLICT DO NOTHING;

-- 14. Fingerprints de importacao para testar deduplicacao
INSERT INTO import_fingerprints (hash, account_id)
VALUES
    ('fp-nubank-2026-04-01-salario-1200000', 'acc-1'),
    ('fp-inter-2026-04-03-mercado-18640',    'acc-2'),
    ('fp-caixa-2026-04-03-freela-275000',    'acc-6')
ON CONFLICT (hash) DO NOTHING;
