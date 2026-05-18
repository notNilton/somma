package web

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/models"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

// ============================================================
// Transactions pages
// ============================================================

func (h *Handler) ListTransactionsPage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	where, args, i := h.buildTransactionsFilter(q, user.ID)
	query := fmt.Sprintf(`
		SELECT t.id, t.description, t.amount_cents, t.type, t.date,
		       c.name AS category_name, c.color AS category_color,
		       t.status, t.payment_method
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE %s
		ORDER BY t.date DESC
		LIMIT $%d OFFSET $%d
	`, where, i, i+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		h.engine.Render(w, r, "transactions-list", map[string]any{
			"Title": "Transações",
			"User":  user,
			"Error": "Erro ao carregar transações",
		})
		return
	}
	defer rows.Close()

	var txs []map[string]any
	for rows.Next() {
		var id, description, txType, status, paymentMethod string
		var categoryName, categoryColor *string
		var amountCents int64
		var date time.Time
		rows.Scan(&id, &description, &amountCents, &txType, &date, &categoryName, &categoryColor, &status, &paymentMethod)
		txs = append(txs, map[string]any{
			"ID":             id,
			"Description":    description,
			"Amount":         money.ToReais(amountCents),
			"AmountCents":    amountCents,
			"Type":           txType,
			"Date":           date,
			"CategoryName":   categoryName,
			"CategoryColor":  categoryColor,
			"Status":         status,
			"PaymentMethod":  paymentMethod,
		})
	}

	if txs == nil {
		txs = []map[string]any{}
	}

	// Fetch categories for filter dropdown
	cats := h.listUserCategories(r.Context(), user.ID)

	h.engine.Render(w, r, "transactions-list", map[string]any{
		"Title":       "Transações",
		"User":        user,
		"Transactions": txs,
		"Categories":  cats,
		"Page":        page,
		"Limit":       limit,
		"Query": map[string]string{
			"search":       q.Get("search"),
			"type":         q.Get("type"),
			"status":       q.Get("status"),
			"categoryId":   q.Get("categoryId"),
			"from":         q.Get("from"),
			"to":           q.Get("to"),
		},
	})
}

func (h *Handler) NewTransactionPage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	cats := h.listUserCategories(r.Context(), user.ID)
	h.engine.Render(w, r, "transactions-form", map[string]any{
		"Title":      "Nova transação",
		"User":       user,
		"Categories": cats,
		"IsEdit":     false,
		"Today":      time.Now().Format("2006-01-02"),
	})
}

func (h *Handler) CreateTransactionWeb(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if err := r.ParseForm(); err != nil {
		h.showTransactionFormError(w, r, user.ID, "Dados inválidos", nil)
		return
	}

	dto, err := h.parseTransactionForm(r)
	if err != nil {
		h.showTransactionFormError(w, r, user.ID, err.Error(), dto)
		return
	}

	if err := h.insertTransaction(r.Context(), user.ID, dto); err != nil {
		h.showTransactionFormError(w, r, user.ID, err.Error(), dto)
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(user.ID))

	if r.Header.Get("HX-Request") == "true" {
		w.Header().Set("HX-Redirect", "/transactions")
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/transactions", http.StatusSeeOther)
}

func (h *Handler) EditTransactionPage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	id := r.PathValue("id")
	var t models.TransactionWithCategory
	err := h.db.QueryRow(r.Context(), `
		SELECT t.id, t.user_id, t.category_id, t.budget_id, t.budget_item_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.id = $1 AND t.user_id = $2 AND t.is_active = true
	`, id, user.ID).Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.BudgetID, &t.BudgetItemID,
		&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
		&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
		&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
		&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.CategoryName, &t.CategoryColor,
	)
	if err != nil {
		http.Redirect(w, r, "/transactions", http.StatusSeeOther)
		return
	}

	cats := h.listUserCategories(r.Context(), user.ID)
	h.engine.Render(w, r, "transactions-form", map[string]any{
		"Title":       "Editar transação",
		"User":        user,
		"Categories":  cats,
		"IsEdit":      true,
		"Tx":          t,
		"Amount":      money.ToReais(t.AmountCents),
		"Date":        t.Date.Format("2006-01-02"),
	})
}

