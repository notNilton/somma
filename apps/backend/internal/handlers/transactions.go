package handlers

import (
	"crypto/sha256"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/nilbyte/mirante/backend/internal/cache"
	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/models"
	"github.com/nilbyte/mirante/backend/internal/money"
)

type createTransactionDto struct {
	AccountID         string  `json:"accountId"`
	PlanningPlanID    *string `json:"planningPlanId"`
	CategoryID        *string `json:"categoryId"`
	Type              string  `json:"type"`
	Classification    *string `json:"classification"`
	PaymentMethod     *string `json:"paymentMethod"`
	Channel           *string `json:"channel"`
	CardID            *string `json:"cardId"`
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
	// Manutenção
	MaintenanceType *string `json:"maintenanceType"`
	Provider        *string `json:"provider"`
}

func (d *createTransactionDto) validate() error {
	if d.AccountID == "" {
		return errors.New("accountId is required")
	}
	if d.Amount <= 0 {
		return errors.New("amount must be > 0")
	}
	if d.Description == "" {
		return errors.New("description is required")
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

func (h *Handler) buildTransactionsFilter(q url.Values, userID string) (string, []any, int) {
	filters := []string{"t.user_id = $1", "t.is_active = true"}
	args := []any{userID}
	i := 2

	if v := q.Get("accountId"); v != "" {
		filters = append(filters, fmt.Sprintf("t.account_id = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("categoryId"); v != "" {
		filters = append(filters, fmt.Sprintf("t.category_id = $%d", i))
		args = append(args, v)
		i++
	}
	if v := q.Get("planningPlanId"); v != "" {
		filters = append(filters, fmt.Sprintf("t.planning_plan_id = $%d", i))
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

	return strings.Join(filters, " AND "), args, i
}

func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	where, args, i := h.buildTransactionsFilter(q, claims.UserID)
	query := fmt.Sprintf(`
		SELECT t.id, t.account_id, t.user_id, t.category_id, t.card_id,
		       t.planning_plan_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color,
		       p.name AS planning_plan_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		LEFT JOIN planning_plans p ON p.id = t.planning_plan_id
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
			&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID, &t.PlanningPlanID,
			&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
			&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
			&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
			&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor, &t.PlanningPlanName,
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
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var t models.TransactionWithCategory
	err := h.db.QueryRow(r.Context(), `
		SELECT t.id, t.account_id, t.user_id, t.category_id, t.card_id,
		       t.planning_plan_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color,
		       p.name AS planning_plan_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		LEFT JOIN planning_plans p ON p.id = t.planning_plan_id
		WHERE t.id = $1 AND t.user_id = $2 AND t.is_active = true
	`, id, claims.UserID).Scan(
		&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID, &t.PlanningPlanID,
		&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
		&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
		&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
		&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.CategoryName, &t.CategoryColor, &t.PlanningPlanName,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	writeJSON(w, http.StatusOK, transactionResponse(t))
}

func (h *Handler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

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

	var t models.Transaction
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO transactions (
			account_id, user_id, planning_plan_id, category_id, card_id, type, classification,
			payment_method, channel, status, is_recurring, amount_cents,
			total_installments, paid_installments, date, description, notes,
			currency_code, affects_account
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		RETURNING id, account_id, user_id, planning_plan_id, category_id, card_id, type, classification,
		          payment_method, channel, status, is_recurring, amount_cents,
		          total_installments, paid_installments, date, description, notes,
		          currency_code, affects_account, is_active, deleted_at, created_at, updated_at
	`,
		dto.AccountID, claims.UserID, dto.PlanningPlanID, dto.CategoryID, dto.CardID, dto.Type, classification,
		paymentMethod, channel, status, isRecurring, amountCents,
		dto.TotalInstallments, dto.PaidInstallments, txDate, dto.Description, dto.Notes,
		currency, affectsAccount,
	).Scan(
		&t.ID, &t.AccountID, &t.UserID, &t.PlanningPlanID, &t.CategoryID, &t.CardID, &t.Type, &t.Classification,
		&t.PaymentMethod, &t.Channel, &t.Status, &t.IsRecurring, &t.AmountCents,
		&t.TotalInstallments, &t.PaidInstallments, &t.Date, &t.Description, &t.Notes,
		&t.CurrencyCode, &t.AffectsAccount, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Criar RefuelingLog ou VehicleMaintenance se aplicável
	if classification == models.TransactionClassificationFUEL && dto.VehicleID != nil {
		h.db.Exec(r.Context(), `
			INSERT INTO refueling_logs (vehicle_id, transaction_id, station, fuel_type, current_km, liters, price_per_liter_cents)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, dto.VehicleID, t.ID, dto.Station, dto.FuelType, dto.CurrentKm,
			dto.Liters, money.ToCentsPtr(dto.PricePerLiter))
	}
	if classification == models.TransactionClassificationMAINTENANCE && dto.VehicleID != nil {
		h.db.Exec(r.Context(), `
			INSERT INTO vehicle_maintenances (vehicle_id, transaction_id, maintenance_type, provider)
			VALUES ($1, $2, $3, $4)
		`, dto.VehicleID, t.ID, dto.MaintenanceType, dto.Provider)
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusCreated, transactionResponse(models.TransactionWithCategory{Transaction: t}))
}

func (h *Handler) UpdateTransaction(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var dto createTransactionDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var amountCents *int64
	if dto.Amount > 0 {
		c := money.ToCents(dto.Amount)
		amountCents = &c
	}

	var t models.Transaction
	err := h.db.QueryRow(r.Context(), `
		UPDATE transactions SET
			planning_plan_id    = CASE WHEN $1 = '' THEN NULL ELSE COALESCE($1, planning_plan_id) END,
			category_id         = CASE WHEN $2 = '' THEN NULL ELSE COALESCE($2, category_id) END,
			status              = COALESCE(NULLIF($3,''), status),
			amount_cents        = COALESCE($4, amount_cents),
			description         = COALESCE(NULLIF($5,''), description),
			notes               = COALESCE($6, notes),
			updated_at         = NOW()
		WHERE id = $7 AND user_id = $8 AND is_active = true
		RETURNING id, account_id, user_id, planning_plan_id, category_id, card_id, type, classification,
		          payment_method, channel, status, is_recurring, amount_cents,
		          total_installments, paid_installments, date, description, notes,
		          currency_code, affects_account, is_active, deleted_at, created_at, updated_at
	`,
		dto.PlanningPlanID, dto.CategoryID, dto.Status, amountCents, dto.Description, dto.Notes, id, claims.UserID,
	).Scan(
		&t.ID, &t.AccountID, &t.UserID, &t.PlanningPlanID, &t.CategoryID, &t.CardID, &t.Type, &t.Classification,
		&t.PaymentMethod, &t.Channel, &t.Status, &t.IsRecurring, &t.AmountCents,
		&t.TotalInstallments, &t.PaidInstallments, &t.Date, &t.Description, &t.Notes,
		&t.CurrencyCode, &t.AffectsAccount, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusOK, transactionResponse(models.TransactionWithCategory{Transaction: t}))
}

func (h *Handler) DeleteTransaction(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
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

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ImportCSV(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file too large (max 10MB)")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file field required")
		return
	}
	defer file.Close()

	accountID := r.FormValue("accountId")
	if accountID == "" {
		writeError(w, http.StatusBadRequest, "accountId is required")
		return
	}

	records, err := csv.NewReader(file).ReadAll()
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid csv file")
		return
	}

	var created, skipped, skippedInvalid, skippedDuplicate int
	var errs []string

	for i, record := range records {
		if i == 0 {
			continue // pular header
		}
		if len(record) < 3 {
			skippedInvalid++
			continue
		}

		// Fingerprint para deduplicação
		raw := strings.Join(record, ",")
		hash := fmt.Sprintf("%x", sha256.Sum256([]byte(raw)))

		tag, err := h.db.Exec(r.Context(), `
			INSERT INTO import_fingerprints (hash, account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
		`, hash, accountID)
		if err != nil {
			skippedInvalid++
			continue
		}
		if tag.RowsAffected() == 0 {
			skippedDuplicate++
			continue
		}

		// Parsear campos: date, description, amount (mínimo)
		dateStr := strings.TrimSpace(record[0])
		description := strings.TrimSpace(record[1])
		amountStr := strings.TrimSpace(record[2])

		parsedDate, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			errs = append(errs, fmt.Sprintf("row %d: invalid date '%s'", i+1, dateStr))
			skippedInvalid++
			continue
		}

		amountFloat, err := strconv.ParseFloat(strings.ReplaceAll(amountStr, ",", "."), 64)
		if err != nil || amountFloat == 0 {
			errs = append(errs, fmt.Sprintf("row %d: invalid amount '%s'", i+1, amountStr))
			skippedInvalid++
			continue
		}

		txType := models.TransactionTypeEXPENSE
		if amountFloat > 0 {
			txType = models.TransactionTypeINCOME
		}
		if amountFloat < 0 {
			amountFloat = -amountFloat
		}

		txDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC)

		_, err = h.db.Exec(r.Context(), `
			INSERT INTO transactions (account_id, user_id, type, amount_cents, date, description, currency_code, affects_account)
			VALUES ($1, $2, $3, $4, $5, $6, 'BRL', true)
		`, accountID, claims.UserID, txType, money.ToCents(amountFloat), txDate, description)
		if err != nil {
			errs = append(errs, fmt.Sprintf("row %d: %s", i+1, err.Error()))
			skipped++
			continue
		}

		created++
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"created":          created,
		"skipped":          skipped,
		"skippedInvalid":   skippedInvalid,
		"skippedDuplicate": skippedDuplicate,
		"errors":           errs,
	})
}

func (h *Handler) ListFutureTransactions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT t.id, t.account_id, t.user_id, t.category_id, t.card_id,
		       t.planning_plan_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color,
		       p.name AS planning_plan_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		LEFT JOIN planning_plans p ON p.id = t.planning_plan_id
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
			&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID, &t.PlanningPlanID,
			&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
			&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
			&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
			&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor, &t.PlanningPlanName,
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

func (h *Handler) ExportTransactionsCSV(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	q := r.URL.Query()

	from := q.Get("from")
	to := q.Get("to")
	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "from and to are required (YYYY-MM-DD)")
		return
	}

	fromDate, err := time.Parse("2006-01-02", from)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid from date")
		return
	}
	toDate, err := time.Parse("2006-01-02", to)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid to date")
		return
	}
	if toDate.Sub(fromDate) > 366*24*time.Hour {
		writeError(w, http.StatusBadRequest, "date range cannot exceed 1 year")
		return
	}

	where, args, _ := h.buildTransactionsFilter(q, claims.UserID)

	query := fmt.Sprintf(`
		SELECT t.date, t.description, t.amount_cents, t.type, t.status,
		       t.classification, t.payment_method, t.channel,
		       COALESCE(c.name, '') AS category_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE %s
		ORDER BY t.date DESC
	`, where)

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	filename := fmt.Sprintf("transactions_%s_%s.csv", from, to)
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	writer := csv.NewWriter(w)
	writer.Write([]string{"Date", "Description", "Amount", "Type", "Status", "Classification", "PaymentMethod", "Channel", "Category"})

	for rows.Next() {
		var date any
		var description, txType, status, classification, paymentMethod, channel, categoryName string
		var amountCents int64
		if err := rows.Scan(&date, &description, &amountCents, &txType, &status, &classification, &paymentMethod, &channel, &categoryName); err != nil {
			continue
		}
		writer.Write([]string{
			fmt.Sprintf("%v", date),
			description,
			fmt.Sprintf("%.2f", money.ToReais(amountCents)),
			txType,
			status,
			classification,
			paymentMethod,
			channel,
			categoryName,
		})
	}
	writer.Flush()
}

func transactionResponse(t models.TransactionWithCategory) map[string]any {
	r := map[string]any{
		"id":                t.ID,
		"accountId":         t.AccountID,
		"userId":            t.UserID,
		"planningPlanId":    t.PlanningPlanID,
		"categoryId":        t.CategoryID,
		"cardId":            t.CardID,
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
	if t.PlanningPlanName != nil || t.PlanningPlanID != nil {
		r["planningPlan"] = map[string]any{
			"id":   t.PlanningPlanID,
			"name": t.PlanningPlanName,
		}
	}
	return r
}
