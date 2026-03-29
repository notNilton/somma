-- Seed Data for Mirante - Nilton Santos

-- 1. Create User: Nilton Santos
-- Password: @2Organela
INSERT INTO users (id, email, name, password_hash)
VALUES (
    'd290f1ee-6c54-4b01-90e6-d701748f0851', 
    'nilton.naab@gmail.com', 
    'Nilton Santos', 
    '$2a$10$NW57BAuRGOxHi45/go9XVOgAXf8UEFE52vMxdR.CV/5oFTE5aW7SK'
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. Create Accounts (5+)
INSERT INTO accounts (id, user_id, name, type, bank_name, balance_cents, color, icon)
VALUES 
    ('acc-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Nubank', 'CHECKING', 'Nubank', 350025, '#8A05BE', 'bank'),
    ('acc-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Inter', 'CHECKING', 'Inter', 125080, '#FF7A00', 'bank'),
    ('acc-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Poupança BB', 'SAVINGS', 'Banco do Brasil', 2500000, '#FBDA00', 'savings'),
    ('acc-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Santander', 'CHECKING', 'Santander', 80000, '#EC0000', 'bank'),
    ('acc-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Carteira', 'CASH', 'Cash', 15000, '#4CAF50', 'wallet'),
    ('acc-6', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Investment XP', 'INVESTMENT', 'XP', 7500000, '#000000', 'trending-up')
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
    ('cat-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Lazer', 'EXPENSE', '#2196F3'),
    ('cat-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Saúde', 'EXPENSE', '#E91E63'),
    ('cat-6', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Educação', 'EXPENSE', '#9C27B0'),
    ('cat-7', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Serviços/Streaming', 'EXPENSE', '#607D8B')
ON CONFLICT (user_id, name, type) DO NOTHING;

-- 5. Create some Tags
INSERT INTO tags (id, name, color)
VALUES 
    ('tag-1', 'Urgente', '#F44336'),
    ('tag-2', 'Viagem', '#00BCD4'),
    ('tag-3', 'Trabalho', '#4CAF50')
ON CONFLICT (id) DO NOTHING;

-- 6. Create Transactions
INSERT INTO transactions (id, user_id, account_id, category_id, type, amount_cents, description, date, status)
VALUES 
    ('tra-1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'cat-3', 'INCOME', 1200000, 'Salário Mirante', NOW() - INTERVAL '5 days', 'COMPLETED'),
    ('tra-2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'cat-1', 'EXPENSE', 4500, 'Almoço Executivo', NOW() - INTERVAL '4 days', 'COMPLETED'),
    ('tra-3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-2', 'cat-7', 'EXPENSE', 5590, 'Netflix', NOW() - INTERVAL '3 days', 'COMPLETED'),
    ('tra-4', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-1', 'cat-2', 'EXPENSE', 22000, 'Abastecimento Completo', NOW() - INTERVAL '2 days', 'COMPLETED'),
    ('tra-5', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'acc-4', 'cat-5', 'EXPENSE', 8500, 'Farmácia Drogasil', NOW(), 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- 7. Link Transação de Combustível ao Veículo
INSERT INTO refueling_logs (id, vehicle_id, transaction_id, current_km, liters, price_per_liter_cents, fuel_type)
VALUES (
    'log-1',
    'veh-1', 
    'tra-4', 
    125850.2, 
    37.4, 
    588, -- R$ 5,88
    'GASOLINA_COMUM'
) ON CONFLICT (id) DO NOTHING;

-- 8. Assign Tags
INSERT INTO transaction_tags (transaction_id, tag_id)
VALUES 
    ('tra-1', 'tag-3'),
    ('tra-5', 'tag-1')
ON CONFLICT DO NOTHING;
