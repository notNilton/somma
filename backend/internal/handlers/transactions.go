package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/nilbyte/somma/backend/internal/cache"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
	"github.com/nilbyte/somma/backend/internal/money"
)

// transactionColumnsPlain é a lista canônica de colunas de transactions, sem alias.
const transactionColumnsPlain = `
	id, user_id, category_id, budget_id,
	type, kind, status, amount_cents, date,
	description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
	is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id,
	card_id, account_id, installment_group_id, installment_number, total_installments,
	is_invoice_payment, transfer_id, is_transfer,
	original_amount_cents, exchange_rate, iof_amount_cents`

// transactionColumns é a lista canônica de colunas de transactions (alias t).
const transactionColumns = `
	t.id, t.user_id, t.category_id, t.budget_id,
	t.type, t.kind, t.status, t.amount_cents, t.date,
	t.description, t.notes, t.currency_code, t.is_active, t.deleted_at, t.created_at, t.updated_at,
	t.is_recurring, t.recurrence_freq, t.recurrence_end_date, t.recurring_origin_id, t.goal_id,
	t.card_id, t.account_id, t.installment_group_id, t.installment_number, t.total_installments,
	t.is_invoice_payment, t.transfer_id, t.is_transfer,
	t.original_amount_cents, t.exchange_rate, t.iof_amount_cents`

// transactionScanDests retorna os destinos de scan alinhados a transactionColumns.
func transactionScanDests(t *models.Transaction) []any {
	return []any{
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID,
		&t.Type, &t.Kind, &t.Status, &t.AmountCents, &t.Date,
		&t.Description, &t.Notes, &t.CurrencyCode, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.IsRecurring, &t.RecurrenceFreq, &t.RecurrenceEndDate, &t.RecurringOriginID, &t.GoalID,
		&t.CardID, &t.AccountID, &t.InstallmentGroupID, &t.InstallmentNumber, &t.TotalInstallments,
		&t.IsInvoicePayment, &t.TransferID, &t.IsTransfer,
		&t.OriginalAmountCents, &t.ExchangeRate, &t.IofAmountCents,
	}
}

type txCursor struct {
	Date string `json:"d"`
	ID   string `json:"i"`
}

func encodeCursor(date time.Time, id string) string {
	b, _ := json.Marshal(txCursor{Date: date.Format("2006-01-02"), ID: id})
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeCursor(raw string) (txCursor, bool) {
	b, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return txCursor{}, false
	}
	var c txCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return txCursor{}, false
	}
	return c, true
}

type createTransactionDto struct {
	CategoryID     *string  `json:"categoryId"`
	BudgetID       *string  `json:"budgetId"`
	Type           string   `json:"type"`
	Kind           string   `json:"kind"`
	Status         *string  `json:"status"`
	Amount         float64  `json:"amount"`
	Date           string   `json:"date"`
	Description    string   `json:"description"`
	Notes          *string  `json:"notes"`
	CurrencyCode   *string  `json:"currencyCode"`
	GoalID         *string  `json:"goalId"`
	IsRecurring    bool     `json:"isRecurring"`
	RecurrenceFreq string   `json:"recurrenceFreq"` // DAILY | WEEKLY | MONTHLY | YEARLY
	RecurrenceEnd  string   `json:"recurrenceEnd"`  // YYYY-MM-DD, optional
	CardID         *string  `json:"cardId"`
	AccountID      *string  `json:"accountId"`
	TotalInstallments *int  `json:"totalInstallments"`
	OriginalAmount *float64 `json:"originalAmount"`
	ExchangeRate   *float64 `json:"exchangeRate"`
	IofPct         *float64 `json:"iofPct"`
	SpreadPct      *float64 `json:"spreadPct"`
}

const defaultIofPct = 3.38

func (d *createTransactionDto) currency() string {
	if d.CurrencyCode != nil && strings.TrimSpace(*d.CurrencyCode) != "" {
		return strings.ToUpper(strings.TrimSpace(*d.CurrencyCode))
	}
	return "BRL"
}

var validRecurrenceFreqs = map[string]bool{
	"DAILY": true, "WEEKLY": true, "MONTHLY": true, "YEARLY": true,
}

