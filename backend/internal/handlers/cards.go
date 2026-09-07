package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nilbyte/somma/backend/internal/cache"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
	"github.com/nilbyte/somma/backend/internal/money"
)

type createCardDto struct {
	Name        string  `json:"name"`
	Brand       *string `json:"brand"`
	Last4       *string `json:"last4"`
	CreditLimit float64 `json:"creditLimit"`
	ClosingDay  int     `json:"closingDay"`
	DueDay      int     `json:"dueDay"`
}

func (d *createCardDto) validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return errors.New("name is required")
	}
	if len(strings.TrimSpace(d.Name)) > 80 {
		return errors.New("name max 80 chars")
	}
	if d.CreditLimit < 0 {
		return errors.New("creditLimit must be >= 0")
	}
	if d.ClosingDay < 1 || d.ClosingDay > 31 {
		return errors.New("closingDay must be between 1 and 31")
	}
	if d.DueDay < 1 || d.DueDay > 31 {
		return errors.New("dueDay must be between 1 and 31")
	}
	if d.Brand != nil && len(*d.Brand) > 30 {
		return errors.New("brand max 30 chars")
	}
	if d.Last4 != nil && len(*d.Last4) > 4 {
		return errors.New("last4 max 4 chars")
	}
	return nil
}

type updateCardDto struct {
	Name        *string  `json:"name"`
	Brand       *string  `json:"brand"`
	Last4       *string  `json:"last4"`
	CreditLimit *float64 `json:"creditLimit"`
	ClosingDay  *int     `json:"closingDay"`
	DueDay      *int     `json:"dueDay"`
}

func (d *updateCardDto) validate() error {
	if d.Name != nil && strings.TrimSpace(*d.Name) == "" {
		return errors.New("name cannot be empty")
	}
	if d.CreditLimit != nil && *d.CreditLimit < 0 {
		return errors.New("creditLimit must be >= 0")
	}
	if d.ClosingDay != nil && (*d.ClosingDay < 1 || *d.ClosingDay > 31) {
		return errors.New("closingDay must be between 1 and 31")
	}
	if d.DueDay != nil && (*d.DueDay < 1 || *d.DueDay > 31) {
		return errors.New("dueDay must be between 1 and 31")
	}
	return nil
}

func cardResponse(c models.CreditCard, availableLimitCents int64) map[string]any {
	return map[string]any{
		"id":                   c.ID,
		"userId":               c.UserID,
		"name":                 c.Name,
		"brand":                c.Brand,
		"last4":                c.Last4,
		"creditLimit":          money.ToReais(c.CreditLimitCents),
		"creditLimitCents":     c.CreditLimitCents,
		"availableLimit":       money.ToReais(availableLimitCents),
		"availableLimitCents":  availableLimitCents,
		"closingDay":           c.ClosingDay,
		"dueDay":               c.DueDay,
		"isActive":             c.IsActive,
		"createdAt":            c.CreatedAt,
		"updatedAt":            c.UpdatedAt,
	}
}

// cardUsedCents estima o limite comprometido: todas as despesas no cartão menos
// o total de faturas já pagas.
func (h *Handler) cardUsedCents(r *http.Request, cardID string) int64 {
	var used int64
	h.db.QueryRow(r.Context(), `
		SELECT COALESCE((
			SELECT SUM(t.amount_cents)
			FROM transactions t
			WHERE t.card_id = $1 AND t.is_active = true
			  AND t.type = 'EXPENSE' AND t.status <> 'CANCELED'
		), 0) - COALESCE((
			SELECT SUM(p.amount_cents)
			FROM card_invoice_payments p
			WHERE p.card_id = $1
		), 0)
	`, cardID).Scan(&used)
	return used
}

