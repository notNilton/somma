-- name: CreateAccountTransaction :one
INSERT INTO account_transactions (user_id, account_id, amount_cents, type, description, invoice_id, occurred_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, user_id, account_id, amount_cents, type, description, invoice_id, occurred_at;

-- name: ListAccountTransactionsByUserID :many
SELECT id, user_id, account_id, amount_cents, type, description, invoice_id, occurred_at
FROM account_transactions
WHERE user_id = $1
ORDER BY occurred_at DESC;

-- name: ListAccountTransactionsByAccountID :many
SELECT id, user_id, account_id, amount_cents, type, description, invoice_id, occurred_at
FROM account_transactions
WHERE account_id = $1
ORDER BY occurred_at DESC;
