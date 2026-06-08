package handlers

import (
	"net/http"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

func (h *Handler) ListAlerts(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id, budget_id, budget_name, threshold_pct, percent_used,
		       allocated_cents, spent_cents, is_read, created_at
		FROM budget_alerts
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	type alertItem struct {
		ID             string  `json:"id"`
		BudgetID       string  `json:"budgetId"`
		BudgetName     string  `json:"budgetName"`
		ThresholdPct   int     `json:"thresholdPct"`
		PercentUsed    float64 `json:"percentUsed"`
		Allocated      float64 `json:"allocated"`
		AllocatedCents int64   `json:"allocatedCents"`
		Spent          float64 `json:"spent"`
		SpentCents     int64   `json:"spentCents"`
		IsRead         bool    `json:"isRead"`
		CreatedAt      string  `json:"createdAt"`
	}

	items := make([]alertItem, 0)
	for rows.Next() {
		var a alertItem
		var createdAt time.Time
		if err := rows.Scan(
			&a.ID, &a.BudgetID, &a.BudgetName, &a.ThresholdPct, &a.PercentUsed,
			&a.AllocatedCents, &a.SpentCents, &a.IsRead, &createdAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		a.Allocated = money.ToReais(a.AllocatedCents)
		a.Spent = money.ToReais(a.SpentCents)
		a.CreatedAt = createdAt.UTC().Format("2006-01-02T15:04:05Z")
		items = append(items, a)
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) MarkAlertRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id := r.PathValue("id")
	tag, err := h.db.Exec(r.Context(), `
		UPDATE budget_alerts SET is_read = true
		WHERE id = $1 AND user_id = $2
	`, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ClearReadAlerts(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	h.db.Exec(r.Context(), `
		DELETE FROM budget_alerts WHERE user_id = $1 AND is_read = true
	`, claims.UserID)

	w.WriteHeader(http.StatusNoContent)
}