func (d *createTransactionDto) validate() error {
	if d.currency() == "BRL" {
		if d.Amount <= 0 {
			return errors.New("amount must be > 0")
		}
	} else {
		if d.OriginalAmount == nil || *d.OriginalAmount <= 0 {
			return errors.New("originalAmount must be > 0 for non-BRL currency")
		}
		if d.ExchangeRate == nil || *d.ExchangeRate <= 0 {
			return errors.New("exchangeRate must be > 0 for non-BRL currency")
		}
		if d.IofPct == nil {
			iof := defaultIofPct
			d.IofPct = &iof
		}
		if d.SpreadPct == nil {
			spread := 0.0
			d.SpreadPct = &spread
		}
		if *d.IofPct < 0 || *d.SpreadPct < 0 {
			return errors.New("iofPct and spreadPct must be >= 0")
		}
	}
	if d.TotalInstallments != nil && (*d.TotalInstallments < 1 || *d.TotalInstallments > 60) {
		return errors.New("totalInstallments must be between 1 and 60")
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
	if d.IsRecurring && d.RecurrenceFreq != "" && !validRecurrenceFreqs[d.RecurrenceFreq] {
		return errors.New("invalid recurrence frequency")
	}
	if d.IsRecurring && d.RecurrenceFreq == "" {
		d.RecurrenceFreq = "MONTHLY"
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

func (h *Handler) resolveCardLink(r *http.Request, userID string, cardID *string) (*string, error) {
	if cardID == nil || strings.TrimSpace(*cardID) == "" {
		return nil, nil
	}

	var exists string
	if err := h.db.QueryRow(r.Context(), `
		SELECT id
		FROM credit_cards
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, strings.TrimSpace(*cardID), userID).Scan(&exists); err != nil {
		return nil, errors.New("card not found")
	}

	clean := strings.TrimSpace(*cardID)
	return &clean, nil
}

func (h *Handler) resolveAccountLink(r *http.Request, userID string, accountID *string) (*string, error) {
	if accountID == nil || strings.TrimSpace(*accountID) == "" {
		return nil, nil
	}

	var exists string
	if err := h.db.QueryRow(r.Context(), `
		SELECT id
		FROM accounts
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, strings.TrimSpace(*accountID), userID).Scan(&exists); err != nil {
		return nil, errors.New("account not found")
	}

	clean := strings.TrimSpace(*accountID)
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

	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 {
		limit = 20
	} else if limit > 200 {
		limit = 200
	}

	where, args, i := h.buildTransactionsFilter(q, claims.UserID)

	if raw := q.Get("cursor"); raw != "" {
		if cur, ok := decodeCursor(raw); ok {
			where += fmt.Sprintf(" AND (t.date < $%d OR (t.date = $%d AND t.id < $%d))", i, i, i+1)
			args = append(args, cur.Date, cur.Date, cur.ID)
			i += 2
		}
	}

	query := fmt.Sprintf(`
		SELECT %s,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE %s
		ORDER BY t.date DESC, t.id DESC
		LIMIT $%d
	`, transactionColumns, where, i)
	args = append(args, limit+1)

	rows, err := h.getReadDB().Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	items := make([]any, 0, limit)
	var last models.TransactionWithCategory
	count := 0
	for rows.Next() {
		var t models.TransactionWithCategory
		dests := append(transactionScanDests(&t.Transaction), &t.CategoryName, &t.CategoryColor)
		if err := rows.Scan(dests...); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		count++
		if count <= limit {
			items = append(items, transactionResponse(t))
			last = t
		}
	}

	var nextCursor *string
	if count > limit {
		c := encodeCursor(last.Date, last.ID)
		nextCursor = &c
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":      items,
		"nextCursor": nextCursor,
	})
}

func (h *Handler) GetTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var t models.TransactionWithCategory
	err := h.getReadDB().QueryRow(r.Context(), fmt.Sprintf(`
		SELECT %s,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.id = $1 AND t.user_id = $2 AND t.is_active = true
	`, transactionColumns), r.PathValue("id"), claims.UserID).Scan(
		append(transactionScanDests(&t.Transaction), &t.CategoryName, &t.CategoryColor)...,
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

// txAmounts guarda os valores calculados em centavos para uma transação.
type txAmounts struct {
	amountCents   int64
	originalCents *int64
	exchangeRate  *float64
	iofCents      int64
}

// computeAmounts aplica as regras de multi-moeda: para moeda != BRL o valor em
// BRL é round(original * rate) + spread + IOF.
func computeAmounts(dto *createTransactionDto) txAmounts {
	if dto.currency() == "BRL" {
		return txAmounts{amountCents: money.ToCents(dto.Amount)}
	}
	orig := money.ToCents(*dto.OriginalAmount)
	rate := *dto.ExchangeRate
	base := int64(math.Round(float64(orig) * rate))
	spread := int64(math.Round(float64(orig) * rate * *dto.SpreadPct / 100))
	iof := int64(math.Round(float64(orig) * rate * *dto.IofPct / 100))
	return txAmounts{
		amountCents:   base + spread + iof,
		originalCents: &orig,
		exchangeRate:  &rate,
		iofCents:      iof,
	}
}

// splitCents divide total em n partes iguais (round-down), com o resto na última.
func splitCents(total int64, n int) []int64 {
	parts := make([]int64, n)
	if n <= 0 {
		return parts
	}
	base := total / int64(n)
	for i := range parts {
		parts[i] = base
	}
	parts[n-1] += total - base*int64(n)
	return parts
}

// addMonthsClamped soma meses mantendo o dia, limitado ao último dia do mês alvo.
func addMonthsClamped(t time.Time, months int) time.Time {
	target := time.Date(t.Year(), t.Month()+time.Month(months), 1, 12, 0, 0, 0, time.UTC)
	last := target.AddDate(0, 1, -1).Day()
	day := t.Day()
	if day > last {
		day = last
	}
	return time.Date(target.Year(), target.Month(), day, 12, 0, 0, 0, time.UTC)
}

type txQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func insertTransaction(ctx context.Context, q txQuerier, dto *createTransactionDto, userID string,
	budgetID, cardID, accountID *string, status string, txDate time.Time,
	amounts txAmounts, groupID *string, instNumber, totalInst *int16) (models.Transaction, error) {

	var t models.Transaction
	err := q.QueryRow(ctx, fmt.Sprintf(`
		INSERT INTO transactions (
			user_id, category_id, budget_id, goal_id, type, kind, status, amount_cents,
			date, description, notes, currency_code,
			is_recurring, recurrence_freq, recurrence_end_date,
			card_id, account_id, installment_group_id, installment_number, total_installments,
			original_amount_cents, exchange_rate, iof_amount_cents
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
		RETURNING %s
	`, transactionColumnsPlain),
		userID, dto.CategoryID, budgetID, dto.GoalID, dto.Type, dto.Kind, status, amounts.amountCents,
		txDate, fallbackTransactionDescription(*dto), dto.Notes, dto.currency(),
		dto.IsRecurring, recurrenceFreqOf(dto), recurrenceEndOf(dto),
		cardID, accountID, groupID, instNumber, totalInst,
		amounts.originalCents, amounts.exchangeRate, amounts.iofCents,
	).Scan(transactionScanDests(&t)...)
	return t, err
}

func recurrenceFreqOf(dto *createTransactionDto) *string {
	if !dto.IsRecurring {
		return nil
	}
	return &dto.RecurrenceFreq
}

func recurrenceEndOf(dto *createTransactionDto) *time.Time {
	if !dto.IsRecurring || dto.RecurrenceEnd == "" {
		return nil
	}
	if t, err := time.Parse("2006-01-02", dto.RecurrenceEnd); err == nil {
		return &t
	}
	return nil
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
	cardID, err := h.resolveCardLink(r, claims.UserID, dto.CardID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	accountID, err := h.resolveAccountLink(r, claims.UserID, dto.AccountID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	status := models.TransactionStatusCOMPLETED
	if dto.Status != nil {
		status = *dto.Status
	}

	amounts := computeAmounts(&dto)

	installments := 1
	if dto.TotalInstallments != nil && *dto.TotalInstallments > 1 {
		installments = *dto.TotalInstallments
	}

	if installments == 1 {
		t, err := insertTransaction(r.Context(), h.db, &dto, claims.UserID, budgetID, cardID, accountID,
			status, txDate, amounts, nil, nil, nil)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
		writeJSON(w, http.StatusCreated, transactionResponse(models.TransactionWithCategory{Transaction: t}))
		return
	}

	// Parcelamento: N transações em uma única tx SQL, mesmo installment_group_id.
	groupID := uuid.NewString()
	amountParts := splitCents(amounts.amountCents, installments)
	iofParts := splitCents(amounts.iofCents, installments)
	var origParts []int64
	if amounts.originalCents != nil {
		origParts = splitCents(*amounts.originalCents, installments)
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	items := make([]models.Transaction, 0, installments)
	total16 := int16(installments)
	for i := 0; i < installments; i++ {
		partAmounts := txAmounts{
			amountCents:  amountParts[i],
			exchangeRate: amounts.exchangeRate,
			iofCents:     iofParts[i],
		}
		if origParts != nil {
			orig := origParts[i]
			partAmounts.originalCents = &orig
		}
		num := int16(i + 1)
		item, err := insertTransaction(r.Context(), tx, &dto, claims.UserID, budgetID, cardID, accountID,
			status, addMonthsClamped(txDate, i), partAmounts, &groupID, &num, &total16)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		items = append(items, item)
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))

	respItems := make([]any, 0, installments)
	for _, item := range items {
		respItems = append(respItems, transactionResponse(models.TransactionWithCategory{Transaction: item}))
	}
	first := transactionResponse(models.TransactionWithCategory{Transaction: items[0]})
	first["items"] = respItems
	writeJSON(w, http.StatusCreated, first)
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
		          date, description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
		          is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id
	`, dto.CategoryID, budgetID, dto.Type, dto.Kind, status, money.ToCents(dto.Amount),
		txDate, fallbackTransactionDescription(dto), dto.Notes, currency, r.PathValue("id"), claims.UserID,
	).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.Type, &t.Kind, &t.Status, &t.AmountCents,
		&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.IsRecurring, &t.RecurrenceFreq, &t.RecurrenceEndDate, &t.RecurringOriginID, &t.GoalID,
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

func (h *Handler) RestoreTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	tag, err := h.db.Exec(r.Context(), `
		UPDATE transactions
		SET is_active = true, deleted_at = NULL, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND is_active = false
	`, r.PathValue("id"), claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "transaction not found or already active")
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

	rows, err := h.getReadDB().Query(r.Context(), fmt.Sprintf(`
		SELECT %s,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		  AND t.is_active = true
		  AND (t.date > NOW() OR t.status = 'PENDING')
		ORDER BY t.date ASC
	`, transactionColumns), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	result := make([]any, 0)
	for rows.Next() {
		var t models.TransactionWithCategory
		dests := append(transactionScanDests(&t.Transaction), &t.CategoryName, &t.CategoryColor)
		if err := rows.Scan(dests...); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result = append(result, transactionResponse(t))
	}

	writeJSON(w, http.StatusOK, result)
}

func transactionResponse(t models.TransactionWithCategory) map[string]any {
	r := map[string]any{
		"id":                t.ID,
		"userId":            t.UserID,
		"categoryId":        t.CategoryID,
		"budgetId":          t.BudgetID,
		"type":              t.Type,
		"kind":              t.Kind,
		"status":            t.Status,
		"amount":            money.ToReais(t.AmountCents),
		"date":              t.Date,
		"description":       t.Description,
		"notes":             t.Notes,
		"currencyCode":      t.CurrencyCode,
		"isActive":          t.IsActive,
		"createdAt":         t.CreatedAt,
		"updatedAt":         t.UpdatedAt,
		"isRecurring":       t.IsRecurring,
		"recurrenceFreq":    t.RecurrenceFreq,
		"recurringOriginId": t.RecurringOriginID,
		"goalId":            t.GoalID,
		"cardId":            t.CardID,
		"accountId":         t.AccountID,
		"installmentGroupId": t.InstallmentGroupID,
		"installmentNumber":  t.InstallmentNumber,
		"totalInstallments":  t.TotalInstallments,
		"isInvoicePayment":  t.IsInvoicePayment,
		"transferId":        t.TransferID,
		"isTransfer":        t.IsTransfer,
		"originalAmount":    money.ToReaisPtr(t.OriginalAmountCents),
		"exchangeRate":      t.ExchangeRate,
		"iofAmount":         money.ToReais(t.IofAmountCents),
		"iofAmountCents":    t.IofAmountCents,
	}
	if t.RecurrenceEndDate != nil {
		r["recurrenceEndDate"] = t.RecurrenceEndDate.Format("2006-01-02")
	}
	if t.CategoryName != nil {
		r["category"] = map[string]any{
			"name":  t.CategoryName,
			"color": t.CategoryColor,
		}
	}
	return r
}
