package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/models"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

func (h *Handler) GetMonthlyEvolution(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
		       type,
		       COALESCE(SUM(amount_cents), 0) AS total
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND status = 'COMPLETED'
		  AND type IN ('INCOME', 'EXPENSE')
		  AND date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
		GROUP BY month, type
		ORDER BY month ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	// Montar mapa mes -> ponto
	pointMap := make(map[string]*models.MonthlyEvolutionPoint)
	for rows.Next() {
		var month, txType string
		var total int64
		if err := rows.Scan(&month, &txType, &total); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if _, ok := pointMap[month]; !ok {
			pointMap[month] = &models.MonthlyEvolutionPoint{Month: month}
		}
		if txType == "INCOME" {
			pointMap[month].IncomeCents = total
		} else {
			pointMap[month].ExpenseCents = total
		}
	}

	// Garantir que todos os 6 meses apareçam (mesmo sem transações)
	result := make([]any, 0, 6)
	now := time.Now()
	for i := 5; i >= 0; i-- {
		m := now.AddDate(0, -i, 0).Format("2006-01")
		if p, ok := pointMap[m]; ok {
			result = append(result, map[string]any{
				"month":        p.Month,
				"income":       money.ToReais(p.IncomeCents),
				"expenses":     money.ToReais(p.ExpenseCents),
				"net":          money.ToReais(p.IncomeCents - p.ExpenseCents),
				"incomeCents":  p.IncomeCents,
				"expenseCents": p.ExpenseCents,
			})
		} else {
			result = append(result, map[string]any{
				"month":        m,
				"income":       0.0,
				"expenses":     0.0,
				"net":          0.0,
				"incomeCents":  int64(0),
				"expenseCents": int64(0),
			})
		}
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) GetCategoryBreakdown(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	q := r.URL.Query()

	month := q.Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	monthDate := month + "-01"

	txType := q.Get("type")
	if txType == "" {
		txType = "EXPENSE"
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT c.id, c.name, c.color, t.type,
		       SUM(t.amount_cents) AS total_cents,
		       COUNT(*) AS tx_count
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		  AND t.is_active = true
		  AND t.status = 'COMPLETED'
		  AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
		  AND t.type = $3
		GROUP BY c.id, c.name, c.color, t.type
		ORDER BY total_cents DESC
	`, claims.UserID, monthDate, txType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var items []any
	for rows.Next() {
		var item models.CategoryBreakdownItem
		if err := rows.Scan(&item.CategoryID, &item.CategoryName, &item.CategoryColor, &item.Type, &item.TotalCents, &item.Count); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		items = append(items, map[string]any{
			"categoryId":    item.CategoryID,
			"categoryName":  item.CategoryName,
			"categoryColor": item.CategoryColor,
			"type":          item.Type,
			"total":         money.ToReais(item.TotalCents),
			"totalCents":    item.TotalCents,
			"count":         item.Count,
		})
	}

	if items == nil {
		items = []any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"month": month,
		"type":  txType,
		"items": items,
	})
}

// GetAnnualEvolution retorna 12 meses de receitas e despesas para o ano solicitado.
// Query param: year (padrão: ano atual).
func (h *Handler) GetAnnualEvolution(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	year := time.Now().Year()
	if raw := r.URL.Query().Get("year"); raw != "" {
		if y, err := strconv.Atoi(raw); err == nil && y >= 2000 {
			year = y
		}
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT EXTRACT(MONTH FROM date)::INT AS month,
		       type,
		       COALESCE(SUM(amount_cents), 0) AS total
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND status = 'COMPLETED'
		  AND type IN ('INCOME', 'EXPENSE')
		  AND EXTRACT(YEAR FROM date) = $2
		GROUP BY month, type
		ORDER BY month ASC
	`, claims.UserID, year)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	type monthPoint struct {
		IncomeCents  int64
		ExpenseCents int64
	}
	pointMap := make(map[int]*monthPoint)
	for rows.Next() {
		var m int
		var txType string
		var total int64
		if err := rows.Scan(&m, &txType, &total); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if _, ok := pointMap[m]; !ok {
			pointMap[m] = &monthPoint{}
		}
		if txType == "INCOME" {
			pointMap[m].IncomeCents = total
		} else {
			pointMap[m].ExpenseCents = total
		}
	}

	result := make([]any, 12)
	for i := 1; i <= 12; i++ {
		month := time.Month(i)
		label := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC).Format("2006-01")
		p, ok := pointMap[i]
		if !ok {
			p = &monthPoint{}
		}
		result[i-1] = map[string]any{
			"month":        label,
			"income":       money.ToReais(p.IncomeCents),
			"expenses":     money.ToReais(p.ExpenseCents),
			"net":          money.ToReais(p.IncomeCents - p.ExpenseCents),
			"incomeCents":  p.IncomeCents,
			"expenseCents": p.ExpenseCents,
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"year": year,
		"data": result,
	})
}
