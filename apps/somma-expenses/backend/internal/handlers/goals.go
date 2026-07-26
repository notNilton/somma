package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
	"github.com/nilbyte/somma/backend/internal/money"
)

type upsertGoalDto struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	TargetAmount float64 `json:"targetAmount"`
	Color       string  `json:"color"`
	TargetDate  *string `json:"targetDate"`
}

func (d *upsertGoalDto) validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return errors.New("name is required")
	}
	if len(d.Name) > 120 {
		return errors.New("name max 120 chars")
	}
	if d.TargetAmount <= 0 {
		return errors.New("targetAmount must be > 0")
	}
	return nil
}

func goalResponse(g models.Goal, savedCents int64) map[string]any {
	pct := 0.0
	if g.TargetAmountCents > 0 {
		pct = float64(savedCents) / float64(g.TargetAmountCents) * 100
		if pct > 100 {
			pct = 100
		}
	}
	r := map[string]any{
		"id":            g.ID,
		"userId":        g.UserID,
		"name":          g.Name,
		"description":   g.Description,
		"targetAmount":  money.ToReais(g.TargetAmountCents),
		"savedAmount":   money.ToReais(savedCents),
		"remaining":     money.ToReais(g.TargetAmountCents - savedCents),
		"progress":      pct,
		"color":         g.Color,
		"isAchieved":    g.IsAchieved,
		"createdAt":     g.CreatedAt,
		"updatedAt":     g.UpdatedAt,
	}
	if g.TargetDate != nil {
		r["targetDate"] = g.TargetDate.Format("2006-01-02")
	}
	return r
}

func (h *Handler) savedCents(r *http.Request, userID, goalID string) int64 {
	var cents int64
	h.db.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM transactions
		WHERE goal_id = $1
		  AND user_id = $2
		  AND is_active = true
		  AND status = 'COMPLETED'
	`, goalID, userID).Scan(&cents)
	return cents
}

func (h *Handler) ListGoals(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id, user_id, name, description, target_amount_cents, color, target_date,
		       is_achieved, is_active, created_at, updated_at
		FROM goals
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	result := make([]any, 0)
	for rows.Next() {
		var g models.Goal
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.Name, &g.Description, &g.TargetAmountCents,
			&g.Color, &g.TargetDate, &g.IsAchieved, &g.IsActive, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			continue
		}
		saved := h.savedCents(r, claims.UserID, g.ID)
		result = append(result, goalResponse(g, saved))
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var dto upsertGoalDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	color := dto.Color
	if color == "" {
		color = "#3b82f6"
	}

	var g models.Goal
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO goals (user_id, name, description, target_amount_cents, color, target_date)
		VALUES ($1,$2,$3,$4,$5,$6::date)
		RETURNING id, user_id, name, description, target_amount_cents, color, target_date,
		          is_achieved, is_active, created_at, updated_at
	`, claims.UserID, strings.TrimSpace(dto.Name), dto.Description,
		money.ToCents(dto.TargetAmount), color, dto.TargetDate,
	).Scan(
		&g.ID, &g.UserID, &g.Name, &g.Description, &g.TargetAmountCents,
		&g.Color, &g.TargetDate, &g.IsAchieved, &g.IsActive, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, goalResponse(g, 0))
}

func (h *Handler) UpdateGoal(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var dto upsertGoalDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	color := dto.Color
	if color == "" {
		color = "#3b82f6"
	}

	var g models.Goal
	err := h.db.QueryRow(r.Context(), `
		UPDATE goals
		SET name = $1, description = $2, target_amount_cents = $3,
		    color = $4, target_date = $5::date, updated_at = NOW()
		WHERE id = $6 AND user_id = $7 AND is_active = true
		RETURNING id, user_id, name, description, target_amount_cents, color, target_date,
		          is_achieved, is_active, created_at, updated_at
	`, strings.TrimSpace(dto.Name), dto.Description, money.ToCents(dto.TargetAmount),
		color, dto.TargetDate, r.PathValue("id"), claims.UserID,
	).Scan(
		&g.ID, &g.UserID, &g.Name, &g.Description, &g.TargetAmountCents,
		&g.Color, &g.TargetDate, &g.IsAchieved, &g.IsActive, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "goal not found")
		return
	}

	saved := h.savedCents(r, claims.UserID, g.ID)
	writeJSON(w, http.StatusOK, goalResponse(g, saved))
}

func (h *Handler) DeleteGoal(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tag, err := h.db.Exec(r.Context(), `
		UPDATE goals SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, r.PathValue("id"), claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "goal not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
