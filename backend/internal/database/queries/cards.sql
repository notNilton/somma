-- name: CreateCard :one
INSERT INTO credit_cards (user_id, name, total_limit_cents, closing_day, due_day)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, name, total_limit_cents, closing_day, due_day, created_at;

-- name: ListCardsByUserID :many
SELECT id, user_id, name, total_limit_cents, closing_day, due_day, created_at
FROM credit_cards
WHERE user_id = $1
ORDER BY name ASC;

-- name: GetCardByID :one
SELECT id, user_id, name, total_limit_cents, closing_day, due_day, created_at
FROM credit_cards
WHERE id = $1;

-- name: GetCardWithAvailableLimit :one
SELECT 
    c.id,
    c.user_id,
    c.name,
    c.total_limit_cents,
    c.closing_day,
    c.due_day,
    c.created_at,
    (c.total_limit_cents - COALESCE(SUM(i_inst.amount_cents), 0))::BIGINT AS available_limit_cents
FROM credit_cards c
LEFT JOIN credit_card_invoices inv 
    ON inv.credit_card_id = c.id AND inv.status != 'paid'
LEFT JOIN invoice_installments i_inst 
    ON i_inst.invoice_id = inv.id
WHERE c.id = $1
GROUP BY c.id, c.user_id, c.name, c.total_limit_cents, c.closing_day, c.due_day, c.created_at;

-- name: ListCardsWithAvailableLimitByUserID :many
SELECT 
    c.id,
    c.user_id,
    c.name,
    c.total_limit_cents,
    c.closing_day,
    c.due_day,
    c.created_at,
    (c.total_limit_cents - COALESCE(SUM(i_inst.amount_cents), 0))::BIGINT AS available_limit_cents
FROM credit_cards c
LEFT JOIN credit_card_invoices inv 
    ON inv.credit_card_id = c.id AND inv.status != 'paid'
LEFT JOIN invoice_installments i_inst 
    ON i_inst.invoice_id = inv.id
WHERE c.user_id = $1
GROUP BY c.id, c.user_id, c.name, c.total_limit_cents, c.closing_day, c.due_day, c.created_at
ORDER BY c.name ASC;

-- name: CreatePurchase :one
INSERT INTO credit_card_purchases (user_id, credit_card_id, description, total_amount_cents, installments_count, purchase_date)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, user_id, credit_card_id, description, total_amount_cents, installments_count, purchase_date;
