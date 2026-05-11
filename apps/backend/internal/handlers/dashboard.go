package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/nilbyte/personalledger/backend/internal/cache"
	"github.com/nilbyte/personalledger/backend/internal/middleware"
	"github.com/nilbyte/personalledger/backend/internal/money"
)

func (h *Handler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	// Primeiro dia do mês selecionado para usar nas queries
	monthDate := month + "-01"

	cacheKey := cache.DashboardKey(claims.UserID, month)
	if cached, ok := h.cache.Get(cacheKey); ok {
		writeJSON(w, http.StatusOK, cached)
		return
	}

	// Nome do usuário
	var userName string
	h.db.QueryRow(r.Context(), `SELECT COALESCE(name, email) FROM users WHERE id = $1`, claims.UserID).Scan(&userName)
	if idx := strings.Index(userName, " "); idx > 0 {
		userName = userName[:idx]
	}

	// Total balance calculado a partir dos lançamentos ativos do usuário.
	var totalBalanceCents int64
	h.db.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(
			CASE
				WHEN type = 'INCOME' AND affects_account = true THEN amount_cents
				WHEN type = 'EXPENSE' AND affects_account = true THEN -amount_cents
				ELSE 0
			END
		), 0)
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
	`, claims.UserID).Scan(&totalBalanceCents)

	// Income e expenses do mês selecionado
	var monthlyIncomeCents, monthlyExpensesCents int64
	rows, err := h.db.Query(r.Context(), `
		SELECT type, COALESCE(SUM(amount_cents), 0)
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND affects_account = true
		  AND type IN ('INCOME', 'EXPENSE')
		  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
		GROUP BY type
	`, claims.UserID, monthDate)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var txType string
			var cents int64
			rows.Scan(&txType, &cents)
			if txType == "INCOME" {
				monthlyIncomeCents = cents
			} else {
				monthlyExpensesCents = cents
			}
		}
	}

	// Últimas 5 transações
	var recentTxs []any
	txRows, err := h.db.Query(r.Context(), `
		SELECT t.id, t.description, t.amount_cents, t.type, t.date,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1 AND t.is_active = true
		ORDER BY t.date DESC LIMIT 5
	`, claims.UserID)
	if err == nil {
		defer txRows.Close()
		for txRows.Next() {
			var id, description, txType string
			var categoryName, categoryColor *string
			var amountCents int64
			var date any
			txRows.Scan(&id, &description, &amountCents, &txType, &date, &categoryName, &categoryColor)
			recentTxs = append(recentTxs, map[string]any{
				"id":          id,
				"description": description,
				"amount":      money.ToReais(amountCents),
				"type":        txType,
				"date":        date,
				"category": map[string]any{
					"name":  categoryName,
					"color": categoryColor,
				},
			})
		}
	}

	// Cash flow últimos 7 dias
	var cashFlow []any
	cfRows, err := h.db.Query(r.Context(), `
		SELECT DATE(date) AS day, SUM(amount_cents) AS total
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND affects_account = true
		  AND date >= NOW() - INTERVAL '7 days'
		GROUP BY DATE(date)
		ORDER BY day
	`, claims.UserID)
	if err == nil {
		defer cfRows.Close()
		for cfRows.Next() {
			var day any
			var totalCents int64
			cfRows.Scan(&day, &totalCents)
			cashFlow = append(cashFlow, map[string]any{
				"day":   day,
				"value": money.ToReais(totalCents),
			})
		}
	}

	if recentTxs == nil {
		recentTxs = []any{}
	}
	if cashFlow == nil {
		cashFlow = []any{}
	}

	result := map[string]any{
		"userName":           userName,
		"month":              month,
		"totalBalance":       money.ToReais(totalBalanceCents),
		"monthlyIncome":      money.ToReais(monthlyIncomeCents),
		"monthlyExpenses":    money.ToReais(monthlyExpensesCents),
		"safeToSpend":        money.ToReais(totalBalanceCents - monthlyExpensesCents),
		"recentTransactions": recentTxs,
		"cashFlow":           cashFlow,
	}

	h.cache.Set(cacheKey, result, 3*time.Minute)
	writeJSON(w, http.StatusOK, result)
}
