BEGIN;

-- Limpar dados existentes de forma segura e cascateada
TRUNCATE TABLE
    transactions,
    budgets,
    budget_alerts,
    categories,
    category_rules,
    credit_cards,
    card_invoice_payments,
    goals,
    expense_splits,
    accounts,
    users
RESTART IDENTITY CASCADE;

-- Usuário Principal: nilton.naab@gmail.com / dev-password-123
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

-- Contas Bancárias e de Investimentos
INSERT INTO accounts (id, user_id, name, type, currency_code, initial_balance_cents, is_active)
VALUES
    ('acc-nubank', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank Conta Principal', 'CHECKING', 'BRL', 645000, TRUE),
    ('acc-itau', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Itaú Personnalité', 'CHECKING', 'BRL', 1280000, TRUE),
    ('acc-inter', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Banco Inter Corrente', 'CHECKING', 'BRL', 345000, TRUE),
    ('acc-reserva', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva Selic & CDI 100%', 'EMERGENCY', 'BRL', 3500000, TRUE),
    ('acc-carteira', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Carteira Dinheiro em Espécie', 'WALLET', 'BRL', 42000, TRUE),
    ('acc-invest', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'XP Investimentos / NuInvest', 'INVESTMENT', 'BRL', 4800000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Cartões de Crédito com limites expressivos
INSERT INTO credit_cards (id, user_id, name, brand, last4, credit_limit_cents, closing_day, due_day, is_active)
VALUES
    ('card-nu', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank Ultravioleta Black', 'Mastercard', '4321', 1800000, 20, 27, TRUE),
    ('card-itau', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Itaú Visa Infinite', 'Visa', '8890', 2500000, 10, 17, TRUE),
    ('card-inter', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Inter Black Mastercard', 'Mastercard', '1092', 1200000, 5, 12, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Categorias de Receitas e Despesas com cores e classificações
INSERT INTO categories (id, user_id, name, type, budget_class, description, color, parent_id)
VALUES
    ('cat-inc-sal', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Salário & Pró-labore', 'INCOME', 'ESSENTIAL', 'Remuneração mensal fixa', '#16a34a', NULL),
    ('cat-inc-free', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Freelance & Consultoria', 'INCOME', 'LIFESTYLE', 'Desenvolvimento de software e arquitetura', '#0f766e', NULL),
    ('cat-inc-div', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Dividendos & Rendimentos', 'INCOME', 'FINANCIAL', 'Proventos de FIIs, ações e renda fixa', '#059669', NULL),
    ('cat-inc-cb', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Cashback & Reembolsos', 'INCOME', 'FINANCIAL', 'Estornos e recompensas de cartões', '#10b981', NULL),

    ('cat-exp-mor', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Moradia & Contas Fixas', 'EXPENSE', 'ESSENTIAL', 'Aluguel, condomínio, luz, internet', '#dc2626', NULL),
    ('cat-exp-mer', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Supermercado & Feira', 'EXPENSE', 'ESSENTIAL', 'Compras de mês, feira e hortifruti', '#ea580c', NULL),
    ('cat-exp-res', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Restaurantes & Lazer', 'EXPENSE', 'LIFESTYLE', 'Jantares, bares, cinema e passeios', '#d97706', NULL),
    ('cat-exp-tra', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Transporte & Mobilidade', 'EXPENSE', 'ESSENTIAL', 'Combustível, Uber, pedágio e estacionamento', '#0284c7', NULL),
    ('cat-exp-sau', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Saúde & Bem-Estar', 'EXPENSE', 'ESSENTIAL', 'Farmácia, academia e plano de saúde', '#e11d48', NULL),
    ('cat-exp-edu', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Educação & Livros', 'EXPENSE', 'LIFESTYLE', 'Cursos, livros técnicos e certificações', '#8b5cf6', NULL),
    ('cat-exp-ass', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Assinaturas & Nuvem', 'EXPENSE', 'LIFESTYLE', 'Netflix, Spotify, GitHub, AWS, ChatGPT', '#7c3aed', NULL),
    ('cat-exp-com', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Compras Pessoais', 'EXPENSE', 'LIFESTYLE', 'Roupas, acessórios e equipamentos', '#ec4899', NULL),
    ('cat-exp-fat', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Pagamento de Fatura', 'EXPENSE', 'FINANCIAL', 'Liquidação mensal de faturas de cartão', '#64748b', NULL),
    ('cat-exp-inv', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva & Aportes', 'EXPENSE', 'FINANCIAL', 'Aportes em caixinhas e investimentos', '#2563eb', NULL)
ON CONFLICT (user_id, name, type) DO NOTHING;

-- Orçamentos Planejados (Budgets)
INSERT INTO budgets (id, user_id, name, allocated_amount_cents, notes, is_active)
VALUES
    ('bud-mer', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Supermercado & Alimentação Mês', 220000, 'Compras quinzenais no atacado e feira orgânica', TRUE),
    ('bud-laz', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Restaurantes & Lazer Fim de Semana', 140000, 'Jantares, cafés e delivery iFood', TRUE),
    ('bud-tra', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Transporte, Combustível & Uber', 80000, 'Abastecimentos e viagens por app', TRUE),
    ('bud-cld', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Assinaturas, SaaS & IA', 45000, 'GitHub Copilot, Supabase, Netflix e Spotify', TRUE),
    ('bud-set', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Setup & Reforma Escritório', 400000, 'Mesa elevatória, cadeira ergonômica e monitor', TRUE),
    ('bud-via', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Viagem Fim de Ano Réveillon', 800000, 'Passagens aéreas e hospedagem', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Metas de Poupança & Caixinhas Financeiras (Goals)
INSERT INTO goals (id, user_id, name, description, target_amount_cents, color, target_date, is_achieved, is_active)
VALUES
    ('goal-reserva', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva de Emergência (6 Meses)', 'Meta de segurança cobrindo 6 meses de custos fixos essenciais', 5000000, '#10b981', '2026-12-31', FALSE, TRUE),
    ('goal-europa', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Viagem Europa 2027', 'Eurotrip: Portugal, Espanha e Itália com hotel e passeios', 2800000, '#8b5cf6', '2027-07-15', FALSE, TRUE),
    ('goal-mac', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Setup MacBook Pro M4 Max', 'Upgrade de equipamento principal para desenvolvimento e IA', 1800000, '#3b82f6', '2026-11-30', FALSE, TRUE),
    ('goal-carro', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Entrada Veículo Híbrido', 'Troca por automóvel híbrido/elétrico econômico', 4500000, '#f59e0b', '2027-12-20', FALSE, TRUE),
    ('goal-curso', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Certificação Cloud Architecture & AI', 'Cursos avançados de especialização e vouchers de exames', 650000, '#06b6d4', '2026-10-31', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Pagamentos Históricos de Fatura de Cartão (Julho e Agosto 2026)
INSERT INTO card_invoice_payments (id, user_id, card_id, reference_month, amount_cents, paid_at, transaction_id)
VALUES
    ('pay-nu-jul', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'card-nu', '2026-07-01', 195000, TIMESTAMPTZ '2026-07-27 10:00:00Z', NULL),
    ('pay-nu-ago', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'card-nu', '2026-08-01', 234000, TIMESTAMPTZ '2026-08-27 10:00:00Z', NULL),
    ('pay-itau-jul', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'card-itau', '2026-07-01', 142000, TIMESTAMPTZ '2026-07-17 11:30:00Z', NULL),
    ('pay-itau-ago', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'card-itau', '2026-08-01', 188000, TIMESTAMPTZ '2026-08-17 11:30:00Z', NULL)
ON CONFLICT (card_id, reference_month) DO NOTHING;

-- Transações Completas (Julho, Agosto, Setembro [mês atual] e Outubro 2026)
INSERT INTO transactions (
    id, user_id, account_id, card_id, category_id, budget_id, goal_id,
    type, kind, status, amount_cents, date, description, notes, currency_code,
    installment_group_id, installment_number, total_installments, is_active
)
VALUES
    -- ==========================================
    -- JULHO 2026 (Histórico)
    -- ==========================================
    ('tx-jul-01', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-inc-sal', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 1450000, TIMESTAMPTZ '2026-07-01 10:00:00Z', 'Salário Mensal Nilbyte', 'Depósito em conta', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-jul-02', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 320000, TIMESTAMPTZ '2026-07-02 09:00:00Z', 'Aluguel Apartamento', 'PIX proprietário', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-jul-03', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-reserva', 'EXPENSE', 'SAVING', 'COMPLETED', 300000, TIMESTAMPTZ '2026-07-03 14:00:00Z', 'Aporte Reserva Selic', 'Caixinha Reserva', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-jul-04', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-europa', 'EXPENSE', 'SAVING', 'COMPLETED', 150000, TIMESTAMPTZ '2026-07-05 14:00:00Z', 'Aporte Viagem Europa', 'Caixinha Eurotrip', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-jul-05', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-inc-free', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 380000, TIMESTAMPTZ '2026-07-08 16:00:00Z', 'Projeto Go Microserviços', 'Consultoria entrega', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-jul-06', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-invest', NULL, 'cat-inc-div', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 59000, TIMESTAMPTZ '2026-07-15 11:00:00Z', 'Dividendos FIIs & Ações', 'Proventos creditados', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-jul-07', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-com', 'bud-set', NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 35000, TIMESTAMPTZ '2026-07-18 15:30:00Z', 'Suporte Articulado Monitor (1/3)', 'Setup home office', 'BRL', 'grp-inst-jul-01', 1, 3, TRUE),

    -- ==========================================
    -- AGOSTO 2026 (Histórico)
    -- ==========================================
    ('tx-ago-01', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-inc-sal', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 1450000, TIMESTAMPTZ '2026-08-01 10:00:00Z', 'Salário Mensal Nilbyte', 'Depósito em conta', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-02', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 320000, TIMESTAMPTZ '2026-08-02 09:00:00Z', 'Aluguel Apartamento', 'PIX proprietário', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-03', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 78000, TIMESTAMPTZ '2026-08-03 10:15:00Z', 'Condomínio Residencial', 'Boleto bancário', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-04', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-reserva', 'EXPENSE', 'SAVING', 'COMPLETED', 250000, TIMESTAMPTZ '2026-08-03 14:00:00Z', 'Aporte Reserva Selic', 'Aporte mensal de segurança', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-05', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-europa', 'EXPENSE', 'SAVING', 'COMPLETED', 120000, TIMESTAMPTZ '2026-08-05 14:00:00Z', 'Aporte Viagem Europa', 'Caixinha Eurotrip', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-06', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-inc-free', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 450000, TIMESTAMPTZ '2026-08-07 15:30:00Z', 'Projeto E-commerce React/Go', 'Entrega de sprint', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-07', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-invest', NULL, 'cat-inc-div', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 64000, TIMESTAMPTZ '2026-08-15 11:00:00Z', 'Dividendos FIIs & Ações', 'Rendimentos da carteira', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-08', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-com', 'bud-set', NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 35000, TIMESTAMPTZ '2026-08-18 15:30:00Z', 'Suporte Articulado Monitor (2/3)', 'Setup home office', 'BRL', 'grp-inst-jul-01', 2, 3, TRUE),
    ('tx-ago-09', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-mac', 'EXPENSE', 'SAVING', 'COMPLETED', 100000, TIMESTAMPTZ '2026-08-20 16:00:00Z', 'Aporte Setup Mac M4', 'Caixinha MacBook', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-ago-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-carro', 'EXPENSE', 'SAVING', 'COMPLETED', 150000, TIMESTAMPTZ '2026-08-22 17:00:00Z', 'Aporte Carro Híbrido', 'Caixinha Entrada Carro', 'BRL', NULL, NULL, NULL, TRUE),

    -- =========================================================================
    -- SETEMBRO 2026 (MÊS ATUAL - DIA 1 AO DIA 30 COM TODOS OS 5 TIPOS / KINDS)
    -- =========================================================================

    -- DIA 01: Renda Principal + Contas
    ('tx-sep-01a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-inc-sal', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 1450000, TIMESTAMPTZ '2026-09-01 10:00:00Z', 'Salário Mensal Nilbyte', 'Depósito líquido em conta corrente', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-01b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 78000, TIMESTAMPTZ '2026-09-01 11:30:00Z', 'Condomínio Residencial', 'Boleto taxa ordinária mês 09', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 02: Aluguel + Aporte Poupança Meta + Jantar Crédito
    ('tx-sep-02a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 320000, TIMESTAMPTZ '2026-09-02 09:00:00Z', 'Aluguel Apartamento', 'Transferência PIX proprietário', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-02b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-reserva', 'EXPENSE', 'SAVING', 'COMPLETED', 150000, TIMESTAMPTZ '2026-09-02 11:30:00Z', 'Aporte Reserva de Emergência', 'Aporte mensal programado Tesouro Selic', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-02c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 18500, TIMESTAMPTZ '2026-09-02 20:30:00Z', 'Jantar Japonês Hanami', 'Rodízio comemoração início do mês', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 03: Energia Elétrica + Orçamento Feira + Livros Técnicos Crédito
    ('tx-sep-03a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 34500, TIMESTAMPTZ '2026-09-03 10:00:00Z', 'Energia Elétrica (Energisa)', 'Fatura mês de referência 08/2026', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-03b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mer', 'bud-mer', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 16500, TIMESTAMPTZ '2026-09-03 17:00:00Z', 'Feira Livre Orgânica', 'Legumes, frutas e ovos caipiras', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-03c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-edu', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 14250, TIMESTAMPTZ '2026-09-03 19:40:00Z', 'Amazon Livros Técnicos Go & Arquitetura', 'Livros O''Reilly e Pragmatic Programmer', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 04: Internet Fibra + Academia + Uber
    ('tx-sep-04a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 14990, TIMESTAMPTZ '2026-09-04 08:30:00Z', 'Internet Fibra 1Gbps', 'Débito automático plano corporativo', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-04b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-exp-sau', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 18900, TIMESTAMPTZ '2026-09-04 07:45:00Z', 'Mensalidade SmartFit Black', 'Plano mensal com acesso livre', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-04c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-tra', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 4250, TIMESTAMPTZ '2026-09-04 18:20:00Z', 'Uber Black Reunião Centro', 'Deslocamento encontro executivo', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 05: Freelance Entrada + Mercado Mês Orçamento + Aporte Europa + Netflix Crédito
    ('tx-sep-05a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-inc-free', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 420000, TIMESTAMPTZ '2026-09-05 14:00:00Z', 'Projeto Backend Fintech Sprint 1', 'Pagamento recebido via transferência PJ', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-05b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mer', 'bud-mer', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 89040, TIMESTAMPTZ '2026-09-05 18:30:00Z', 'Supermercado Assaí Atacadista', 'Compras gerais de mantimentos do mês', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-05c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-europa', 'EXPENSE', 'SAVING', 'COMPLETED', 80000, TIMESTAMPTZ '2026-09-05 16:30:00Z', 'Aporte Viagem Europa 2027', 'Aporte programado caixinha Eurotrip', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-05d', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-ass', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 5590, TIMESTAMPTZ '2026-09-05 02:00:00Z', 'Netflix Premium 4K HDR', 'Assinatura mensal plano familiar', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 06: Padaria Dinheiro + Almoço Lazer Orçamento + Cinema Crédito
    ('tx-sep-06a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-carteira', NULL, 'cat-exp-mer', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 4800, TIMESTAMPTZ '2026-09-06 09:30:00Z', 'Padaria & Café Artesanal', 'Pão de fermentação natural e queijo', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-06b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-res', 'bud-laz', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 14500, TIMESTAMPTZ '2026-09-06 13:30:00Z', 'Almoço Restaurante Italiano Famiglia', 'Almoço de domingo', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-06c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-itau', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 9600, TIMESTAMPTZ '2026-09-06 20:15:00Z', 'Cinema IMAX & Pipoca', 'Dois ingressos para estreia', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 07: Farmácia Débito + Combustível Crédito + Pedágio Orçamento
    ('tx-sep-07a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-sau', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 8750, TIMESTAMPTZ '2026-09-07 10:45:00Z', 'Farmácia Panvel Cuidados', 'Protetor solar e vitaminas', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-07b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-tra', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 23000, TIMESTAMPTZ '2026-09-07 11:30:00Z', 'Combustível Posto Shell V-Power 45L', 'Tanque completo carro', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-07c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-tra', 'bud-tra', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 4500, TIMESTAMPTZ '2026-09-07 18:00:00Z', 'Pedágios Rodovia & Estacionamento', 'Retorno passeio de fim de semana', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 08: Hortifruti Débito + Churrascaria Crédito + Happy Hour Orçamento
    ('tx-sep-08a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mer', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 12000, TIMESTAMPTZ '2026-09-08 16:30:00Z', 'Feira Hortifruti do Bairro', 'Frutas da estação e verduras', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-08b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-itau', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 24000, TIMESTAMPTZ '2026-09-08 21:00:00Z', 'Churrascaria Fogo de Chão', 'Jantar de negócios com parceiros', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-08c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-res', 'bud-laz', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 11000, TIMESTAMPTZ '2026-09-08 19:00:00Z', 'Happy Hour Cervejaria Artesanal', 'Chopp e petiscos com equipe', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 09: Drogaria Débito + Apple One Crédito
    ('tx-sep-09a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-sau', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 6400, TIMESTAMPTZ '2026-09-09 14:10:00Z', 'Drogaria Pacheco', 'Medicamentos uso contínuo', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-09b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-ass', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 4290, TIMESTAMPTZ '2026-09-09 03:00:00Z', 'Apple One Familiar (Music/Cloud)', 'Assinatura iCloud 2TB e Apple Music', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 10: Dividendos Renda + Aporte Mac Poupança + Cloud SaaS Orçamento + Spotify Crédito
    ('tx-sep-10a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-invest', NULL, 'cat-inc-div', NULL, NULL, 'INCOME', 'INCOME', 'COMPLETED', 68000, TIMESTAMPTZ '2026-09-10 11:00:00Z', 'Dividendos FIIs MXRF11 & HGLG11', 'Proventos creditados na carteira', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-10b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-mac', 'EXPENSE', 'SAVING', 'COMPLETED', 60000, TIMESTAMPTZ '2026-09-10 14:00:00Z', 'Aporte Setup MacBook Pro M4', 'Caixinha upgrade hardware de trabalho', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-10c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-exp-ass', 'bud-cld', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 19500, TIMESTAMPTZ '2026-09-10 09:30:00Z', 'Infraestrutura Cloud Hetzner & Supabase', 'Servidores VPS e instâncias de banco', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-10d', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-ass', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 3490, TIMESTAMPTZ '2026-09-10 02:00:00Z', 'Spotify Premium Family', 'Streaming de música e podcasts', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 11: Almoço Débito + Teclado Mecânico Parcelado Crédito (1/3)
    ('tx-sep-11a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-res', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 6200, TIMESTAMPTZ '2026-09-11 12:45:00Z', 'Almoço Executivo Steakhouse', 'Prato executivo meio de semana', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-11b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-com', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 24000, TIMESTAMPTZ '2026-09-11 16:30:00Z', 'Teclado Mecânico Keychron Q1 Pro (1/3)', 'Switch banana táctil para produtividade', 'BRL', 'grp-inst-01', 1, 3, TRUE),

    -- DIA 12: Cadeira DT3 Orçamento + iFood Crédito
    ('tx-sep-12a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-exp-com', 'bud-set', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 89000, TIMESTAMPTZ '2026-09-12 11:15:00Z', 'Cadeira Ergonômica DT3 Helora', 'Cadeira ergonômica com mesh para o setup', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-12b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 7850, TIMESTAMPTZ '2026-09-12 21:30:00Z', 'iFood Hamburgueria Artesanal Smash', 'Jantar de sexta à noite', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 13: Cafeteria Dinheiro + Abastecimento Etanol Crédito
    ('tx-sep-13a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-carteira', NULL, 'cat-exp-res', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 3600, TIMESTAMPTZ '2026-09-13 15:40:00Z', 'Cafeteria Grão Gourmet', 'Dois expressos duplos e cookies', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-13b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-tra', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 18000, TIMESTAMPTZ '2026-09-13 18:20:00Z', 'Posto Ipiranga Etanol 35L', 'Abastecimento fim de semana', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 14 (HOJE): Mercado Reposição Débito + Diária Hospedagem Orçamento + Setup Mercado Livre Crédito (1/4)
    ('tx-sep-14a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mer', NULL, NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 14520, TIMESTAMPTZ '2026-09-14 09:10:00Z', 'Supermercado Reposição Rápida', 'Pães, café, leite e queijos', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-14b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-exp-res', 'bud-via', NULL, 'EXPENSE', 'BUDGET', 'COMPLETED', 45000, TIMESTAMPTZ '2026-09-14 11:00:00Z', 'Reserva Pousada Feriado Booking', 'Sinal de confirmação estadia serra', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-14c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-com', NULL, NULL, 'EXPENSE', 'CREDIT', 'COMPLETED', 12500, TIMESTAMPTZ '2026-09-14 14:30:00Z', 'Cabos Thunderbolt 4 & Hub Anker (1/4)', 'Compra Mercado Livre setup', 'BRL', 'grp-inst-02', 1, 4, TRUE),

    -- DIA 15 (Agendado / Planejado): Consultoria Renda + Aporte Carro Poupança + Monitor UltraWide Crédito (2/5)
    ('tx-sep-15a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-inc-free', NULL, NULL, 'INCOME', 'INCOME', 'PENDING', 350000, TIMESTAMPTZ '2026-09-15 15:00:00Z', 'Consultoria Arquitetura Cloud AWS', 'Fatura honorários técnicos consultoria', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-15b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-carro', 'EXPENSE', 'SAVING', 'PENDING', 100000, TIMESTAMPTZ '2026-09-15 16:00:00Z', 'Aporte Entrada Carro Híbrido', 'Aporte programado quinzena', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-15c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-itau', 'cat-exp-com', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 35000, TIMESTAMPTZ '2026-09-15 17:00:00Z', 'Monitor LG UltraWide 34WQ650 (2/5)', 'Parcela 2 de 5 programada na fatura', 'BRL', 'grp-inst-03', 2, 5, TRUE),

    -- DIA 16: Manutenção Condomínio Débito
    ('tx-sep-16a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'PENDING', 9500, TIMESTAMPTZ '2026-09-16 10:00:00Z', 'Fundo de Reserva Condomínio Extra', 'Chamada de capital pintura fachada', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 18: Carnes Débito + Jantar Crédito
    ('tx-sep-18a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mer', NULL, NULL, 'EXPENSE', 'EXPENSE', 'PENDING', 21000, TIMESTAMPTZ '2026-09-18 17:30:00Z', 'Açougue Swift Carnes Nobres', 'Cortes selecionados para a quinzena', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-18b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-itau', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 19500, TIMESTAMPTZ '2026-09-18 20:30:00Z', 'Jantar Outback Steakhouse', 'Jantar de comemoração de sprint', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 20: Projeto Go Renda + Aporte Certificação Poupança + GitHub Copilot Crédito
    ('tx-sep-20a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-itau', NULL, 'cat-inc-free', NULL, NULL, 'INCOME', 'INCOME', 'PENDING', 280000, TIMESTAMPTZ '2026-09-20 14:00:00Z', 'Projeto Go Microserviços Sprint 2', 'Entrega e deploy em staging', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-20b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-inv', NULL, 'goal-curso', 'EXPENSE', 'SAVING', 'PENDING', 50000, TIMESTAMPTZ '2026-09-20 15:30:00Z', 'Aporte Certificação AI & Cloud', 'Caixinha de aperfeiçoamento profissional', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-20c', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-ass', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 12000, TIMESTAMPTZ '2026-09-20 02:00:00Z', 'GitHub Enterprise & Copilot AI', 'Ferramentas de produtividade desenvolvimento', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 22: Passagens GOL Crédito (1/6) + Mercado Quinzena 2 Orçamento
    ('tx-sep-22a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 38000, TIMESTAMPTZ '2026-09-22 16:40:00Z', 'Passagens Aéreas GOL Férias (1/6)', 'Voo ida e volta 2 passageiros', 'BRL', 'grp-inst-04', 1, 6, TRUE),
    ('tx-sep-22b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mer', 'bud-mer', NULL, 'EXPENSE', 'BUDGET', 'PENDING', 58000, TIMESTAMPTZ '2026-09-22 18:40:00Z', 'Mercado Quinzena Pão de Açúcar', 'Reposição laticínios, azeites e carnes', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 25: Cashback Renda + Pizza Crédito
    ('tx-sep-25a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-inc-cb', NULL, NULL, 'INCOME', 'INCOME', 'PENDING', 42000, TIMESTAMPTZ '2026-09-25 11:20:00Z', 'Cashback Nubank Ultravioleta', 'Rendimento do cashback 200% CDI resgatado', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-sep-25b', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 8800, TIMESTAMPTZ '2026-09-25 21:00:00Z', 'iFood Pizza Forno Napolitana', 'Jantar de sexta pizza artesanal', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 27: Pagamento Fatura Cartão Débito
    ('tx-sep-27a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-fat', NULL, NULL, 'EXPENSE', 'EXPENSE', 'PENDING', 185000, TIMESTAMPTZ '2026-09-27 10:00:00Z', 'Pagamento Fatura Nubank Ultravioleta', 'Débito em conta corrente fatura mês 08', 'BRL', NULL, NULL, NULL, TRUE),

    -- DIA 28: Revisão Carro Orçamento
    ('tx-sep-28a', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-tra', 'bud-tra', NULL, 'EXPENSE', 'BUDGET', 'PENDING', 32000, TIMESTAMPTZ '2026-09-28 15:30:00Z', 'Manutenção Preventiva Troca de Óleo', 'Revisão e alinhamento do veículo', 'BRL', NULL, NULL, NULL, TRUE),

    -- ==========================================
    -- OUTUBRO 2026 (Parcelas Futuras e Previsões)
    -- ==========================================
    ('tx-oct-01', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-inc-sal', NULL, NULL, 'INCOME', 'INCOME', 'PENDING', 1450000, TIMESTAMPTZ '2026-10-01 10:00:00Z', 'Salário Mensal Nilbyte', 'Depósito previsto de remuneração', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-oct-02', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-nubank', NULL, 'cat-exp-mor', NULL, NULL, 'EXPENSE', 'EXPENSE', 'PENDING', 320000, TIMESTAMPTZ '2026-10-02 09:00:00Z', 'Aluguel Apartamento', 'PIX proprietário programado', 'BRL', NULL, NULL, NULL, TRUE),
    ('tx-oct-03', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-com', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 24000, TIMESTAMPTZ '2026-10-11 16:30:00Z', 'Teclado Mecânico Keychron Q1 Pro (2/3)', 'Segunda parcela do teclado', 'BRL', 'grp-inst-01', 2, 3, TRUE),
    ('tx-oct-04', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-com', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 12500, TIMESTAMPTZ '2026-10-14 14:30:00Z', 'Cabos Thunderbolt 4 & Hub Anker (2/4)', 'Segunda parcela hub mercado livre', 'BRL', 'grp-inst-02', 2, 4, TRUE),
    ('tx-oct-05', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-itau', 'cat-exp-com', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 35000, TIMESTAMPTZ '2026-10-15 17:00:00Z', 'Monitor LG UltraWide 34WQ650 (3/5)', 'Terceira parcela monitor setup', 'BRL', 'grp-inst-03', 3, 5, TRUE),
    ('tx-oct-06', 'd290f1ee-6c54-4b01-90e6-d701748f0851', NULL, 'card-nu', 'cat-exp-res', NULL, NULL, 'EXPENSE', 'CREDIT', 'PENDING', 38000, TIMESTAMPTZ '2026-10-22 16:40:00Z', 'Passagens Aéreas GOL Férias (2/6)', 'Segunda parcela passagens aéreas', 'BRL', 'grp-inst-04', 2, 6, TRUE)
ON CONFLICT (id) DO NOTHING;

COMMIT;