func (h *Handler) ListCards(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT c.id, c.user_id, c.name, c.brand, c.last4, c.credit_limit_cents,
		       c.closing_day, c.due_day, c.is_active, c.created_at, c.updated_at,
		       c.credit_limit_cents - (
		           COALESCE((
		               SELECT SUM(t.amount_cents)
		               FROM transactions t
		               WHERE t.card_id = c.id AND t.is_active = true
		                 AND t.type = 'EXPENSE' AND t.status <> 'CANCELED'
		           ), 0) - COALESCE((
		               SELECT SUM(p.amount_cents)
		               FROM card_invoice_payments p
		               WHERE p.card_id = c.id
		           ), 0)
		       ) AS available_limit_cents
		FROM credit_cards c
		WHERE c.user_id = $1 AND c.is_active = true
		ORDER BY c.name ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	result := make([]any, 0)
	for rows.Next() {
		var c models.CreditCard
		var availableCents int64
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.CreditLimitCents,
			&c.ClosingDay, &c.DueDay, &c.IsActive, &c.CreatedAt, &c.UpdatedAt, &availableCents,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result = append(result, cardResponse(c, availableCents))
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) CreateCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto createCardDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var c models.CreditCard
	if err := h.db.QueryRow(r.Context(), `
		INSERT INTO credit_cards (user_id, name, brand, last4, credit_limit_cents, closing_day, due_day, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true)
		RETURNING id, user_id, name, brand, last4, credit_limit_cents, closing_day, due_day, is_active, created_at, updated_at
	`, claims.UserID, strings.TrimSpace(dto.Name), dto.Brand, dto.Last4,
		money.ToCents(dto.CreditLimit), dto.ClosingDay, dto.DueDay).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.CreditLimitCents,
		&c.ClosingDay, &c.DueDay, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, cardResponse(c, c.CreditLimitCents))
}

func (h *Handler) UpdateCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto updateCardDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var c models.CreditCard
	err := h.db.QueryRow(r.Context(), `
		UPDATE credit_cards
		SET name = COALESCE($1, name),
		    brand = COALESCE($2, brand),
		    last4 = COALESCE($3, last4),
		    credit_limit_cents = COALESCE($4, credit_limit_cents),
		    closing_day = COALESCE($5, closing_day),
		    due_day = COALESCE($6, due_day),
		    updated_at = NOW()
		WHERE id = $7 AND user_id = $8 AND is_active = true
		RETURNING id, user_id, name, brand, last4, credit_limit_cents, closing_day, due_day, is_active, created_at, updated_at
	`, dto.Name, dto.Brand, dto.Last4, money.ToCentsPtr(dto.CreditLimit), dto.ClosingDay, dto.DueDay,
		r.PathValue("id"), claims.UserID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.CreditLimitCents,
		&c.ClosingDay, &c.DueDay, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}

	writeJSON(w, http.StatusOK, cardResponse(c, c.CreditLimitCents-h.cardUsedCents(r, c.ID)))
}

func (h *Handler) DeleteCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	tag, err := h.db.Exec(r.Context(), `
		UPDATE credit_cards
		SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, r.PathValue("id"), claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getOwnedCard carrega um cartão ativo do usuário ou escreve 404.
func (h *Handler) getOwnedCard(w http.ResponseWriter, r *http.Request, userID, cardID string) (models.CreditCard, bool) {
	var c models.CreditCard
	err := h.db.QueryRow(r.Context(), `
		SELECT id, user_id, name, brand, last4, credit_limit_cents, closing_day, due_day, is_active, created_at, updated_at
		FROM credit_cards
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, cardID, userID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.CreditLimitCents,
		&c.ClosingDay, &c.DueDay, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return c, false
	}
	return c, true
}

// invoiceCycle descreve uma fatura derivada do dia de fechamento do cartão.
type invoiceCycle struct {
	referenceMonth time.Time
	closingDate    time.Time
	dueDate        time.Time
}

// clampDay limita o dia ao último dia do mês (ex: dia 31 em fevereiro → 28/29).
func clampDay(y int, m time.Month, day int) time.Time {
	first := time.Date(y, m, 1, 12, 0, 0, 0, time.UTC)
	last := first.AddDate(0, 1, -1).Day()
	if day > last {
		day = last
	}
	return time.Date(y, m, day, 12, 0, 0, 0, time.UTC)
}

func dateKey(t time.Time) int {
	t = t.UTC()
	return t.Year()*10000 + int(t.Month())*100 + t.Day()
}

func invoiceDueDate(ref time.Time, closingDay, dueDay int16) time.Time {
	if dueDay > closingDay {
		return clampDay(ref.Year(), ref.Month(), int(dueDay))
	}
	next := ref.AddDate(0, 1, 0)
	return clampDay(next.Year(), next.Month(), int(dueDay))
}

