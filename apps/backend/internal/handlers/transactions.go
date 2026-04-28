package handlers

import (
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
	"github.com/nilbyte/mirante/backend/internal/importer"
	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/models"
	"github.com/nilbyte/mirante/backend/internal/money"
)

type createTransactionDto struct {
	AccountID         string  `json:"accountId"`
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
	if limit < 1 {
		limit = 20
	} else if limit > 5000 {
		limit = 5000
	}
	offset := (page - 1) * limit

	where, args, i := h.buildTransactionsFilter(q, claims.UserID)
	query := fmt.Sprintf(`
		SELECT t.id, t.account_id, t.user_id, t.category_id, t.card_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color,
		       a.name AS account_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		LEFT JOIN accounts a ON a.id = t.account_id
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
			&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID,
			&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
			&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
			&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
			&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor, &t.AccountName,
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
	var err error
	err = h.db.QueryRow(r.Context(), `
		SELECT t.id, t.account_id, t.user_id, t.category_id, t.card_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color,
		       a.name AS account_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		LEFT JOIN accounts a ON a.id = t.account_id
		WHERE t.id = $1 AND t.user_id = $2 AND t.is_active = true
	`, id, claims.UserID).Scan(
		&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID,
		&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
		&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
		&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
		&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.CategoryName, &t.CategoryColor, &t.AccountName,
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
			account_id, user_id, category_id, card_id, type, classification,
			payment_method, channel, status, is_recurring, amount_cents,
			total_installments, paid_installments, date, description, notes,
			currency_code, affects_account
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id, account_id, user_id, category_id, card_id, type, classification,
		          payment_method, channel, status, is_recurring, amount_cents,
		          total_installments, paid_installments, date, description, notes,
		          currency_code, affects_account, is_active, deleted_at, created_at, updated_at
	`,
		dto.AccountID, claims.UserID, dto.CategoryID, dto.CardID, dto.Type, classification,
		paymentMethod, channel, status, isRecurring, amountCents,
		dto.TotalInstallments, dto.PaidInstallments, txDate, dto.Description, dto.Notes,
		currency, affectsAccount,
	).Scan(
		&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID, &t.Type, &t.Classification,
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
	claims := middleware.ClaimsFromContext(r.Context())
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
	affectsAccount := paymentMethod != models.PaymentMethodCREDIT

	var t models.Transaction
	err = h.db.QueryRow(r.Context(), `
		UPDATE transactions SET
			account_id          = COALESCE($1, account_id),
			category_id         = COALESCE($2, category_id),
			card_id             = COALESCE($3, card_id),
			type                = COALESCE(NULLIF($4,''), type),
			classification      = COALESCE(NULLIF($5,''), classification),
			payment_method      = COALESCE(NULLIF($6,''), payment_method),
			channel             = COALESCE(NULLIF($7,''), channel),
			status              = COALESCE(NULLIF($8,''), status),
			is_recurring        = COALESCE($9, is_recurring),
			amount_cents        = COALESCE($10, amount_cents),
			total_installments  = COALESCE($11, total_installments),
			paid_installments   = COALESCE($12, paid_installments),
			date                = COALESCE($13, date),
			description         = COALESCE(NULLIF($14,''), description),
			notes               = COALESCE($15, notes),
			currency_code       = COALESCE(NULLIF($16,''), currency_code),
			affects_account     = $17,
			updated_at          = NOW()
		WHERE id = $18 AND user_id = $19 AND is_active = true
		RETURNING id, account_id, user_id, category_id, card_id, type, classification,
		          payment_method, channel, status, is_recurring, amount_cents,
		          total_installments, paid_installments, date, description, notes,
		          currency_code, affects_account, is_active, deleted_at, created_at, updated_at
	`,
		dto.AccountID, dto.CategoryID, dto.CardID, dto.Type, classification,
		paymentMethod, channel, status, isRecurring, amountCents,
		dto.TotalInstallments, dto.PaidInstallments, txDate, dto.Description, dto.Notes,
		currency, affectsAccount, id, claims.UserID,
	).Scan(
		&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID, &t.Type, &t.Classification,
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

	_, _ = h.db.Exec(r.Context(), `DELETE FROM refueling_logs WHERE transaction_id = $1`, id)

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ImportCSV(w http.ResponseWriter, r *http.Request) {
	h.ImportTransactions(w, r)
}

func (h *Handler) ImportTransactions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	if err := r.ParseMultipartForm(importer.MaxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "file too large (max 10MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file field required")
		return
	}
	defer file.Close()

	result, err := importer.ImportTransactions(r.Context(), h.db, importer.TransactionImportOptions{
		UserID:      claims.UserID,
		AccountID:   r.FormValue("accountId"),
		CardID:      r.FormValue("cardId"),
		Filename:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		Format:      r.FormValue("format"),
		Reader:      file,
	})
	if err != nil {
		switch {
		case errors.Is(err, importer.ErrUnsupportedFormat):
			writeError(w, http.StatusBadRequest, "unsupported file format")
		default:
			writeError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	status := http.StatusOK
	if result.Created == 0 && result.SkippedDuplicate > 0 && result.Skipped == 0 && result.SkippedInvalid == 0 {
		status = http.StatusConflict
	}
	writeJSON(w, status, result)
}

func (h *Handler) ListFutureTransactions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT t.id, t.account_id, t.user_id, t.category_id, t.card_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color,
		       a.name AS account_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		LEFT JOIN accounts a ON a.id = t.account_id
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
			&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID,
			&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
			&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
			&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
			&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor, &t.AccountName,
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
	if t.AccountName != nil {
		r["account"] = map[string]any{
			"name": t.AccountName,
		}
	}
	return r
}