func (h *Handler) UpdateTransactionWeb(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	id := r.PathValue("id")
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	dto, err := h.parseTransactionForm(r)
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	if err := h.updateTransaction(r.Context(), user.ID, id, dto); err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(user.ID))
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (h *Handler) DeleteTransactionWeb(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	id := r.PathValue("id")
	now := time.Now()
	tag, err := h.db.Exec(r.Context(), `
		UPDATE transactions SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND is_active = true
	`, now, id, user.ID)
	if err != nil || tag.RowsAffected() == 0 {
		if r.Header.Get("HX-Request") == "true" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	_, _ = h.db.Exec(r.Context(), `DELETE FROM refueling_logs WHERE transaction_id = $1`, id)
	h.cache.DeletePrefix(cache.DashboardPrefix(user.ID))

	if r.Header.Get("HX-Request") == "true" {
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// ============================================================
// Helpers
// ============================================================

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

type txFormDto struct {
	CategoryID   string
	Type         string
	Amount       float64
	Date         string
	Description  string
	Notes        string
	Status       string
	PaymentMethod string
}

func (h *Handler) parseTransactionForm(r *http.Request) (*txFormDto, error) {
	amount, err := strconv.ParseFloat(r.FormValue("amount"), 64)
	if err != nil || amount <= 0 {
		return nil, errors.New("valor deve ser maior que zero")
	}
	date := r.FormValue("date")
	if date == "" {
		return nil, errors.New("data é obrigatória")
	}
	txType := r.FormValue("type")
	if !models.ValidTransactionTypes[txType] {
		return nil, errors.New("tipo inválido")
	}
	desc := strings.TrimSpace(r.FormValue("description"))
	if desc == "" {
		desc = "Lançamento"
	}
	return &txFormDto{
		CategoryID:    r.FormValue("categoryId"),
		Type:          txType,
		Amount:        amount,
		Date:          date,
		Description:   desc,
		Notes:         r.FormValue("notes"),
		Status:        r.FormValue("status"),
		PaymentMethod: r.FormValue("paymentMethod"),
	}, nil
}

func (h *Handler) insertTransaction(ctx context.Context, userID string, dto *txFormDto) error {
	status := dto.Status
	if status == "" {
		status = models.TransactionStatusCOMPLETED
	}
	pm := dto.PaymentMethod
	if pm == "" {
		pm = models.PaymentMethodDEBIT
	}
	parsedDate, err := time.Parse("2006-01-02", dto.Date)
	if err != nil {
		return err
	}
	txDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC)
	amountCents := money.ToCents(dto.Amount)

	var catID *string
	if dto.CategoryID != "" {
		catID = &dto.CategoryID
	}

	_, err = h.db.Exec(ctx, `
		INSERT INTO transactions (
			user_id, category_id, type, classification, payment_method, channel, status,
			amount_cents, date, description, notes, currency_code, affects_account
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`, userID, catID, dto.Type, models.TransactionClassificationCOMMON, pm, models.ChannelBANK, status,
		amountCents, txDate, dto.Description, strPtrOrNil(dto.Notes), "BRL", pm != models.PaymentMethodCREDIT)
	return err
}

func (h *Handler) updateTransaction(ctx context.Context, userID, id string, dto *txFormDto) error {
	status := dto.Status
	if status == "" {
		status = models.TransactionStatusCOMPLETED
	}
	pm := dto.PaymentMethod
	if pm == "" {
		pm = models.PaymentMethodDEBIT
	}
	parsedDate, err := time.Parse("2006-01-02", dto.Date)
	if err != nil {
		return err
	}
	txDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC)
	amountCents := money.ToCents(dto.Amount)

	var catID *string
	if dto.CategoryID != "" {
		catID = &dto.CategoryID
	}

	_, err = h.db.Exec(ctx, `
		UPDATE transactions SET
			category_id = $1,
			type = $2,
			classification = $3,
			payment_method = $4,
			channel = $5,
			status = $6,
			amount_cents = $7,
			date = $8,
			description = $9,
			notes = $10,
			updated_at = NOW()
		WHERE id = $11 AND user_id = $12 AND is_active = true
	`, catID, dto.Type, models.TransactionClassificationCOMMON, pm, models.ChannelBANK, status,
		amountCents, txDate, dto.Description, strPtrOrNil(dto.Notes), id, userID)
	return err
}

func (h *Handler) showTransactionFormError(w http.ResponseWriter, r *http.Request, userID string, msg string, dto *txFormDto) {
	cats := h.listUserCategories(r.Context(), userID)
	data := map[string]any{
		"Title":      "Nova transação",
		"Categories": cats,
		"IsEdit":     false,
		"Today":      time.Now().Format("2006-01-02"),
		"Error":      msg,
	}
	if dto != nil {
		data["Dto"] = dto
	}
	h.engine.Render(w, r, "transactions-form", data)
}

func (h *Handler) listUserCategories(ctx context.Context, userID string) []models.Category {
	rows, err := h.db.Query(ctx, `
		SELECT id, user_id, name, type, description, color, parent_id, created_at, updated_at
		FROM categories
		WHERE user_id = $1 AND is_active = true
		ORDER BY type, name
	`, userID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var cats []models.Category
	for rows.Next() {
		var c models.Category
		rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.Color, &c.ParentID, &c.CreatedAt, &c.UpdatedAt)
		cats = append(cats, c)
	}
	return cats
}