// buildInvoiceCycles retorna os ciclos de fatura terminando no ciclo corrente
// (o ciclo cujo fechamento é o próximo a ocorrer), em ordem cronológica.
func buildInvoiceCycles(closingDay, dueDay int16, months int, now time.Time) []invoiceCycle {
	curRef := time.Date(now.Year(), now.Month(), 1, 12, 0, 0, 0, time.UTC)
	if dateKey(now) > dateKey(clampDay(now.Year(), now.Month(), int(closingDay))) {
		curRef = curRef.AddDate(0, 1, 0)
	}

	cycles := make([]invoiceCycle, 0, months)
	for i := months - 1; i >= 0; i-- {
		ref := curRef.AddDate(0, -i, 0)
		cycles = append(cycles, invoiceCycle{
			referenceMonth: ref,
			closingDate:    clampDay(ref.Year(), ref.Month(), int(closingDay)),
			dueDate:        invoiceDueDate(ref, closingDay, dueDay),
		})
	}
	return cycles
}

func (h *Handler) ListCardInvoices(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	card, ok := h.getOwnedCard(w, r, claims.UserID, r.PathValue("id"))
	if !ok {
		return
	}

	months, _ := strconv.Atoi(r.URL.Query().Get("months"))
	if months < 1 {
		months = 6
	}
	if months > 36 {
		months = 36
	}

	now := time.Now()
	cycles := buildInvoiceCycles(card.ClosingDay, card.DueDay, months, now)

	oldestPrev := cycles[0].referenceMonth.AddDate(0, -1, 0)
	windowStart := clampDay(oldestPrev.Year(), oldestPrev.Month(), int(card.ClosingDay))
	windowEnd := cycles[len(cycles)-1].closingDate

	type txEntry struct {
		date        time.Time
		amountCents int64
	}
	txs := make([]txEntry, 0)
	rows, err := h.db.Query(r.Context(), `
		SELECT t.date, t.amount_cents
		FROM transactions t
		WHERE t.card_id = $1 AND t.user_id = $2 AND t.is_active = true
		  AND t.type = 'EXPENSE' AND t.status <> 'CANCELED'
		  AND t.date > $3::date
		  AND t.date < ($4::date + INTERVAL '1 day')
	`, card.ID, claims.UserID, windowStart.Format("2006-01-02"), windowEnd.Format("2006-01-02"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var e txEntry
		if err := rows.Scan(&e.date, &e.amountCents); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		txs = append(txs, e)
	}

	paidMonths := make(map[string]bool)
	pRows, err := h.db.Query(r.Context(), `
		SELECT reference_month FROM card_invoice_payments WHERE card_id = $1
	`, card.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer pRows.Close()
	for pRows.Next() {
		var rm time.Time
		if err := pRows.Scan(&rm); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		paidMonths[rm.UTC().Format("2006-01")] = true
	}

	result := make([]any, 0, len(cycles))
	for _, cyc := range cycles {
		prev := cyc.referenceMonth.AddDate(0, -1, 0)
		prevClosing := clampDay(prev.Year(), prev.Month(), int(card.ClosingDay))

		var totalCents int64
		var count int
		for _, e := range txs {
			if dateKey(e.date) > dateKey(prevClosing) && dateKey(e.date) <= dateKey(cyc.closingDate) {
				totalCents += e.amountCents
				count++
			}
		}

		status := models.InvoiceStatusOpen
		if paidMonths[cyc.referenceMonth.Format("2006-01")] {
			status = models.InvoiceStatusPaid
		} else if dateKey(cyc.closingDate) < dateKey(now) {
			status = models.InvoiceStatusClosed
		}

		result = append(result, map[string]any{
			"referenceMonth":   cyc.referenceMonth.Format("2006-01"),
			"closingDate":      cyc.closingDate.Format("2006-01-02"),
			"dueDate":          cyc.dueDate.Format("2006-01-02"),
			"status":           status,
			"total":            money.ToReais(totalCents),
			"totalCents":       totalCents,
			"transactionCount": count,
		})
	}

	writeJSON(w, http.StatusOK, result)
}

// invoiceWindow retorna (exclusiveStart, inclusiveEnd) do ciclo cuja referência é refMonth.
func invoiceWindow(closingDay int16, refMonth time.Time) (time.Time, time.Time) {
	prev := refMonth.AddDate(0, -1, 0)
	return clampDay(prev.Year(), prev.Month(), int(closingDay)),
		clampDay(refMonth.Year(), refMonth.Month(), int(closingDay))
}

func parseInvoiceMonth(raw string) (time.Time, error) {
	m, err := time.Parse("2006-01", raw)
	if err != nil {
		return time.Time{}, errors.New("invalid month format, use YYYY-MM")
	}
	return m, nil
}

func (h *Handler) ListInvoiceTransactions(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	card, ok := h.getOwnedCard(w, r, claims.UserID, r.PathValue("id"))
	if !ok {
		return
	}

	refMonth, err := parseInvoiceMonth(r.PathValue("month"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	start, end := invoiceWindow(card.ClosingDay, refMonth)

	rows, err := h.db.Query(r.Context(), fmt.Sprintf(`
		SELECT %s,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.card_id = $1 AND t.user_id = $2 AND t.is_active = true
		  AND t.type = 'EXPENSE' AND t.status <> 'CANCELED'
		  AND t.date > $3::date
		  AND t.date < ($4::date + INTERVAL '1 day')
		ORDER BY t.date ASC, t.id ASC
	`, transactionColumns), card.ID, claims.UserID, start.Format("2006-01-02"), end.Format("2006-01-02"))
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

func (h *Handler) PayCardInvoice(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	card, ok := h.getOwnedCard(w, r, claims.UserID, r.PathValue("id"))
	if !ok {
		return
	}

	refMonth, err := parseInvoiceMonth(r.PathValue("month"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var body struct {
		AccountID *string `json:"accountId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && err != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	accountID, err := h.resolveAccountLink(r, claims.UserID, body.AccountID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	start, end := invoiceWindow(card.ClosingDay, refMonth)

	var totalCents int64
	if err := h.db.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(t.amount_cents), 0)
		FROM transactions t
		WHERE t.card_id = $1 AND t.user_id = $2 AND t.is_active = true
		  AND t.type = 'EXPENSE' AND t.status <> 'CANCELED'
		  AND t.date > $3::date
		  AND t.date < ($4::date + INTERVAL '1 day')
	`, card.ID, claims.UserID, start.Format("2006-01-02"), end.Format("2006-01-02")).Scan(&totalCents); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if totalCents <= 0 {
		writeError(w, http.StatusBadRequest, "invoice is empty")
		return
	}

	var existing string
	err = h.db.QueryRow(r.Context(), `
		SELECT id FROM card_invoice_payments
		WHERE card_id = $1 AND reference_month = $2
	`, card.ID, refMonth.Format("2006-01-02")).Scan(&existing)
	if err == nil {
		writeError(w, http.StatusConflict, "invoice already paid")
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	now := time.Now()
	payDate := time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, time.UTC)
	if due := invoiceDueDate(refMonth, card.ClosingDay, card.DueDay); dateKey(due) > dateKey(now) {
		payDate = due
	}

	description := fmt.Sprintf("Pagamento fatura %s %02d/%04d", card.Name, int(refMonth.Month()), refMonth.Year())

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	var paymentTx models.Transaction
	err = tx.QueryRow(r.Context(), fmt.Sprintf(`
		INSERT INTO transactions (
			user_id, account_id, type, kind, status, amount_cents, date, description, is_invoice_payment
		) VALUES ($1, $2, 'EXPENSE', 'EXPENSE', 'COMPLETED', $3, $4, $5, true)
		RETURNING %s
	`, transactionColumnsPlain),
		claims.UserID, accountID, totalCents, payDate, description,
	).Scan(transactionScanDests(&paymentTx)...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	var payment models.CardInvoicePayment
	err = tx.QueryRow(r.Context(), `
		INSERT INTO card_invoice_payments (user_id, card_id, reference_month, amount_cents, transaction_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, card_id, reference_month, amount_cents, paid_at, transaction_id
	`, claims.UserID, card.ID, refMonth.Format("2006-01-02"), totalCents, paymentTx.ID).Scan(
		&payment.ID, &payment.UserID, &payment.CardID, &payment.ReferenceMonth,
		&payment.AmountCents, &payment.PaidAt, &payment.TransactionID,
	)
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
		"id":             payment.ID,
		"cardId":         payment.CardID,
		"referenceMonth": payment.ReferenceMonth.UTC().Format("2006-01"),
		"amount":         money.ToReais(payment.AmountCents),
		"amountCents":    payment.AmountCents,
		"paidAt":         payment.PaidAt,
		"transactionId":  payment.TransactionID,
		"transaction":    transactionResponse(models.TransactionWithCategory{Transaction: paymentTx}),
	})
}
