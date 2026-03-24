package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/nilbyte/mirante/backend-v2/internal/middleware"
	"github.com/nilbyte/mirante/backend-v2/internal/models"
	"github.com/nilbyte/mirante/backend-v2/internal/money"
)

type createAccountDto struct {
	Name           string   `json:"name"`
	Type           string   `json:"type"`
	Ownership      *string  `json:"ownership"`
	BankName       *string  `json:"bankName"`
	Cpf            *string  `json:"cpf"`
	Cnpj           *string  `json:"cnpj"`
	Color          *string  `json:"color"`
	Icon           *string  `json:"icon"`
	CurrencyCode   *string  `json:"currencyCode"`
	Balance        *float64 `json:"balance"`
	CreditLimit    *float64 `json:"creditLimit"`
	HasDebit       *bool    `json:"hasDebit"`
	HasPix         *bool    `json:"hasPix"`
	HasCredit      *bool    `json:"hasCredit"`
	IncludeInTotal *bool    `json:"includeInTotal"`
	ClosingDay     *int     `json:"closingDay"`
	DueDay         *int     `json:"dueDay"`
}

func (d *createAccountDto) validate() error {
	if d.Name == "" {
		return errors.New("name is required")
	}
	if len(d.Name) > 100 {
		return errors.New("name max 100 chars")
	}
	if !models.ValidAccountTypes[d.Type] {
		return errors.New("invalid account type")
	}
	if d.CreditLimit != nil && *d.CreditLimit < 0 {
		return errors.New("creditLimit must be >= 0")
	}
	if d.ClosingDay != nil && (*d.ClosingDay < 1 || *d.ClosingDay > 28) {
		return errors.New("closingDay must be 1-28")
	}
	if d.DueDay != nil && (*d.DueDay < 1 || *d.DueDay > 28) {
		return errors.New("dueDay must be 1-28")
	}
	return nil
}

func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT id, user_id, name, type, ownership, bank_name, cpf, cnpj, color, icon,
		       currency_code, balance_cents, credit_limit_cents, has_debit, has_pix, has_credit,
		       include_in_total, closing_day, due_day, is_active, deleted_at, created_at, updated_at
		FROM accounts
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var accounts []any
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.Type, &a.Ownership, &a.BankName, &a.Cpf, &a.Cnpj,
			&a.Color, &a.Icon, &a.CurrencyCode, &a.BalanceCents, &a.CreditLimitCents,
			&a.HasDebit, &a.HasPix, &a.HasCredit, &a.IncludeInTotal,
			&a.ClosingDay, &a.DueDay, &a.IsActive, &a.DeletedAt, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		accounts = append(accounts, accountResponse(a))
	}

	if accounts == nil {
		accounts = []any{}
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (h *Handler) GetAccount(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var a models.Account
	err := h.db.QueryRow(r.Context(), `
		SELECT id, user_id, name, type, ownership, bank_name, cpf, cnpj, color, icon,
		       currency_code, balance_cents, credit_limit_cents, has_debit, has_pix, has_credit,
		       include_in_total, closing_day, due_day, is_active, deleted_at, created_at, updated_at
		FROM accounts
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, id, claims.UserID).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Type, &a.Ownership, &a.BankName, &a.Cpf, &a.Cnpj,
		&a.Color, &a.Icon, &a.CurrencyCode, &a.BalanceCents, &a.CreditLimitCents,
		&a.HasDebit, &a.HasPix, &a.HasCredit, &a.IncludeInTotal,
		&a.ClosingDay, &a.DueDay, &a.IsActive, &a.DeletedAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	writeJSON(w, http.StatusOK, accountResponse(a))
}

func (h *Handler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto createAccountDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	ownership := models.AccountOwnershipPERSONAL
	if dto.Ownership != nil {
		ownership = *dto.Ownership
	}
	currency := "BRL"
	if dto.CurrencyCode != nil {
		currency = *dto.CurrencyCode
	}
	hasDebit, hasPix, hasCredit, includeInTotal := true, true, false, true
	if dto.HasDebit != nil {
		hasDebit = *dto.HasDebit
	}
	if dto.HasPix != nil {
		hasPix = *dto.HasPix
	}
	if dto.HasCredit != nil {
		hasCredit = *dto.HasCredit
	}
	if dto.IncludeInTotal != nil {
		includeInTotal = *dto.IncludeInTotal
	}

	balanceCents := int64(0)
	if dto.Balance != nil {
		balanceCents = money.ToCents(*dto.Balance)
	}

	var a models.Account
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO accounts (
			user_id, name, type, ownership, bank_name, cpf, cnpj, color, icon,
			currency_code, balance_cents, credit_limit_cents, has_debit, has_pix, has_credit,
			include_in_total, closing_day, due_day
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id, user_id, name, type, ownership, bank_name, cpf, cnpj, color, icon,
		          currency_code, balance_cents, credit_limit_cents, has_debit, has_pix, has_credit,
		          include_in_total, closing_day, due_day, is_active, deleted_at, created_at, updated_at
	`,
		claims.UserID, dto.Name, dto.Type, ownership, dto.BankName, dto.Cpf, dto.Cnpj,
		dto.Color, dto.Icon, currency, balanceCents, money.ToCentsPtr(dto.CreditLimit),
		hasDebit, hasPix, hasCredit, includeInTotal, dto.ClosingDay, dto.DueDay,
	).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Type, &a.Ownership, &a.BankName, &a.Cpf, &a.Cnpj,
		&a.Color, &a.Icon, &a.CurrencyCode, &a.BalanceCents, &a.CreditLimitCents,
		&a.HasDebit, &a.HasPix, &a.HasCredit, &a.IncludeInTotal,
		&a.ClosingDay, &a.DueDay, &a.IsActive, &a.DeletedAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, accountResponse(a))
}

