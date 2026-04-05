package handlers

import (
	"net/http"
	"time"

	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/money"
)

func (h *Handler) GetFinancialCalendar(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	q := r.URL.Query()

	from := q.Get("from")
	to := q.Get("to")

	if from == "" {
		from = time.Now().Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().AddDate(0, 0, 30).Format("2006-01-02")
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT
			DATE(t.date) AS day,
			t.id, t.description, t.amount_cents, t.type, t.status,
			c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		  AND t.is_active = true
		  AND t.date >= $2::date
		  AND t.date <= $3::date
		ORDER BY t.date ASC
	`, claims.UserID, from, to)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	type txEntry struct {
		ID            string
		Description   string
		AmountCents   int64
		Type          string
		Status        string
		CategoryName  *string
		CategoryColor *string
	}

	dayMap := make(map[string][]txEntry)
	var orderedDays []string
	seen := make(map[string]bool)

	for rows.Next() {
		var day string
		var e txEntry
		if err := rows.Scan(&day, &e.ID, &e.Description, &e.AmountCents, &e.Type, &e.Status, &e.CategoryName, &e.CategoryColor); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if !seen[day] {
			seen[day] = true
			orderedDays = append(orderedDays, day)
		}
		dayMap[day] = append(dayMap[day], e)
	}

	result := make([]any, 0, len(orderedDays))
	for _, day := range orderedDays {
		entries := dayMap[day]
		var incomeCents, expenseCents int64
		var hasPending bool
		txs := make([]any, 0, len(entries))
		for _, e := range entries {
			if e.Type == "INCOME" {
				incomeCents += e.AmountCents
			} else if e.Type == "EXPENSE" {
				expenseCents += e.AmountCents
			}
			if e.Status == "PENDING" {
				hasPending = true
			}
			txs = append(txs, map[string]any{
				"id":          e.ID,
				"description": e.Description,
				"amount":      money.ToReais(e.AmountCents),
				"type":        e.Type,
				"status":      e.Status,
				"category": map[string]any{
					"name":  e.CategoryName,
					"color": e.CategoryColor,
				},
			})
		}
		result = append(result, map[string]any{
			"date":         day,
			"transactions": txs,
			"income":       money.ToReais(incomeCents),
			"expense":      money.ToReais(expenseCents),
			"hasPending":   hasPending,
		})
	}

	writeJSON(w, http.StatusOK, result)
}
