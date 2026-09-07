package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/nilbyte/somma/backend/internal/cache"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
	"github.com/nilbyte/somma/backend/internal/money"
)

type createAccountDto struct {
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	CurrencyCode   string  `json:"currencyCode"`
	InitialBalance float64 `json:"initialBalance"`
}

func (d *createAccountDto) validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return errors.New("name is required")
	}
	if len(strings.TrimSpace(d.Name)) > 80 {
		return errors.New("name max 80 chars")
	}
	if d.Type == "" {
		d.Type = models.AccountTypeChecking
	}
	if !models.ValidAccountTypes[d.Type] {
		return errors.New("invalid account type")
	}
	if d.CurrencyCode == "" {
		d.CurrencyCode = "BRL"
	}
	if len(d.CurrencyCode) != 3 {
		return errors.New("currencyCode must be 3 chars")
	}
	return nil
}

type updateAccountDto struct {
	Name           *string  `json:"name"`
	Type           *string  `json:"type"`
	CurrencyCode   *string  `json:"currencyCode"`
	InitialBalance *float64 `json:"initialBalance"`
}

func (d *updateAccountDto) validate() error {
	if d.Name != nil && strings.TrimSpace(*d.Name) == "" {
		return errors.New("name cannot be empty")
	}
	if d.Type != nil && !models.ValidAccountTypes[*d.Type] {
		return errors.New("invalid account type")
	}
	if d.CurrencyCode != nil && len(*d.CurrencyCode) != 3 {
		return errors.New("currencyCode must be 3 chars")
	}
	return nil
}

func accountResponse(a models.Account, balanceCents int64) map[string]any {
	return map[string]any{
		"id":                  a.ID,
		"userId":              a.UserID,
		"name":                a.Name,
		"type":                a.Type,
		"currencyCode":        a.CurrencyCode,
		"initialBalance":      money.ToReais(a.InitialBalanceCents),
		"initialBalanceCents": a.InitialBalanceCents,
		"balance":             money.ToReais(balanceCents),
		"balanceCents":        balanceCents,
		"isActive":            a.IsActive,
		"createdAt":           a.CreatedAt,
		"updatedAt":           a.UpdatedAt,
	}
}

func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT a.id, a.user_id, a.name, a.type, a.currency_code, a.initial_balance_cents,
		       a.is_active, a.created_at, a.updated_at,
		       a.initial_balance_cents + COALESCE(SUM(
		           CASE
		               WHEN t.type = 'INCOME' THEN t.amount_cents
		               WHEN t.type = 'EXPENSE' THEN -t.amount_cents
		               ELSE 0
		           END
		       ), 0) AS balance_cents
		FROM accounts a
		LEFT JOIN transactions t
		  ON t.account_id = a.id
		 AND t.user_id = a.user_id
		 AND t.is_active = true
		 AND t.status <> 'CANCELED'
		WHERE a.user_id = $1
		  AND a.is_active = true
		GROUP BY a.id, a.user_id, a.name, a.type, a.currency_code, a.initial_balance_cents,
		         a.is_active, a.created_at, a.updated_at
		ORDER BY a.name ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	result := make([]any, 0)
	for rows.Next() {
		var a models.Account
		var balanceCents int64
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.Type, &a.CurrencyCode, &a.InitialBalanceCents,
			&a.IsActive, &a.CreatedAt, &a.UpdatedAt, &balanceCents,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result = append(result, accountResponse(a, balanceCents))
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto createAccountDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var a models.Account
	if err := h.db.QueryRow(r.Context(), `
		INSERT INTO accounts (user_id, name, type, currency_code, initial_balance_cents, is_active)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id, user_id, name, type, currency_code, initial_balance_cents, is_active, created_at, updated_at
	`, claims.UserID, strings.TrimSpace(dto.Name), dto.Type, dto.CurrencyCode, money.ToCents(dto.InitialBalance)).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Type, &a.CurrencyCode, &a.InitialBalanceCents,
		&a.IsActive, &a.CreatedAt, &a.UpdatedAt,
	); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, accountResponse(a, a.InitialBalanceCents))
}

func (h *Handler) UpdateAccount(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto updateAccountDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var a models.Account
	err := h.db.QueryRow(r.Context(), `
		UPDATE accounts
		SET name = COALESCE($1, name),
		    type = COALESCE($2, type),
		    currency_code = COALESCE($3, currency_code),
		    initial_balance_cents = COALESCE($4, initial_balance_cents),
		    updated_at = NOW()
		WHERE id = $5 AND user_id = $6 AND is_active = true
		RETURNING id, user_id, name, type, currency_code, initial_balance_cents, is_active, created_at, updated_at
	`, dto.Name, dto.Type, dto.CurrencyCode, money.ToCentsPtr(dto.InitialBalance),
		r.PathValue("id"), claims.UserID).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Type, &a.CurrencyCode, &a.InitialBalanceCents,
		&a.IsActive, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusOK, accountResponse(a, a.InitialBalanceCents))
}

