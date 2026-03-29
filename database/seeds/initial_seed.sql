-- Seed Data for Mirante

-- 1. Create User: Nilton Santos
-- Password hash for 'password123' (bcrypt)
INSERT INTO users (id, email, name, password_hash)
VALUES (
    'd290f1ee-6c54-4b01-90e6-d701748f0851', 
    'nilton@example.com', 
    'Nilton Santos', 
    '$2a$10$ByI63K1.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X'
) ON CONFLICT (email) DO NOTHING;

-- 2. Create Accounts (5)
INSERT INTO accounts (id, user_id, name, type, bank_name, balance_cents, color, icon)
VALUES 
    ('acc-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank', 'CHECKING', 'Nubank', 150000, '#8A05BE', 'bank'),
    ('acc-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Inter', 'CHECKING', 'Inter', 50000, '#FF7A00', 'bank'),
    ('acc-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Poupança BB', 'SAVINGS', 'Banco do Brasil', 1000000, '#FBDA00', 'savings'),
    ('acc-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Carteira', 'CASH', 'Cash', 5000, '#4CAF50', 'wallet'),
    ('acc-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Investimentos', 'INVESTMENT', 'XP', 5000000, '#000000', 'trending-up')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Vehicle: Fiat Uno Mille
INSERT INTO vehicles (id, user_id, name, brand, model, year, license_plate, tank)
VALUES (
    'veh-1', 
    'd290f1ee-6c54-4b01-90e6-d701748f0851', 
    'Fiat Uno Mille', 
    'Fiat', 
    'Uno Mille', 
    2012, 
    'NIL-0001', 
    50.00
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Categories
INSERT INTO categories (id, user_id, name, type, color)
VALUES 
    ('cat-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Alimentação', 'EXPENSE', '#FF5252'),
    ('cat-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Combustível', 'EXPENSE', '#FFC107'),
    ('cat-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Salário', 'INCOME', '#4CAF50'),
    ('cat-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Lazer', 'EXPENSE', '#2196F3')
ON CONFLICT (user_id, name, type) DO NOTHING;

-- 5. Create some Transactions
INSERT INTO transactions (id, user_id, account_id, category_id, type, amount_cents, description, date, status)
VALUES 
    ('tra-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'cat-3', 'INCOME', 500000, 'Salário Mensal', NOW(), 'COMPLETED'),
    ('tra-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'cat-1', 'EXPENSE', 12050, 'Supermercado', NOW(), 'COMPLETED'),
    ('tra-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'cat-2', 'EXPENSE', 15000, 'Posto de Gasolina', NOW(), 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- 6. Link Transação de Combustível ao Veículo
INSERT INTO refueling_logs (vehicle_id, transaction_id, current_km, liters, price_per_liter_cents, fuel_type)
VALUES (
    'veh-1', 
    'tra-3', 
    125400.5, 
    25.5, 
    588, -- R$ 5,88
    'GASOLINA_COMUM'
) ON CONFLICT (transaction_id) DO NOTHING;