func (h *Handler) UpdateAccount(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var dto createAccountDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var a models.Account
	err := h.db.QueryRow(r.Context(), `
		UPDATE accounts SET
			name              = COALESCE(NULLIF($1,''), name),
			type              = COALESCE(NULLIF($2,''), type),
			bank_name         = COALESCE($3, bank_name),
			color             = COALESCE($4, color),
			icon              = COALESCE($5, icon),
			credit_limit_cents = COALESCE($6, credit_limit_cents),
			has_debit         = COALESCE($7, has_debit),
			has_pix           = COALESCE($8, has_pix),
			has_credit        = COALESCE($9, has_credit),
			include_in_total  = COALESCE($10, include_in_total),
			closing_day       = COALESCE($11, closing_day),
			due_day           = COALESCE($12, due_day),
			updated_at        = NOW()
		WHERE id = $13 AND user_id = $14 AND is_active = true
		RETURNING id, user_id, name, type, ownership, bank_name, cpf, cnpj, color, icon,
		          currency_code, balance_cents, credit_limit_cents, has_debit, has_pix, has_credit,
		          include_in_total, closing_day, due_day, is_active, deleted_at, created_at, updated_at
	`,
		dto.Name, dto.Type, dto.BankName, dto.Color, dto.Icon,
		money.ToCentsPtr(dto.CreditLimit), dto.HasDebit, dto.HasPix, dto.HasCredit,
		dto.IncludeInTotal, dto.ClosingDay, dto.DueDay, id, claims.UserID,
	).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Type, &a.Ownership, &a.BankName, &a.Cpf, &a.Cnpj,
		&a.Color, &a.Icon, &a.CurrencyCode, &a.BalanceCents, &a.CreditLimitCents,
		&a.HasDebit, &a.HasPix, &a.HasCredit, &a.IncludeInTotal,
		&a.ClosingDay, &a.DueDay, &a.IsActive, &a.DeletedAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	writeJSON(w, http.StatusOK, accountResponse(a))
}

func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	now := time.Now()
	tag, err := h.db.Exec(r.Context(), `
		UPDATE accounts SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND is_active = true
	`, now, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetCreditSummary(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT a.id, a.name, a.credit_limit_cents,
		       COALESCE(SUM(t.amount_cents), 0) AS used_cents
		FROM accounts a
		LEFT JOIN transactions t ON
			t.account_id = a.id
			AND t.affects_account = false
			AND t.is_active = true
			AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', NOW())
		WHERE a.user_id = $1
		  AND a.credit_limit_cents IS NOT NULL
		  AND a.is_active = true
		GROUP BY a.id, a.name, a.credit_limit_cents
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var result []any
	for rows.Next() {
		var id, name string
		var limitCents, usedCents int64
		if err := rows.Scan(&id, &name, &limitCents, &usedCents); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result = append(result, map[string]any{
			"id":            id,
			"name":          name,
			"creditLimit":   money.ToReais(limitCents),
			"usedAmount":    money.ToReais(usedCents),
			"availableAmount": money.ToReais(limitCents - usedCents),
		})
	}

	if result == nil {
		result = []any{}
	}
	writeJSON(w, http.StatusOK, result)
}

func accountResponse(a models.Account) map[string]any {
	return map[string]any{
		"id":             a.ID,
		"userId":         a.UserID,
		"name":           a.Name,
		"type":           a.Type,
		"ownership":      a.Ownership,
		"bankName":       a.BankName,
		"cpf":            a.Cpf,
		"cnpj":           a.Cnpj,
		"color":          a.Color,
		"icon":           a.Icon,
		"currencyCode":   a.CurrencyCode,
		"balance":        money.ToReais(a.BalanceCents),
		"creditLimit":    money.ToReaisPtr(a.CreditLimitCents),
		"hasDebit":       a.HasDebit,
		"hasPix":         a.HasPix,
		"hasCredit":      a.HasCredit,
		"includeInTotal": a.IncludeInTotal,
		"closingDay":     a.ClosingDay,
		"dueDay":         a.DueDay,
		"isActive":       a.IsActive,
		"createdAt":      a.CreatedAt,
		"updatedAt":      a.UpdatedAt,
	}
}
