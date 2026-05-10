package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/nilbyte/personalledger/backend/internal/middleware"
	"github.com/nilbyte/personalledger/backend/internal/models"
	"github.com/nilbyte/personalledger/backend/internal/money"
)

type budgetItemDto struct {
	Name       string  `json:"name"`
	CategoryID *string `json:"categoryId"`
	SortOrder  *int    `json:"sortOrder"`
}

type upsertBudgetDto struct {
	Name       string          `json:"name"`
	TargetDate string          `json:"targetDate"`
	Notes      *string         `json:"notes"`
	Items      []budgetItemDto `json:"items"`
}

func (d *upsertBudgetDto) validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return errors.New("name is required")
	}
	if len(strings.TrimSpace(d.Name)) > 120 {
		return errors.New("name max 120 chars")
	}
	if d.TargetDate == "" {
		return errors.New("targetDate is required")
	}
	if _, err := time.Parse("2006-01-02", d.TargetDate); err != nil {
		return errors.New("targetDate must use YYYY-MM-DD")
	}
	if len(d.Items) == 0 {
		return errors.New("at least one item is required")
	}
	validItems := 0
	for _, item := range d.Items {
		if strings.TrimSpace(item.Name) == "" {
			return errors.New("item name is required")
		}
		validItems++
	}
	if validItems == 0 {
		return errors.New("at least one item is required")
	}
	return nil
}

type budgetQuerier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}

func budgetResponse(plan models.Budget, items []models.BudgetItem, budgetedCents, spentCents int64, budgetedByItem, spentByItem map[string]int64) map[string]any {
	itemResponses := make([]map[string]any, 0, len(items))

	sort.Slice(items, func(i, j int) bool {
		if items[i].SortOrder == items[j].SortOrder {
			return items[i].CreatedAt.Before(items[j].CreatedAt)
		}
		return items[i].SortOrder < items[j].SortOrder
	})

	for _, item := range items {
		budgeted := budgetedByItem[item.ID]
		spent := spentByItem[item.ID]
		remaining := budgeted - spent
		progress := 0.0
		if budgeted > 0 {
			progress = float64(spent) / float64(budgeted) * 100
		}

		itemResponses = append(itemResponses, map[string]any{
			"id":             item.ID,
			"budgetId":       item.BudgetID,
			"categoryId":     item.CategoryID,
			"name":           item.Name,
			"amount":         money.ToReais(budgeted),
			"amountCents":    budgeted,
			"spent":          money.ToReais(spent),
			"spentCents":     spent,
			"remaining":      money.ToReais(remaining),
			"remainingCents": remaining,
			"progress":       progress,
			"sortOrder":      item.SortOrder,
		})
	}

	remaining := budgetedCents - spentCents
	progress := 0.0
	if budgetedCents > 0 {
		progress = float64(spentCents) / float64(budgetedCents) * 100
	}

	return map[string]any{
		"id":             plan.ID,
		"userId":         plan.UserID,
		"name":           plan.Name,
		"targetDate":     plan.TargetDate.Format("2006-01-02"),
		"notes":          plan.Notes,
		"isActive":       plan.IsActive,
		"deletedAt":      plan.DeletedAt,
		"createdAt":      plan.CreatedAt,
		"updatedAt":      plan.UpdatedAt,
		"total":          money.ToReais(budgetedCents),
		"totalCents":     budgetedCents,
		"spent":          money.ToReais(spentCents),
		"spentCents":     spentCents,
		"remaining":      money.ToReais(remaining),
		"remainingCents": remaining,
		"progress":       progress,
		"items":          itemResponses,
	}
}

func (h *Handler) ListBudgets(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	plans, err := h.loadBudgets(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, plans)
}

