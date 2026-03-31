package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/models"
	"github.com/nilbyte/mirante/backend/internal/money"
)

func (h *Handler) GetMonthlyEvolution(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
		       type,
		       COALESCE(SUM(amount_cents), 0) AS total
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND affects_account = true
		  AND type IN ('INCOME', 'EXPENSE')
		  AND classification != 'TRANSFER'
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
	claims := middleware.ClaimsFromContext(r.Context())
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
		  AND t.affects_account = true
		  AND t.classification != 'TRANSFER'
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

	rows, err := h.db.Query(r.Context(), `
		SELECT t.date, t.description, t.amount_cents, t.type, t.status,
		       t.classification, t.payment_method, t.channel,
		       COALESCE(c.name, '') AS category_name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1
		  AND t.is_active = true
		  AND t.date >= $2::date
		  AND t.date <= $3::date
		ORDER BY t.date DESC
	`, claims.UserID, from, to)
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
