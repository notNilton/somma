package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/models"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

type upsertBudgetDto struct {
	Name            string  `json:"name"`
	AllocatedAmount float64 `json:"allocatedAmount"`
	Notes           *string `json:"notes"`
}

func (d *upsertBudgetDto) validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return errors.New("name is required")
	}
	if len(strings.TrimSpace(d.Name)) > 120 {
		return errors.New("name max 120 chars")
	}
	if d.AllocatedAmount < 0 {
		return errors.New("allocatedAmount must be >= 0")
	}
	return nil
}

func budgetResponse(plan models.Budget, spentCents int64) map[string]any {
	remaining := plan.AllocatedAmountCents - spentCents
	progress := 0.0
	if plan.AllocatedAmountCents > 0 {
		progress = float64(spentCents) / float64(plan.AllocatedAmountCents) * 100
	}

	return map[string]any{
		"id":                   plan.ID,
		"userId":               plan.UserID,
		"name":                 plan.Name,
		"allocatedAmount":      money.ToReais(plan.AllocatedAmountCents),
		"allocatedAmountCents": plan.AllocatedAmountCents,
		"spent":                money.ToReais(spentCents),
		"spentCents":           spentCents,
		"remaining":            money.ToReais(remaining),
		"remainingCents":       remaining,
		"progress":             progress,
		"notes":                plan.Notes,
		"isActive":             plan.IsActive,
		"deletedAt":            plan.DeletedAt,
		"createdAt":            plan.CreatedAt,
		"updatedAt":            plan.UpdatedAt,
	}
}

func (h *Handler) ListBudgets(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT b.id, b.user_id, b.name, b.allocated_amount_cents, b.notes, b.is_active, b.deleted_at, b.created_at, b.updated_at,
		       COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0) AS spent_cents
		FROM budgets b
		LEFT JOIN transactions t
		  ON t.budget_id = b.id
		 AND t.user_id = b.user_id
		 AND t.is_active = true
		 AND t.status = 'COMPLETED'
		WHERE b.user_id = $1
		  AND b.is_active = true
		GROUP BY b.id, b.user_id, b.name, b.allocated_amount_cents, b.notes, b.is_active, b.deleted_at, b.created_at, b.updated_at
		ORDER BY b.name ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	result := make([]any, 0)
	for rows.Next() {
		var plan models.Budget
		var spentCents int64
		if err := rows.Scan(
			&plan.ID, &plan.UserID, &plan.Name, &plan.AllocatedAmountCents, &plan.Notes, &plan.IsActive,
			&plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt, &spentCents,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		result = append(result, budgetResponse(plan, spentCents))
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto upsertBudgetDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var plan models.Budget
	if err := h.db.QueryRow(r.Context(), `
		INSERT INTO budgets (user_id, name, allocated_amount_cents, notes, is_active)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id, user_id, name, allocated_amount_cents, notes, is_active, deleted_at, created_at, updated_at
	`, claims.UserID, strings.TrimSpace(dto.Name), money.ToCents(dto.AllocatedAmount), dto.Notes).Scan(
		&plan.ID, &plan.UserID, &plan.Name, &plan.AllocatedAmountCents, &plan.Notes, &plan.IsActive,
		&plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt,
	); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, budgetResponse(plan, 0))
}

func (h *Handler) UpdateBudget(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	var dto upsertBudgetDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var plan models.Budget
	var spentCents int64
	err := h.db.QueryRow(r.Context(), `
		WITH updated AS (
			UPDATE budgets
			SET name = $1,
			    allocated_amount_cents = $2,
			    notes = $3,
			    is_active = true,
			    deleted_at = NULL,
			    updated_at = NOW()
			WHERE id = $4 AND user_id = $5
			RETURNING id, user_id, name, allocated_amount_cents, notes, is_active, deleted_at, created_at, updated_at
		)
		SELECT u.id, u.user_id, u.name, u.allocated_amount_cents, u.notes, u.is_active, u.deleted_at, u.created_at, u.updated_at,
		       COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0) AS spent_cents
		FROM updated u
		LEFT JOIN transactions t
		  ON t.budget_id = u.id
		 AND t.user_id = u.user_id
		 AND t.is_active = true
		 AND t.status = 'COMPLETED'
		GROUP BY u.id, u.user_id, u.name, u.allocated_amount_cents, u.notes, u.is_active, u.deleted_at, u.created_at, u.updated_at
	`, strings.TrimSpace(dto.Name), money.ToCents(dto.AllocatedAmount), dto.Notes, id, claims.UserID).Scan(
		&plan.ID, &plan.UserID, &plan.Name, &plan.AllocatedAmountCents, &plan.Notes, &plan.IsActive,
		&plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt, &spentCents,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}

	writeJSON(w, http.StatusOK, budgetResponse(plan, spentCents))
}

func (h *Handler) DeleteBudget(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	tag, err := h.db.Exec(r.Context(), `
		UPDATE budgets
		SET is_active = false, deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2
	`, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
