BEGIN;

TRUNCATE TABLE
    transactions,
    budgets,
    categories,
    credit_cards,
    card_invoice_payments,
    accounts,
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

INSERT INTO accounts (id, user_id, name, type, currency_code, initial_balance_cents, is_active)
VALUES
    ('acc-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Conta Corrente Nubank', 'CHECKING', 'BRL', 500000, TRUE),
    ('acc-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva de Emergência', 'EMERGENCY', 'BRL', 1500000, TRUE),
    ('acc-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Carteira Física', 'WALLET', 'BRL', 20000, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO credit_cards (id, user_id, name, brand, last4, credit_limit_cents, closing_day, due_day, is_active)
VALUES
    ('card-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank Ultravioleta', 'Mastercard', '4321', 1200000, 20, 27, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, user_id, name, type, description, color, parent_id)
VALUES
    ('cat-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Renda Principal', 'INCOME', 'Salário e remuneração mensal', '#16a34a', NULL),
    ('cat-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Freelancer & Projetos', 'INCOME', 'Consultorias e desenvolvimento', '#0f766e', NULL),
    ('cat-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Rendimentos', 'INCOME', 'Dividendos e juros sobre capital', '#059669', NULL),
    ('cat-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Moradia & Contas', 'EXPENSE', 'Aluguel, condomínio, luz, internet', '#dc2626', NULL),
    ('cat-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Alimentação & Mercado', 'EXPENSE', 'Compras de mês, açougue e feira', '#ea580c', NULL),
    ('cat-6', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Restaurantes & Lazer', 'EXPENSE', 'Jantares, bares e passeios', '#d97706', NULL),
    ('cat-7', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Transporte & Mobilidade', 'EXPENSE', 'Uber, combustível e estacionamento', '#0284c7', NULL),
    ('cat-8', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Saúde & Bem-Estar', 'EXPENSE', 'Farmácia, convênio e academia', '#e11d48', NULL),
    ('cat-9', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Assinaturas & Nuvem', 'EXPENSE', 'Netflix, Spotify, AWS, GitHub', '#7c3aed', NULL),
    ('cat-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva & Aportes', 'EXPENSE', 'Investimentos futuros e poupança', '#2563eb', NULL),
    ('cat-11', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Cartão de Crédito', 'EXPENSE', 'Compras parceladas diversas', '#9333ea', NULL)
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO budgets (id, user_id, name, allocated_amount_cents, notes, is_active)
VALUES
    ('bud-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Viagem Fim de Ano', 800000, 'Passagens e hospedagem para a viagem', TRUE),
    ('bud-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reforma do Escritório', 350000, 'Mesa ergonômica, monitor e setup dev', TRUE),
    ('bud-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Reserva de Emergência 2026', 1200000, 'Aporte planejado para 6 meses de segurança', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (
    id, user_id, category_id, budget_id, type, kind, status,
    amount_cents, date, description, notes, currency_code, is_active
)
VALUES
    -- ================= SETEMBRO 2026 =================
    -- Rendas de Setembro
    ('tx-sep-01', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-1', NULL, 'INCOME', 'INCOME', 'COMPLETED', 1450000, TIMESTAMPTZ '2026-09-01 10:00:00Z', 'Salário Mensal Nilbyte', 'Depósito em conta corrente', 'BRL', TRUE),
    ('tx-sep-02', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2', NULL, 'INCOME', 'INCOME', 'COMPLETED', 380000, TIMESTAMPTZ '2026-09-05 14:30:00Z', 'Projeto Backend Fintech', 'Pagamento da sprint 1', 'BRL', TRUE),
    ('tx-sep-03', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-3', NULL, 'INCOME', 'INCOME', 'COMPLETED', 45200, TIMESTAMPTZ '2026-09-15 11:00:00Z', 'Dividendos FIIs', 'Rendimentos mensais da carteira', 'BRL', TRUE),
    ('tx-sep-04', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2', NULL, 'INCOME', 'INCOME', 'COMPLETED', 220000, TIMESTAMPTZ '2026-09-22 16:00:00Z', 'Consultoria Arquitetura Cloud', 'Workshop 4h com equipe externa', 'BRL', TRUE),

    -- Despesas de Setembro (Moradia & Fixas)
    ('tx-sep-05', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 320000, TIMESTAMPTZ '2026-09-02 09:00:00Z', 'Aluguel Apartamento', 'PIX proprietário', 'BRL', TRUE),
    ('tx-sep-06', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 78000, TIMESTAMPTZ '2026-09-03 10:15:00Z', 'Condomínio', 'Boleto bancário pago', 'BRL', TRUE),
    ('tx-sep-07', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 34500, TIMESTAMPTZ '2026-09-04 11:00:00Z', 'Energia Elétrica (Energisa)', 'Fatura mês 08/2026', 'BRL', TRUE),
    ('tx-sep-08', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 14990, TIMESTAMPTZ '2026-09-05 08:30:00Z', 'Internet Fibra 1Gbps', 'Débito automático', 'BRL', TRUE),

    -- Alimentação e Mercado Setembro
    ('tx-sep-09', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 89040, TIMESTAMPTZ '2026-09-02 18:40:00Z', 'Compras de Mês Supermercado', 'Assaí Atacadista', 'BRL', TRUE),
    ('tx-sep-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 16500, TIMESTAMPTZ '2026-09-08 17:20:00Z', 'Feira Orgânica & Hortifruti', 'Feira livre do bairro', 'BRL', TRUE),
    ('tx-sep-11', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 34020, TIMESTAMPTZ '2026-09-16 19:10:00Z', 'Mercado Reposição', 'Carrefour Express', 'BRL', TRUE),
    ('tx-sep-12', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 21000, TIMESTAMPTZ '2026-09-24 18:00:00Z', 'Açougue e Frios', 'Cortes para a quinzena', 'BRL', TRUE),

    -- Restaurantes & Lazer Setembro
    ('tx-sep-13', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-6', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 14500, TIMESTAMPTZ '2026-09-06 20:30:00Z', 'Jantar Japonês', 'Rodízio com amigos', 'BRL', TRUE),
    ('tx-sep-14', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-6', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 8900, TIMESTAMPTZ '2026-09-12 13:00:00Z', 'Almoço Restaurante Italiano', 'Comemoração de entrega', 'BRL', TRUE),
    ('tx-sep-15', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-6', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 5400, TIMESTAMPTZ '2026-09-20 21:00:00Z', 'Cinema & Pipoca', 'Ingressos IMAX', 'BRL', TRUE),

    -- Mobilidade Setembro
    ('tx-sep-16', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 4250, TIMESTAMPTZ '2026-09-07 15:10:00Z', 'Uber Aeroporto / Centro', 'Viagem de volta do evento', 'BRL', TRUE),
    ('tx-sep-17', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 23000, TIMESTAMPTZ '2026-09-14 09:30:00Z', 'Combustível Etanol 40L', 'Posto Ipiranga', 'BRL', TRUE),
    ('tx-sep-18', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 6500, TIMESTAMPTZ '2026-09-25 18:20:00Z', 'Estacionamento & Pedágios', 'Shopping e retorno', 'BRL', TRUE),

    -- Saúde, Assinaturas & Aportes Setembro
    ('tx-sep-19', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-8', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 18900, TIMESTAMPTZ '2026-09-04 07:30:00Z', 'Mensalidade Academia SmartFit', 'Plano Black', 'BRL', TRUE),
    ('tx-sep-20', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-8', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 11240, TIMESTAMPTZ '2026-09-18 16:40:00Z', 'Farmácia Drogasil', 'Vitaminas e suplementos', 'BRL', TRUE),
    ('tx-sep-21', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-9', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 5590, TIMESTAMPTZ '2026-09-05 02:00:00Z', 'Netflix Premium 4K', 'Assinatura familiar', 'BRL', TRUE),
    ('tx-sep-22', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-9', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 3490, TIMESTAMPTZ '2026-09-10 02:00:00Z', 'Spotify Family', 'Música e podcasts', 'BRL', TRUE),
    ('tx-sep-23', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-9', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 12000, TIMESTAMPTZ '2026-09-12 02:00:00Z', 'GitHub Copilot + Cloud VPS', 'Ferramentas de desenvolvimento', 'BRL', TRUE),
    ('tx-sep-24', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-10', 'bud-3', 'EXPENSE', 'SAVING', 'COMPLETED', 300000, TIMESTAMPTZ '2026-09-02 11:30:00Z', 'Aporte Reserva Selic', 'Tesouro Direto 2029', 'BRL', TRUE),
    ('tx-sep-25', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-11', 'bud-2', 'EXPENSE', 'BUDGET', 'COMPLETED', 145000, TIMESTAMPTZ '2026-09-15 15:00:00Z', 'Monitor UltraWide 34"', 'Setup para produtividade', 'BRL', TRUE),
    ('tx-sep-26', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-11', 'bud-1', 'EXPENSE', 'BUDGET', 'COMPLETED', 210000, TIMESTAMPTZ '2026-09-28 17:00:00Z', 'Hospedagem Hotel Booking', 'Reserva de 4 diárias', 'BRL', TRUE),

    -- ================= OUTUBRO 2026 =================
    -- Rendas de Outubro
    ('tx-oct-01', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-1', NULL, 'INCOME', 'INCOME', 'COMPLETED', 1450000, TIMESTAMPTZ '2026-10-01 10:00:00Z', 'Salário Mensal Nilbyte', 'Depósito em conta corrente', 'BRL', TRUE),
    ('tx-oct-02', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2', NULL, 'INCOME', 'INCOME', 'COMPLETED', 520000, TIMESTAMPTZ '2026-10-06 15:00:00Z', 'Projeto E-commerce Go/React', 'Entrega do MVP e deploy', 'BRL', TRUE),
    ('tx-oct-03', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-3', NULL, 'INCOME', 'INCOME', 'COMPLETED', 51000, TIMESTAMPTZ '2026-10-15 11:00:00Z', 'Rendimentos FIIs & Ações', 'Proventos creditados', 'BRL', TRUE),
    ('tx-oct-04', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-2', NULL, 'INCOME', 'INCOME', 'PENDING', 250000, TIMESTAMPTZ '2026-10-25 14:00:00Z', 'Consultoria Otimização PostgreSQL', 'Fatura a receber no fim do mês', 'BRL', TRUE),

    -- Despesas de Outubro (Moradia & Fixas)
    ('tx-oct-05', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 320000, TIMESTAMPTZ '2026-10-02 09:00:00Z', 'Aluguel Apartamento', 'PIX proprietário', 'BRL', TRUE),
    ('tx-oct-06', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 81000, TIMESTAMPTZ '2026-10-03 10:15:00Z', 'Condomínio', 'Boleto bancário pago', 'BRL', TRUE),
    ('tx-oct-07', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 31200, TIMESTAMPTZ '2026-10-04 11:00:00Z', 'Energia Elétrica', 'Fatura mês 09/2026', 'BRL', TRUE),
    ('tx-oct-08', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-4', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 14990, TIMESTAMPTZ '2026-10-05 08:30:00Z', 'Internet Fibra 1Gbps', 'Débito automático', 'BRL', TRUE),

    -- Alimentação e Mercado Outubro
    ('tx-oct-09', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 94000, TIMESTAMPTZ '2026-10-02 19:15:00Z', 'Mercado Completo Quinzena 1', 'Sams Club & Atacadão', 'BRL', TRUE),
    ('tx-oct-10', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 18500, TIMESTAMPTZ '2026-10-09 17:30:00Z', 'Feira Livre Semanal', 'Legumes, frutas e ovos', 'BRL', TRUE),
    ('tx-oct-11', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 41000, TIMESTAMPTZ '2026-10-17 18:50:00Z', 'Reposição Mercado & Padaria', 'Pão francês, laticínios e café', 'BRL', TRUE),
    ('tx-oct-12', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-5', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 26000, TIMESTAMPTZ '2026-10-26 18:20:00Z', 'Carnes & Congelados', 'Swift Carnes Nobres', 'BRL', TRUE),

    -- Restaurantes, Lazer & Mobilidade Outubro
    ('tx-oct-13', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-6', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 17800, TIMESTAMPTZ '2026-10-10 21:00:00Z', 'Hamburgueria Artesanal', 'Lanche fim de semana', 'BRL', TRUE),
    ('tx-oct-14', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-6', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 11500, TIMESTAMPTZ '2026-10-18 13:30:00Z', 'Churrascaria de Domingo', 'Almoço em família', 'BRL', TRUE),
    ('tx-oct-15', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 24500, TIMESTAMPTZ '2026-10-07 10:00:00Z', 'Combustível Gasolina 45L', 'Posto Shell', 'BRL', TRUE),
    ('tx-oct-16', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-7', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 5800, TIMESTAMPTZ '2026-10-21 16:45:00Z', 'Corridas Uber Centro', 'Reuniões externas de negócio', 'BRL', TRUE),

    -- Saúde, Assinaturas & Orçamentos Outubro
    ('tx-oct-17', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-8', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 18900, TIMESTAMPTZ '2026-10-04 07:30:00Z', 'Mensalidade Academia SmartFit', 'Plano Black', 'BRL', TRUE),
    ('tx-oct-18', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-8', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 8750, TIMESTAMPTZ '2026-10-14 15:10:00Z', 'Farmácia Pacheco', 'Remédios e cuidados pessoais', 'BRL', TRUE),
    ('tx-oct-19', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-9', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 5590, TIMESTAMPTZ '2026-10-05 02:00:00Z', 'Netflix Premium 4K', 'Assinatura mensal', 'BRL', TRUE),
    ('tx-oct-20', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-9', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 3490, TIMESTAMPTZ '2026-10-10 02:00:00Z', 'Spotify Family', 'Música e podcasts', 'BRL', TRUE),
    ('tx-oct-21', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-9', NULL, 'EXPENSE', 'EXPENSE', 'COMPLETED', 12000, TIMESTAMPTZ '2026-10-12 02:00:00Z', 'GitHub Copilot + Cloud VPS', 'Infraestrutura e IA', 'BRL', TRUE),
    ('tx-oct-22', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-10', 'bud-3', 'EXPENSE', 'SAVING', 'COMPLETED', 450000, TIMESTAMPTZ '2026-10-02 11:30:00Z', 'Aporte Ações & FIIs', 'Compra mensal de ativos', 'BRL', TRUE),
    ('tx-oct-23', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-11', 'bud-1', 'EXPENSE', 'BUDGET', 'COMPLETED', 380000, TIMESTAMPTZ '2026-10-19 14:20:00Z', 'Passagens Aéreas Férias', 'Compra 2 passagens ida e volta', 'BRL', TRUE),
    ('tx-oct-24', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'cat-11', 'bud-2', 'EXPENSE', 'BUDGET', 'PENDING', 95000, TIMESTAMPTZ '2026-10-28 10:00:00Z', 'Cadeira Ergonômica Herman Miller', 'Parcela 1/5 planejada', 'BRL', TRUE)
ON CONFLICT (id) DO NOTHING;

COMMIT;
