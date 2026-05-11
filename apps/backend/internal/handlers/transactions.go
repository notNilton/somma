package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/nilbyte/personalledger/backend/internal/cache"
	"github.com/nilbyte/personalledger/backend/internal/middleware"
	"github.com/nilbyte/personalledger/backend/internal/models"
	"github.com/nilbyte/personalledger/backend/internal/money"
)

type createTransactionDto struct {
	CategoryID        *string `json:"categoryId"`
	BudgetID          *string `json:"budgetId"`
	BudgetItemID      *string `json:"budgetItemId"`
	Type              string  `json:"type"`
	Classification    *string `json:"classification"`
	PaymentMethod     *string `json:"paymentMethod"`
	Channel           *string `json:"channel"`
	Status            *string `json:"status"`
	IsRecurring       *bool   `json:"isRecurring"`
	Amount            float64 `json:"amount"`
	TotalInstallments *int    `json:"totalInstallments"`
	PaidInstallments  *int    `json:"paidInstallments"`
	Date              string  `json:"date"`
	Description       string  `json:"description"`
	Notes             *string `json:"notes"`
	CurrencyCode      *string `json:"currencyCode"`
	// Combustível
	VehicleID     *string  `json:"vehicleId"`
	Station       *string  `json:"station"`
	FuelType      *string  `json:"fuelType"`
	CurrentKm     *float64 `json:"currentKm"`
	Liters        *float64 `json:"liters"`
	PricePerLiter *float64 `json:"pricePerLiter"`
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
	if d.TotalInstallments != nil && (*d.TotalInstallments < 1 || *d.TotalInstallments > 21) {
		return errors.New("totalInstallments must be 1-21")
	}
	return nil
}

func (h *Handler) resolveBudgetLink(ctx context.Context, userID string, dto createTransactionDto) (*string, *string, error) {
	if dto.BudgetItemID == nil {
		if dto.BudgetID == nil {
			return nil, nil, nil
		}
		var exists string
		if err := h.db.QueryRow(ctx, `
			SELECT id
			FROM budgets
			WHERE id = $1 AND user_id = $2 AND is_active = true
		`, *dto.BudgetID, userID).Scan(&exists); err != nil {
			return nil, nil, errors.New("budget not found")
		}
		return dto.BudgetID, nil, nil
	}

	var resolvedBudgetID string
	if dto.BudgetID != nil {
		if err := h.db.QueryRow(ctx, `
			SELECT budget_id
			FROM budget_items i
			JOIN budgets b ON b.id = i.budget_id
			WHERE i.id = $1 AND i.is_active = true AND b.user_id = $2 AND b.is_active = true
		`, *dto.BudgetItemID, userID).Scan(&resolvedBudgetID); err != nil {
			return nil, nil, errors.New("budget item not found")
		}
		if resolvedBudgetID != *dto.BudgetID {
			return nil, nil, errors.New("budget item does not belong to selected budget")
		}
		return dto.BudgetID, dto.BudgetItemID, nil
	}

	if err := h.db.QueryRow(ctx, `
		SELECT budget_id
		FROM budget_items i
		JOIN budgets b ON b.id = i.budget_id
		WHERE i.id = $1 AND i.is_active = true AND b.user_id = $2 AND b.is_active = true
	`, *dto.BudgetItemID, userID).Scan(&resolvedBudgetID); err != nil {
		return nil, nil, errors.New("budget item not found")
	}
	return &resolvedBudgetID, dto.BudgetItemID, nil
}

