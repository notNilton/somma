-- name: ListLedgerTransactions :many
-- Lançamentos ativos do usuário em [from, to).
SELECT id, status::TEXT AS status, amount_cents, date, description, notes,
       type::TEXT AS type, kind::TEXT AS kind, category_id, card_id, account_id,
       transfer_id, is_transfer, installment_group_id, installment_number,
       total_installments, is_invoice_payment, is_recurring, recurring_origin_id
FROM transactions
WHERE user_id = @user_id
  AND is_active = TRUE
  AND deleted_at IS NULL
  AND date >= @date_from
  AND date < @date_to
ORDER BY date ASC, created_at ASC;

-- name: CreateAccountDeposit :one
-- Entrada de dinheiro numa conta (ex.: depósito inicial).
INSERT INTO transactions (user_id, account_id, amount_cents, date, description, type, kind, status)
VALUES (@user_id, @account_id, @amount_cents, @date, @description, 'INCOME', 'INCOME', 'COMPLETED')
RETURNING id;

-- name: GetLedgerTransactionForUpdate :one
SELECT id, type::TEXT AS type, kind::TEXT AS kind, status::TEXT AS status, amount_cents, account_id,
       date, is_recurring, recurring_origin_id, installment_group_id, card_id, is_invoice_payment
FROM transactions
WHERE id = @id AND user_id = @user_id AND is_active = TRUE AND deleted_at IS NULL
FOR UPDATE;

-- name: UpdateLedgerTransaction :one
UPDATE transactions
SET type         = @type,
    kind         = @kind,
    amount_cents = @amount_cents,
    description  = @description,
    date         = @date,
    category_id  = @category_id,
    account_id   = @account_id,
    card_id      = @card_id,
    updated_at   = NOW()
WHERE id = @id AND user_id = @user_id
RETURNING id, status::TEXT AS status, amount_cents, date, description, notes,
          type::TEXT AS type, kind::TEXT AS kind, category_id, card_id, account_id,
          transfer_id, is_transfer, installment_group_id, installment_number,
          total_installments, is_invoice_payment, is_recurring, recurring_origin_id;

-- name: SoftDeleteLedgerTransaction :exec
UPDATE transactions
SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW()
WHERE id = @id AND user_id = @user_id;

-- name: CreateLedgerTransaction :one
INSERT INTO transactions (
    user_id, type, kind, status, amount_cents, date, description, notes,
    category_id, account_id, card_id,
    installment_group_id, installment_number, total_installments,
    is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id,
    is_invoice_payment
)
VALUES (
    @user_id, @type, @kind, @status, @amount_cents, @date, @description, @notes,
    @category_id, @account_id, @card_id,
    @installment_group_id, @installment_number, @total_installments,
    @is_recurring, @recurrence_freq, @recurrence_end_date, @recurring_origin_id,
    @is_invoice_payment
)
RETURNING id, status::TEXT AS status, amount_cents, date, description, notes,
          type::TEXT AS type, kind::TEXT AS kind, category_id, card_id, account_id,
          transfer_id, is_transfer, installment_group_id, installment_number,
          total_installments, is_invoice_payment, is_recurring, recurring_origin_id;

-- name: SoftDeleteRecurringFrom :execrows
-- Exclui uma ocorrência recorrente e as seguintes da mesma série.
UPDATE transactions
SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW()
WHERE user_id = @user_id
  AND is_active = TRUE
  AND (id = @series_id OR recurring_origin_id = @series_id)
  AND date >= @from_date;

-- name: MarkRecurringOrigin :exec
-- Transforma um lançamento avulso na primeira ocorrência de uma série mensal.
UPDATE transactions
SET is_recurring = TRUE, recurrence_freq = 'MONTHLY', recurrence_end_date = @recurrence_end_date,
    updated_at = NOW()
WHERE id = @id AND user_id = @user_id;
