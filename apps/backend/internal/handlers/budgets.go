package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/models"
	"github.com/nilbyte/mirante/backend/internal/money"
)

type createBudgetDto struct {
	CategoryID *string `json:"categoryId"`
	Amount     float64 `json:"amount"`
	Month      int     `json:"month"`
	Year       int     `json:"year"`
	Notes      *string `json:"notes"`
}

func (d *createBudgetDto) validate() error {
	if d.Amount <= 0 {
		return errors.New("amount must be > 0")
	}
	if d.Month < 1 || d.Month > 12 {
		return errors.New("month must be between 1 and 12")
	}
	if d.Year < 2000 {
		return errors.New("year must be >= 2000")
	}
	return nil
}

func budgetResponse(b models.Budget) map[string]any {
	return map[string]any{
		"id":         b.ID,
		"userId":     b.UserID,
		"categoryId": b.CategoryID,
		"amount":     money.ToReais(b.AmountCents),
		"month":      b.Month,
		"year":       b.Year,
		"notes":      b.Notes,
		"isActive":   b.IsActive,
		"createdAt":  b.CreatedAt,
		"updatedAt":  b.UpdatedAt,
	}
}

func (h *Handler) ListBudgets(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	q := r.URL.Query()

	month := q.Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	monthDate := month + "-01"

	rows, err := h.db.Query(r.Context(), `
		SELECT id, user_id, category_id, amount_cents, month, year, notes,
		       is_active, deleted_at, created_at, updated_at
		FROM budgets
		WHERE user_id = $1
		  AND is_active = true
		  AND month = EXTRACT(MONTH FROM $2::date)
		  AND year  = EXTRACT(YEAR  FROM $2::date)
		ORDER BY created_at ASC
	`, claims.UserID, monthDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var budgets []any
	for rows.Next() {
		var b models.Budget
		if err := rows.Scan(&b.ID, &b.UserID, &b.CategoryID, &b.AmountCents, &b.Month, &b.Year,
			&b.Notes, &b.IsActive, &b.DeletedAt, &b.CreatedAt, &b.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		budgets = append(budgets, budgetResponse(b))
	}

	if budgets == nil {
		budgets = []any{}
	}
	writeJSON(w, http.StatusOK, budgets)
}

func (h *Handler) GetBudget(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var b models.Budget
	if err := h.db.QueryRow(r.Context(), `
		SELECT id, user_id, category_id, amount_cents, month, year, notes,
		       is_active, deleted_at, created_at, updated_at
		FROM budgets
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, id, claims.UserID).Scan(&b.ID, &b.UserID, &b.CategoryID, &b.AmountCents, &b.Month, &b.Year,
		&b.Notes, &b.IsActive, &b.DeletedAt, &b.CreatedAt, &b.UpdatedAt); err != nil {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}

	writeJSON(w, http.StatusOK, budgetResponse(b))
}

func (h *Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto createBudgetDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	amountCents := money.ToCents(dto.Amount)

	var b models.Budget
	if err := h.db.QueryRow(r.Context(), `
		INSERT INTO budgets (user_id, category_id, amount_cents, month, year, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, category_id, month, year)
		  DO UPDATE SET amount_cents = EXCLUDED.amount_cents,
		                notes = EXCLUDED.notes,
		                updated_at = NOW()
		RETURNING id, user_id, category_id, amount_cents, month, year, notes,
		          is_active, deleted_at, created_at, updated_at
	`, claims.UserID, dto.CategoryID, amountCents, dto.Month, dto.Year, dto.Notes,
	).Scan(&b.ID, &b.UserID, &b.CategoryID, &b.AmountCents, &b.Month, &b.Year,
		&b.Notes, &b.IsActive, &b.DeletedAt, &b.CreatedAt, &b.UpdatedAt); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, budgetResponse(b))
}

func (h *Handler) UpdateBudget(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var dto createBudgetDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var amountCents *int64
	if dto.Amount > 0 {
		c := money.ToCents(dto.Amount)
		amountCents = &c
	}

	var b models.Budget
	if err := h.db.QueryRow(r.Context(), `
		UPDATE budgets SET
			amount_cents = COALESCE($1, amount_cents),
			notes        = COALESCE($2, notes),
			updated_at   = NOW()
		WHERE id = $3 AND user_id = $4 AND is_active = true
		RETURNING id, user_id, category_id, amount_cents, month, year, notes,
		          is_active, deleted_at, created_at, updated_at
	`, amountCents, dto.Notes, id, claims.UserID,
	).Scan(&b.ID, &b.UserID, &b.CategoryID, &b.AmountCents, &b.Month, &b.Year,
		&b.Notes, &b.IsActive, &b.DeletedAt, &b.CreatedAt, &b.UpdatedAt); err != nil {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}

	writeJSON(w, http.StatusOK, budgetResponse(b))
}

func (h *Handler) DeleteBudget(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	now := time.Now()
	tag, err := h.db.Exec(r.Context(), `
		UPDATE budgets SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND is_active = true
	`, now, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetBudgetsStatus(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	q := r.URL.Query()

	month := q.Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	monthDate := month + "-01"

	rows, err := h.db.Query(r.Context(), `
		WITH spent AS (
			SELECT category_id, SUM(amount_cents) AS spent_cents
			FROM transactions
			WHERE user_id = $1
			  AND is_active = true
			  AND affects_account = true
			  AND type = 'EXPENSE'
			  AND classification != 'TRANSFER'
			  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
			GROUP BY category_id
		)
		SELECT b.id, b.user_id, b.category_id, b.amount_cents, b.month, b.year,
		       b.notes, b.is_active, b.deleted_at, b.created_at, b.updated_at,
		       c.name, c.color,
		       COALESCE(s.spent_cents, 0) AS spent_cents
		FROM budgets b
		LEFT JOIN categories c ON c.id = b.category_id
		LEFT JOIN spent s ON s.category_id IS NOT DISTINCT FROM b.category_id
		WHERE b.user_id = $1
		  AND b.month = EXTRACT(MONTH FROM $2::date)
		  AND b.year  = EXTRACT(YEAR  FROM $2::date)
		  AND b.is_active = true
		ORDER BY b.created_at ASC
	`, claims.UserID, monthDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var statuses []any
	for rows.Next() {
		var bs models.BudgetStatus
		if err := rows.Scan(
			&bs.ID, &bs.UserID, &bs.CategoryID, &bs.AmountCents, &bs.Month, &bs.Year,
			&bs.Notes, &bs.IsActive, &bs.DeletedAt, &bs.CreatedAt, &bs.UpdatedAt,
			&bs.CategoryName, &bs.CategoryColor, &bs.SpentCents,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		bs.RemainingCents = bs.AmountCents - bs.SpentCents
		if bs.AmountCents > 0 {
			bs.PercentUsed = float64(bs.SpentCents) / float64(bs.AmountCents) * 100
		}
		bs.IsOverBudget = bs.SpentCents > bs.AmountCents

		statuses = append(statuses, map[string]any{
			"id":             bs.ID,
			"categoryId":     bs.CategoryID,
			"categoryName":   bs.CategoryName,
			"categoryColor":  bs.CategoryColor,
			"amount":         money.ToReais(bs.AmountCents),
			"spent":          money.ToReais(bs.SpentCents),
			"remaining":      money.ToReais(bs.RemainingCents),
			"percentUsed":    bs.PercentUsed,
			"isOverBudget":   bs.IsOverBudget,
			"month":          bs.Month,
			"year":           bs.Year,
		})
	}

	if statuses == nil {
		statuses = []any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"month":   month,
		"budgets": statuses,
	})
}