func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	tag, err := h.db.Exec(r.Context(), `
		UPDATE accounts
		SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, r.PathValue("id"), claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	w.WriteHeader(http.StatusNoContent)
}

type createTransferDto struct {
	FromAccountID string  `json:"fromAccountId"`
	ToAccountID   string  `json:"toAccountId"`
	Amount        float64 `json:"amount"`
	Date          string  `json:"date"`
	Description   *string `json:"description"`
}

func (d *createTransferDto) validate() error {
	if strings.TrimSpace(d.FromAccountID) == "" {
		return errors.New("fromAccountId is required")
	}
	if strings.TrimSpace(d.ToAccountID) == "" {
		return errors.New("toAccountId is required")
	}
	if strings.TrimSpace(d.FromAccountID) == strings.TrimSpace(d.ToAccountID) {
		return errors.New("fromAccountId and toAccountId must be different")
	}
	if d.Amount <= 0 {
		return errors.New("amount must be > 0")
	}
	if d.Date == "" {
		return errors.New("date is required")
	}
	return nil
}

func (h *Handler) CreateTransfer(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto createTransferDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	txDate, err := parseTransactionDate(dto.Date)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var fromAcc models.Account
	err = h.db.QueryRow(r.Context(), `
		SELECT id, user_id, name, type, currency_code, initial_balance_cents, is_active, created_at, updated_at
		FROM accounts
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, dto.FromAccountID, claims.UserID).Scan(
		&fromAcc.ID, &fromAcc.UserID, &fromAcc.Name, &fromAcc.Type, &fromAcc.CurrencyCode,
		&fromAcc.InitialBalanceCents, &fromAcc.IsActive, &fromAcc.CreatedAt, &fromAcc.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusBadRequest, "from account not found")
		return
	}

	var toAcc models.Account
	err = h.db.QueryRow(r.Context(), `
		SELECT id, user_id, name, type, currency_code, initial_balance_cents, is_active, created_at, updated_at
		FROM accounts
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, dto.ToAccountID, claims.UserID).Scan(
		&toAcc.ID, &toAcc.UserID, &toAcc.Name, &toAcc.Type, &toAcc.CurrencyCode,
		&toAcc.InitialBalanceCents, &toAcc.IsActive, &toAcc.CreatedAt, &toAcc.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusBadRequest, "to account not found")
		return
	}

	transferID := uuid.New().String()
	descFrom := fmt.Sprintf("Transferência para %s", toAcc.Name)
	descTo := fmt.Sprintf("Transferência de %s", fromAcc.Name)
	if dto.Description != nil && strings.TrimSpace(*dto.Description) != "" {
		custom := strings.TrimSpace(*dto.Description)
		descFrom = fmt.Sprintf("%s (%s)", custom, descFrom)
		descTo = fmt.Sprintf("%s (%s)", custom, descTo)
	}

	amountCents := money.ToCents(dto.Amount)

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	var outTx models.Transaction
	err = tx.QueryRow(r.Context(), fmt.Sprintf(`
		INSERT INTO transactions (
			user_id, account_id, type, kind, status, amount_cents, date, description,
			transfer_id, is_transfer
		) VALUES ($1, $2, 'EXPENSE', 'EXPENSE', 'COMPLETED', $3, $4, $5, $6, true)
		RETURNING %s
	`, transactionColumnsPlain),
		claims.UserID, fromAcc.ID, amountCents, txDate, descFrom, transferID,
	).Scan(transactionScanDests(&outTx)...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	var inTx models.Transaction
	err = tx.QueryRow(r.Context(), fmt.Sprintf(`
		INSERT INTO transactions (
			user_id, account_id, type, kind, status, amount_cents, date, description,
			transfer_id, is_transfer
		) VALUES ($1, $2, 'INCOME', 'INCOME', 'COMPLETED', $3, $4, $5, $6, true)
		RETURNING %s
	`, transactionColumnsPlain),
		claims.UserID, toAcc.ID, amountCents, txDate, descTo, transferID,
	).Scan(transactionScanDests(&inTx)...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusCreated, map[string]any{
		"transferId":        transferID,
		"amount":            money.ToReais(amountCents),
		"amountCents":       amountCents,
		"date":              txDate,
		"fromAccountId":     fromAcc.ID,
		"toAccountId":       toAcc.ID,
		"outTransaction":    transactionResponse(models.TransactionWithCategory{Transaction: outTx}),
		"inTransaction":     transactionResponse(models.TransactionWithCategory{Transaction: inTx}),
	})
}
