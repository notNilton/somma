-- name: CreateAccount :one
-- O saldo corrente começa igual ao depósito inicial ($9).
INSERT INTO accounts (
    user_id, name, type, bank_code, bank_name, holder_name,
    holder_document_type, holder_document, initial_balance_cents, balance_cents
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
RETURNING *;

-- name: ListAccountsByUserID :many
SELECT *
FROM accounts
WHERE user_id = $1 AND is_active = TRUE
ORDER BY name ASC;

-- name: GetAccountByID :one
SELECT *
FROM accounts
WHERE id = $1;

-- name: GetAccountForUpdate :one
SELECT *
FROM accounts
WHERE id = $1
FOR UPDATE;

-- name: UpdateAccount :one
UPDATE accounts
SET name                  = $3,
    type                  = $4,
    bank_code             = $5,
    bank_name             = $6,
    holder_name           = $7,
    holder_document_type  = $8,
    holder_document       = $9,
    initial_balance_cents = $10,
    balance_cents         = $11,
    updated_at            = NOW()
WHERE id = $1 AND user_id = $2 AND is_active = TRUE
RETURNING *;

-- name: DeactivateAccount :execrows
UPDATE accounts
SET is_active = FALSE, updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND is_active = TRUE;

-- name: UpdateAccountBalance :one
UPDATE accounts
SET balance_cents = balance_cents + $2
WHERE id = $1
RETURNING *;

-- name: DeductAccountBalance :one
UPDATE accounts
SET balance_cents = balance_cents - $2
WHERE id = $1
RETURNING *;

-- name: ListAccountBalances :many
-- Saldo de cada conta: base + lançamentos ativos com data até agora
-- (compras no crédito e cancelados não contam).
SELECT a.id,
       (a.initial_balance_cents + COALESCE(SUM(
           CASE WHEN t.type = 'INCOME' THEN t.amount_cents ELSE -t.amount_cents END
       ), 0))::BIGINT AS balance_cents
FROM accounts a
LEFT JOIN transactions t
       ON t.account_id = a.id
      AND t.is_active AND t.deleted_at IS NULL
      AND t.status <> 'CANCELED'
      AND t.kind <> 'CREDIT'
      AND t.date <= NOW()
WHERE a.user_id = $1
GROUP BY a.id;