func fallbackTransactionDescription(dto createTransactionDto) string {
	desc := strings.TrimSpace(dto.Description)
	if desc != "" {
		return desc
	}
	if dto.Type == models.TransactionTypeINCOME {
		return "Receita"
	}
	if dto.Classification != nil && *dto.Classification == models.TransactionClassificationFUEL {
		return "Abastecimento"
	}
	return "Lançamento"
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
	if v := q.Get("status"); v != "" {
		filters = append(filters, fmt.Sprintf("t.status = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("classification"); v != "" {
		filters = append(filters, fmt.Sprintf("t.classification = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("search"); v != "" {
		filters = append(filters, fmt.Sprintf("t.description ILIKE $%d", i))
		args = append(args, "%"+v+"%")
		i++
	}
	if v := q.Get("from"); v != "" {
		filters = append(filters, fmt.Sprintf("t.date >= $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("to"); v != "" {
		filters = append(filters, fmt.Sprintf("t.date <= $%d", i))
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
		SELECT t.id, t.user_id, t.category_id,
		       t.budget_id, t.budget_item_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE %s
		ORDER BY t.date DESC
		LIMIT $%d OFFSET $%d
	`, where, i, i+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var txs []any
	for rows.Next() {
		var t models.TransactionWithCategory
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.BudgetItemID,
			&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
			&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
			&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
			&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		txs = append(txs, transactionResponse(t))
	}

	if txs == nil {
		txs = []any{}
	}
	writeJSON(w, http.StatusOK, txs)
}

func (h *Handler) GetTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	var t models.TransactionWithCategory
	var err error
	err = h.db.QueryRow(r.Context(), `
		SELECT t.id, t.user_id, t.category_id,
		       t.budget_id, t.budget_item_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.id = $1 AND t.user_id = $2 AND t.is_active = true
	`, id, claims.UserID).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.BudgetItemID,
		&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
		&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
		&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
		&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.CategoryName, &t.CategoryColor,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	writeJSON(w, http.StatusOK, transactionResponse(t))
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

	classification := models.TransactionClassificationCOMMON
	if dto.Classification != nil {
		classification = *dto.Classification
	}
	paymentMethod := models.PaymentMethodDEBIT
	if dto.PaymentMethod != nil {
		paymentMethod = *dto.PaymentMethod
	}
	channel := models.ChannelBANK
	if dto.Channel != nil {
		channel = *dto.Channel
	}
	status := models.TransactionStatusCOMPLETED
	if dto.Status != nil {
		status = *dto.Status
	}
	isRecurring := false
	if dto.IsRecurring != nil {
		isRecurring = *dto.IsRecurring
	}
	currency := "BRL"
	if dto.CurrencyCode != nil {
		currency = *dto.CurrencyCode
	}
	budgetID, budgetItemID, err := h.resolveBudgetLink(r.Context(), claims.UserID, dto)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// UTC 12:00 para evitar problemas de fuso
	if len(dto.Date) < 10 {
		writeError(w, http.StatusBadRequest, "invalid date format, use YYYY-MM-DD")
		return
	}
	parsedDate, err := time.Parse("2006-01-02", dto.Date[:10])
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date format, use YYYY-MM-DD")
		return
	}
	txDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC)

	// affectsAccount = false se for crédito
	affectsAccount := paymentMethod != models.PaymentMethodCREDIT

	amountCents := money.ToCents(dto.Amount)
	description := fallbackTransactionDescription(dto)

	var t models.Transaction
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO transactions (
			user_id, category_id, budget_id, budget_item_id, type, classification,
			payment_method, channel, status, is_recurring, amount_cents,
			total_installments, paid_installments, date, description, notes,
			currency_code, affects_account
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id, user_id, category_id, budget_id, budget_item_id, type, classification,
		          payment_method, channel, status, is_recurring, amount_cents,
		          total_installments, paid_installments, date, description, notes,
		          currency_code, affects_account, is_active, deleted_at, created_at, updated_at
	`,
		claims.UserID, dto.CategoryID, budgetID, budgetItemID, dto.Type, classification,
		paymentMethod, channel, status, isRecurring, amountCents,
		dto.TotalInstallments, dto.PaidInstallments, txDate, description, dto.Notes,
		currency, affectsAccount,
	).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.BudgetItemID, &t.Type, &t.Classification,
		&t.PaymentMethod, &t.Channel, &t.Status, &t.IsRecurring, &t.AmountCents,
		&t.TotalInstallments, &t.PaidInstallments, &t.Date, &t.Description, &t.Notes,
		&t.CurrencyCode, &t.AffectsAccount, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Criar RefuelingLog se aplicável
	if classification == models.TransactionClassificationFUEL && dto.VehicleID != nil {
		h.db.Exec(r.Context(), `
			INSERT INTO refueling_logs (vehicle_id, transaction_id, station, fuel_type, current_km, liters, price_per_liter_cents)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, dto.VehicleID, t.ID, dto.Station, dto.FuelType, dto.CurrentKm,
			dto.Liters, money.ToCentsPtr(dto.PricePerLiter))
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
	id := r.PathValue("id")

	var dto createTransactionDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var amountCents *int64
	if dto.Amount > 0 {
		c := money.ToCents(dto.Amount)
		amountCents = &c
	}

	if len(dto.Date) < 10 {
		writeError(w, http.StatusBadRequest, "invalid date format, use YYYY-MM-DD")
		return
	}
	parsedDate, err := time.Parse("2006-01-02", dto.Date[:10])
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date format, use YYYY-MM-DD")
		return
	}
	txDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC)

	classification := models.TransactionClassificationCOMMON
	if dto.Classification != nil {
		classification = *dto.Classification
	}
	paymentMethod := models.PaymentMethodDEBIT
	if dto.PaymentMethod != nil {
		paymentMethod = *dto.PaymentMethod
	}
	channel := models.ChannelBANK
	if dto.Channel != nil {
		channel = *dto.Channel
	}
	status := models.TransactionStatusCOMPLETED
	if dto.Status != nil {
		status = *dto.Status
	}
	isRecurring := false
	if dto.IsRecurring != nil {
		isRecurring = *dto.IsRecurring
	}
	currency := "BRL"
	if dto.CurrencyCode != nil {
		currency = *dto.CurrencyCode
	}
	budgetID, budgetItemID, err := h.resolveBudgetLink(r.Context(), claims.UserID, dto)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	affectsAccount := paymentMethod != models.PaymentMethodCREDIT

	var t models.Transaction
	err = h.db.QueryRow(r.Context(), `
		UPDATE transactions SET
			category_id         = COALESCE($1, category_id),
			budget_id           = COALESCE($2, budget_id),
			budget_item_id      = CASE
				WHEN $2 IS NOT NULL AND $3 IS NULL THEN NULL
				ELSE COALESCE($3, budget_item_id)
			END,
			type                = COALESCE(NULLIF($4,''), type),
			classification      = COALESCE(NULLIF($5,''), classification),
			payment_method      = COALESCE(NULLIF($6,''), payment_method),
			channel             = COALESCE(NULLIF($7,''), channel),
			status              = COALESCE(NULLIF($8,''), status),
			is_recurring        = COALESCE($9, is_recurring),
			amount_cents        = COALESCE($10, amount_cents),
			total_installments   = COALESCE($11, total_installments),
			paid_installments    = COALESCE($12, paid_installments),
			date                = COALESCE($13, date),
			description         = COALESCE(NULLIF($14,''), description),
			notes               = COALESCE($15, notes),
			currency_code       = COALESCE(NULLIF($16,''), currency_code),
			affects_account     = $17,
			updated_at          = NOW()
		WHERE id = $18 AND user_id = $19 AND is_active = true
		RETURNING id, user_id, category_id, budget_id, budget_item_id, type, classification,
		          payment_method, channel, status, is_recurring, amount_cents,
		          total_installments, paid_installments, date, description, notes,
		          currency_code, affects_account, is_active, deleted_at, created_at, updated_at
	`,
		dto.CategoryID, budgetID, budgetItemID, dto.Type, classification,
		paymentMethod, channel, status, isRecurring, amountCents,
		dto.TotalInstallments, dto.PaidInstallments, txDate, dto.Description, dto.Notes,
		currency, affectsAccount, id, claims.UserID,
	).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.BudgetItemID, &t.Type, &t.Classification,
		&t.PaymentMethod, &t.Channel, &t.Status, &t.IsRecurring, &t.AmountCents,
		&t.TotalInstallments, &t.PaidInstallments, &t.Date, &t.Description, &t.Notes,
		&t.CurrencyCode, &t.AffectsAccount, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	if classification == models.TransactionClassificationFUEL && dto.VehicleID != nil {
		_, _ = h.db.Exec(r.Context(), `
			INSERT INTO refueling_logs (
				vehicle_id, transaction_id, station, fuel_type, current_km, liters, price_per_liter_cents, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
			ON CONFLICT (transaction_id) DO UPDATE SET
				vehicle_id = EXCLUDED.vehicle_id,
				station = EXCLUDED.station,
				fuel_type = EXCLUDED.fuel_type,
				current_km = EXCLUDED.current_km,
				liters = EXCLUDED.liters,
				price_per_liter_cents = EXCLUDED.price_per_liter_cents,
				updated_at = NOW()
		`, dto.VehicleID, t.ID, dto.Station, dto.FuelType, dto.CurrentKm,
			dto.Liters, money.ToCentsPtr(dto.PricePerLiter))
	} else {
		_, _ = h.db.Exec(r.Context(), `DELETE FROM refueling_logs WHERE transaction_id = $1`, t.ID)
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
	id := r.PathValue("id")

	now := time.Now()
	tag, err := h.db.Exec(r.Context(), `
		UPDATE transactions SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND is_active = true
	`, now, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	_, _ = h.db.Exec(r.Context(), `DELETE FROM refueling_logs WHERE transaction_id = $1`, id)

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
		SELECT t.id, t.user_id, t.category_id,
		       t.budget_id, t.budget_item_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		  AND t.is_active = true
		  AND (t.date > NOW() OR t.is_recurring = true)
		ORDER BY t.date ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var txs []any
	for rows.Next() {
		var t models.TransactionWithCategory
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.BudgetItemID,
			&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
			&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
			&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
			&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		txs = append(txs, transactionResponse(t))
	}

	if txs == nil {
		txs = []any{}
	}
	writeJSON(w, http.StatusOK, txs)
}

func transactionResponse(t models.TransactionWithCategory) map[string]any {
	r := map[string]any{
		"id":                t.ID,
		"userId":            t.UserID,
		"categoryId":        t.CategoryID,
		"budgetId":          t.BudgetID,
		"budgetItemId":      t.BudgetItemID,
		"type":              t.Type,
		"classification":    t.Classification,
		"paymentMethod":     t.PaymentMethod,
		"channel":           t.Channel,
		"status":            t.Status,
		"isRecurring":       t.IsRecurring,
		"amount":            money.ToReais(t.AmountCents),
		"totalInstallments": t.TotalInstallments,
		"paidInstallments":  t.PaidInstallments,
		"date":              t.Date,
		"description":       t.Description,
		"notes":             t.Notes,
		"currencyCode":      t.CurrencyCode,
		"affectsAccount":    t.AffectsAccount,
		"isActive":          t.IsActive,
		"createdAt":         t.CreatedAt,
		"updatedAt":         t.UpdatedAt,
	}
	if t.CategoryName != nil {
		r["category"] = map[string]any{
			"name":  t.CategoryName,
			"color": t.CategoryColor,
		}
	}
	return r
}
