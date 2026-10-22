-- O saldo da conta passa a ser calculado: initial_balance_cents + efeito dos
-- lançamentos ativos com data até agora (receita soma, despesa subtrai; compras
-- no crédito e cancelados não contam). Lançamentos futuros (recorrências,
-- agendamentos) só pesam quando a data chega.
-- Recalcula a base para que o saldo exibido hoje continue o mesmo.
UPDATE accounts a
SET initial_balance_cents = a.balance_cents - COALESCE((
        SELECT SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_cents ELSE -t.amount_cents END)
        FROM transactions t
        WHERE t.account_id = a.id
          AND t.is_active AND t.deleted_at IS NULL
          AND t.status <> 'CANCELED'
          AND t.kind <> 'CREDIT'
          AND t.date <= NOW()
    ), 0),
    updated_at = NOW();
