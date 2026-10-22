-- name: UpsertInvoice :one
INSERT INTO credit_card_invoices (credit_card_id, reference_month, reference_year, closing_date, due_date)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (credit_card_id, reference_month, reference_year)
DO UPDATE SET credit_card_id = EXCLUDED.credit_card_id
RETURNING id, credit_card_id, reference_month, reference_year, closing_date, due_date, status, paid_at;

-- name: CreateInstallment :one
INSERT INTO invoice_installments (purchase_id, invoice_id, installment_number, amount_cents)
VALUES ($1, $2, $3, $4)
RETURNING id, purchase_id, invoice_id, installment_number, amount_cents;

-- name: GetInvoiceByID :one
SELECT id, credit_card_id, reference_month, reference_year, closing_date, due_date, status, paid_at
FROM credit_card_invoices
WHERE id = $1;

-- name: GetInvoiceForUpdate :one
SELECT id, credit_card_id, reference_month, reference_year, closing_date, due_date, status, paid_at
FROM credit_card_invoices
WHERE id = $1
FOR UPDATE;

-- name: GetInvoiceTotal :one
SELECT COALESCE(SUM(amount_cents), 0)::BIGINT AS total_amount_cents
FROM invoice_installments
WHERE invoice_id = $1;

-- name: MarkInvoicePaid :one
UPDATE credit_card_invoices
SET status = 'paid', paid_at = NOW()
WHERE id = $1
RETURNING id, credit_card_id, reference_month, reference_year, closing_date, due_date, status, paid_at;

-- name: ListInvoicesByCardID :many
SELECT 
    inv.id,
    inv.credit_card_id,
    inv.reference_month,
    inv.reference_year,
    inv.closing_date,
    inv.due_date,
    inv.status,
    inv.paid_at,
    COALESCE(SUM(inst.amount_cents), 0)::BIGINT AS total_amount_cents
FROM credit_card_invoices inv
LEFT JOIN invoice_installments inst ON inst.invoice_id = inv.id
WHERE inv.credit_card_id = $1
GROUP BY inv.id, inv.credit_card_id, inv.reference_month, inv.reference_year, inv.closing_date, inv.due_date, inv.status, inv.paid_at
ORDER BY inv.reference_year DESC, inv.reference_month DESC;

-- name: GetCurrentInvoiceByCardID :one
SELECT 
    inv.id,
    inv.credit_card_id,
    inv.reference_month,
    inv.reference_year,
    inv.closing_date,
    inv.due_date,
    inv.status,
    inv.paid_at,
    COALESCE(SUM(inst.amount_cents), 0)::BIGINT AS total_amount_cents
FROM credit_card_invoices inv
LEFT JOIN invoice_installments inst ON inst.invoice_id = inv.id
WHERE inv.credit_card_id = $1 
  AND inv.reference_month = $2 
  AND inv.reference_year = $3
GROUP BY inv.id, inv.credit_card_id, inv.reference_month, inv.reference_year, inv.closing_date, inv.due_date, inv.status, inv.paid_at;

-- name: ListInstallmentsByInvoiceID :many
SELECT 
    inst.id,
    inst.purchase_id,
    inst.invoice_id,
    inst.installment_number,
    inst.amount_cents,
    p.description AS purchase_description,
    p.installments_count,
    p.purchase_date
FROM invoice_installments inst
JOIN credit_card_purchases p ON p.id = inst.purchase_id
WHERE inst.invoice_id = $1
ORDER BY inst.installment_number ASC;