func (h *Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto upsertBudgetDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	targetDate, _ := time.Parse("2006-01-02", dto.TargetDate)

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	var plan models.Budget
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO budgets (user_id, name, target_date, notes, is_active)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id, user_id, name, target_date, notes, is_active, deleted_at, created_at, updated_at
	`, claims.UserID, dto.Name, targetDate, dto.Notes).Scan(
		&plan.ID, &plan.UserID, &plan.Name, &plan.TargetDate, &plan.Notes, &plan.IsActive,
		&plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt,
	); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := insertBudgetItems(r.Context(), tx, plan.ID, dto.Items); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	created, err := h.loadBudgetByID(r.Context(), claims.UserID, plan.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) UpdateBudget(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
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

	targetDate, _ := time.Parse("2006-01-02", dto.TargetDate)
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	res, err := tx.Exec(r.Context(), `
		UPDATE budgets SET
			name = $1,
			target_date = $2,
			notes = $3,
			is_active = true,
			deleted_at = NULL,
			updated_at = NOW()
		WHERE id = $4 AND user_id = $5
	`, dto.Name, targetDate, dto.Notes, id, claims.UserID)
	if err != nil || res.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}

	if _, err := tx.Exec(r.Context(), `DELETE FROM budget_items WHERE budget_id = $1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := insertBudgetItems(r.Context(), tx, id, dto.Items); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	updated, err := h.loadBudgetByID(r.Context(), claims.UserID, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteBudget(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
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

func insertBudgetItems(ctx context.Context, q budgetQuerier, budgetID string, items []budgetItemDto) error {
	for idx, item := range items {
		sortOrder := idx
		if item.SortOrder != nil {
			sortOrder = *item.SortOrder
		}
		if _, err := q.Exec(ctx, `
			INSERT INTO budget_items (budget_id, category_id, name, sort_order, is_active)
			VALUES ($1, $2, $3, $4, true)
		`, budgetID, item.CategoryID, strings.TrimSpace(item.Name), sortOrder); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) loadBudgets(ctx context.Context, userID string) ([]any, error) {
	rows, err := h.db.Query(ctx, `
		SELECT id, user_id, name, target_date, notes, is_active, deleted_at, created_at, updated_at
		FROM budgets
		WHERE user_id = $1
		  AND is_active = true
		ORDER BY target_date ASC, name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	plans := make([]models.Budget, 0)
	planIDs := make([]string, 0)
	for rows.Next() {
		var plan models.Budget
		if err := rows.Scan(
			&plan.ID, &plan.UserID, &plan.Name, &plan.TargetDate, &plan.Notes, &plan.IsActive,
			&plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt,
		); err != nil {
			return nil, err
		}
		plans = append(plans, plan)
		planIDs = append(planIDs, plan.ID)
	}

	if len(plans) == 0 {
		return []any{}, nil
	}

	spentByPlan := map[string]int64{}
	budgetedByPlan := map[string]int64{}
	spentRows, err := h.db.Query(ctx, `
		SELECT budget_id,
		       SUM(CASE WHEN type = 'INCOME' THEN amount_cents ELSE 0 END) as budgeted_cents,
		       SUM(CASE WHEN type = 'EXPENSE' THEN amount_cents ELSE 0 END) as spent_cents
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND status = 'COMPLETED'
		  AND budget_id = ANY($2::text[])
		GROUP BY budget_id
	`, userID, planIDs)
	if err != nil {
		return nil, err
	}
	defer spentRows.Close()
	for spentRows.Next() {
		var budgetID string
		var budgeted, spent int64
		if err := spentRows.Scan(&budgetID, &budgeted, &spent); err != nil {
			return nil, err
		}
		spentByPlan[budgetID] = spent
		budgetedByPlan[budgetID] = budgeted
	}

	spentByItem := map[string]int64{}
	budgetedByItem := map[string]int64{}
	itemRows, err := h.db.Query(ctx, `
		SELECT i.id, i.budget_id, i.category_id, i.name, i.sort_order,
		       i.is_active, i.deleted_at, i.created_at, i.updated_at,
		       COALESCE(s.budgeted_cents, 0),
		       COALESCE(s.spent_cents, 0)
		FROM budget_items i
		LEFT JOIN (
			SELECT budget_item_id,
			       SUM(CASE WHEN type = 'INCOME' THEN amount_cents ELSE 0 END) AS budgeted_cents,
			       SUM(CASE WHEN type = 'EXPENSE' THEN amount_cents ELSE 0 END) AS spent_cents
			FROM transactions
			WHERE user_id = $1
			  AND is_active = true
			  AND status = 'COMPLETED'
			  AND budget_id = ANY($2::text[])
			  AND budget_item_id IS NOT NULL
			GROUP BY budget_item_id
		) s ON s.budget_item_id = i.id
		WHERE i.budget_id = ANY($2::text[])
			AND i.is_active = true
		ORDER BY i.sort_order ASC, i.created_at ASC
		`, userID, planIDs)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	itemsByPlan := map[string][]models.BudgetItem{}
	for itemRows.Next() {
		var item models.BudgetItem
		var budgeted, spent int64
		if err := itemRows.Scan(
			&item.ID, &item.BudgetID, &item.CategoryID, &item.Name, &item.SortOrder,
			&item.IsActive, &item.DeletedAt, &item.CreatedAt, &item.UpdatedAt, &budgeted, &spent,
		); err != nil {
			return nil, err
		}
		itemsByPlan[item.BudgetID] = append(itemsByPlan[item.BudgetID], item)
		spentByItem[item.ID] = spent
		budgetedByItem[item.ID] = budgeted
	}

	result := make([]any, 0, len(plans))
	for _, plan := range plans {
		result = append(result, budgetResponse(plan, itemsByPlan[plan.ID], budgetedByPlan[plan.ID], spentByPlan[plan.ID], budgetedByItem, spentByItem))
	}
	return result, nil
}

func (h *Handler) loadBudgetByID(ctx context.Context, userID, budgetID string) (map[string]any, error) {
	plans, err := h.loadBudgets(ctx, userID)
	if err != nil {
		return nil, err
	}
	for _, plan := range plans {
		if m, ok := plan.(map[string]any); ok && m["id"] == budgetID {
			return m, nil
		}
	}
	return nil, errors.New("budget not found")
}
