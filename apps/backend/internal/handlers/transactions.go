package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/models"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

type createTransactionDto struct {
	CategoryID   *string `json:"categoryId"`
	BudgetID     *string `json:"budgetId"`
	Type         string  `json:"type"`
	Kind         string  `json:"kind"`
	Status       *string `json:"status"`
	Amount       float64 `json:"amount"`
	Date         string  `json:"date"`
	Description  string  `json:"description"`
	Notes        *string `json:"notes"`
	CurrencyCode *string `json:"currencyCode"`
}

func (d *createTransactionDto) validate() error {
	if d.Amount <= 0 {
		return errors.New("amount must be > 0")
	}
	if len(d.Description) > 255 {
		return errors.New("description max 255 chars")
	}
	if d.Date == "" {
		return errors.New("date is required")
	}
	if !models.ValidTransactionTypes[d.Type] {
		return errors.New("invalid transaction type")
	}
	if d.Kind == "" {
		d.Kind = defaultKindForType(d.Type)
	}
	if !models.ValidTransactionKinds[d.Kind] {
		return errors.New("invalid transaction kind")
	}
	if d.Type == models.TransactionTypeINCOME && d.Kind != models.TransactionKindINCOME {
		return errors.New("income transactions only support kind INCOME")
	}
	if d.Type == models.TransactionTypeEXPENSE && d.Kind == models.TransactionKindINCOME {
		return errors.New("expense transactions cannot use kind INCOME")
	}
	if d.Status != nil && !models.ValidTransactionStatuses[*d.Status] {
		return errors.New("invalid transaction status")
	}
	return nil
}

func defaultKindForType(txType string) string {
	if txType == models.TransactionTypeINCOME {
		return models.TransactionKindINCOME
	}
	return models.TransactionKindEXPENSE
}

func fallbackTransactionDescription(dto createTransactionDto) string {
	desc := strings.TrimSpace(dto.Description)
	if desc != "" {
		return desc
	}
	if dto.Type == models.TransactionTypeINCOME {
		return "Receita"
	}
	switch dto.Kind {
	case models.TransactionKindSAVING:
		return "Economia"
	case models.TransactionKindBUDGET:
		return "Orcamento"
	case models.TransactionKindCREDIT:
		return "Credito"
	default:
		return "Lancamento"
	}
}

func (h *Handler) resolveBudgetLink(r *http.Request, userID string, budgetID *string) (*string, error) {
	if budgetID == nil || strings.TrimSpace(*budgetID) == "" {
		return nil, nil
	}

	var exists string
	if err := h.db.QueryRow(r.Context(), `
		SELECT id
		FROM budgets
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, strings.TrimSpace(*budgetID), userID).Scan(&exists); err != nil {
		return nil, errors.New("budget not found")
	}

	clean := strings.TrimSpace(*budgetID)
	return &clean, nil
}

func (h *Handler) buildTransactionsFilter(q url.Values, userID string) (string, []any, int) {
	filters := []string{"t.user_id = $1", "t.is_active = true"}
	args := []any{userID}
	i := 2

	if v := q.Get("categoryId"); v != "" {
		filters = append(filters, fmt.Sprintf("t.category_id = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("type"); v != "" {
		filters = append(filters, fmt.Sprintf("t.type = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("kind"); v != "" {
		filters = append(filters, fmt.Sprintf("t.kind = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("status"); v != "" {
		filters = append(filters, fmt.Sprintf("t.status = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("search"); v != "" {
		filters = append(filters, fmt.Sprintf("t.description ILIKE $%d", i))
		args = append(args, "%"+v+"%")
		i++
	}
	if v := q.Get("from"); v != "" {
		filters = append(filters, fmt.Sprintf("t.date >= $%d::date", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("to"); v != "" {
		filters = append(filters, fmt.Sprintf("t.date < ($%d::date + INTERVAL '1 day')", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("budgetId"); v != "" {
		filters = append(filters, fmt.Sprintf("t.budget_id = $%d", i))
		args = append(args, v)
		i++
	}

	return strings.Join(filters, " AND "), args, i
}

func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 {
		limit = 20
	} else if limit > 5000 {
		limit = 5000
	}
	offset := (page - 1) * limit

	where, args, i := h.buildTransactionsFilter(q, claims.UserID)
	query := fmt.Sprintf(`
		SELECT t.id, t.user_id, t.category_id, t.budget_id,
		       t.type, t.kind, t.status, t.amount_cents, t.date,
		       t.description, t.notes, t.currency_code, t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE %s
		ORDER BY t.date DESC, t.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, i, i+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	result := make([]any, 0)
	for rows.Next() {
		var t models.TransactionWithCategory
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID,
			&t.Type, &t.Kind, &t.Status, &t.AmountCents, &t.Date,
			&t.Description, &t.Notes, &t.CurrencyCode, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result = append(result, transactionResponse(t))
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) GetTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var t models.TransactionWithCategory
	err := h.db.QueryRow(r.Context(), `
		SELECT t.id, t.user_id, t.category_id, t.budget_id,
		       t.type, t.kind, t.status, t.amount_cents, t.date,
		       t.description, t.notes, t.currency_code, t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.id = $1 AND t.user_id = $2 AND t.is_active = true
	`, r.PathValue("id"), claims.UserID).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID,
		&t.Type, &t.Kind, &t.Status, &t.AmountCents, &t.Date,
		&t.Description, &t.Notes, &t.CurrencyCode, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.CategoryName, &t.CategoryColor,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	writeJSON(w, http.StatusOK, transactionResponse(t))
}

func parseTransactionDate(raw string) (time.Time, error) {
	if len(raw) < 10 {
		return time.Time{}, errors.New("invalid date format, use YYYY-MM-DD")
	}
	parsedDate, err := time.Parse("2006-01-02", raw[:10])
	if err != nil {
		return time.Time{}, errors.New("invalid date format, use YYYY-MM-DD")
	}
	return time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC), nil
}

