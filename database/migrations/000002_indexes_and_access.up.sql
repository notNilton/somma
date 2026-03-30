-- Índices adicionais para account_access e calendário financeiro
CREATE INDEX IF NOT EXISTS idx_account_access_user_id    ON account_access(user_id);
CREATE INDEX IF NOT EXISTS idx_account_access_account_id ON account_access(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status_date  ON transactions(user_id, status, date)
    WHERE is_active = true;