func (h *Handler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto createTransactionDto
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

	budgetID, err := h.resolveBudgetLink(r, claims.UserID, dto.BudgetID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	status := models.TransactionStatusCOMPLETED
	if dto.Status != nil {
		status = *dto.Status
	}
	currency := "BRL"
	if dto.CurrencyCode != nil && strings.TrimSpace(*dto.CurrencyCode) != "" {
		currency = strings.TrimSpace(*dto.CurrencyCode)
	}

	var t models.Transaction
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO transactions (
			user_id, category_id, budget_id, type, kind, status, amount_cents,
			date, description, notes, currency_code
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, user_id, category_id, budget_id, type, kind, status, amount_cents,
		          date, description, notes, currency_code, is_active, deleted_at, created_at, updated_at
	`, claims.UserID, dto.CategoryID, budgetID, dto.Type, dto.Kind, status, money.ToCents(dto.Amount),
		txDate, fallbackTransactionDescription(dto), dto.Notes, currency,
	).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.Type, &t.Kind, &t.Status, &t.AmountCents,
		&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusCreated, transactionResponse(models.TransactionWithCategory{Transaction: t}))
}

func (h *Handler) UpdateTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto createTransactionDto
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
	budgetID, err := h.resolveBudgetLink(r, claims.UserID, dto.BudgetID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	status := models.TransactionStatusCOMPLETED
	if dto.Status != nil {
		status = *dto.Status
	}
	currency := "BRL"
	if dto.CurrencyCode != nil && strings.TrimSpace(*dto.CurrencyCode) != "" {
		currency = strings.TrimSpace(*dto.CurrencyCode)
	}

	var t models.Transaction
	err = h.db.QueryRow(r.Context(), `
		UPDATE transactions
		SET category_id = $1,
		    budget_id = $2,
		    type = $3,
		    kind = $4,
		    status = $5,
		    amount_cents = $6,
		    date = $7,
		    description = $8,
		    notes = $9,
		    currency_code = $10,
		    updated_at = NOW()
		WHERE id = $11 AND user_id = $12 AND is_active = true
		RETURNING id, user_id, category_id, budget_id, type, kind, status, amount_cents,
		          date, description, notes, currency_code, is_active, deleted_at, created_at, updated_at
	`, dto.CategoryID, budgetID, dto.Type, dto.Kind, status, money.ToCents(dto.Amount),
		txDate, fallbackTransactionDescription(dto), dto.Notes, currency, r.PathValue("id"), claims.UserID,
	).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.Type, &t.Kind, &t.Status, &t.AmountCents,
		&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusOK, transactionResponse(models.TransactionWithCategory{Transaction: t}))
}

func (h *Handler) DeleteTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	tag, err := h.db.Exec(r.Context(), `
		UPDATE transactions
		SET is_active = false, deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, r.PathValue("id"), claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ListFutureTransactions(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT t.id, t.user_id, t.category_id, t.budget_id,
		       t.type, t.kind, t.status, t.amount_cents, t.date,
		       t.description, t.notes, t.currency_code, t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		  AND t.is_active = true
		  AND (t.date > NOW() OR t.status = 'PENDING')
		ORDER BY t.date ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	result := make([]any, 0)
	for rows.Next() {
		var t models.TransactionWithCategory
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID,
			&t.Type, &t.Kind, &t.Status, &t.AmountCents, &t.Date,
			&t.Description, &t.Notes, &t.CurrencyCode, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result = append(result, transactionResponse(t))
	}

	writeJSON(w, http.StatusOK, result)
}

func transactionResponse(t models.TransactionWithCategory) map[string]any {
	r := map[string]any{
		"id":           t.ID,
		"userId":       t.UserID,
		"categoryId":   t.CategoryID,
		"budgetId":     t.BudgetID,
		"type":         t.Type,
		"kind":         t.Kind,
		"status":       t.Status,
		"amount":       money.ToReais(t.AmountCents),
		"date":         t.Date,
		"description":  t.Description,
		"notes":        t.Notes,
		"currencyCode": t.CurrencyCode,
		"isActive":     t.IsActive,
		"createdAt":    t.CreatedAt,
		"updatedAt":    t.UpdatedAt,
	}
	if t.CategoryName != nil {
		r["category"] = map[string]any{
			"name":  t.CategoryName,
			"color": t.CategoryColor,
		}
	}
	return r
}
