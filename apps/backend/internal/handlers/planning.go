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

type createPlanningPlanDto struct {
	Name         string  `json:"name"`
	TargetAmount float64 `json:"targetAmount"`
	TargetDate   *string `json:"targetDate"`
	Status       string  `json:"status"`
	Notes        *string `json:"notes"`
	Color        *string `json:"color"`
	Icon         *string `json:"icon"`
}

type updatePlanningPlanDto struct {
	Name         *string  `json:"name"`
	TargetAmount *float64 `json:"targetAmount"`
	TargetDate   *string  `json:"targetDate"`
	Status       *string  `json:"status"`
	Notes        *string  `json:"notes"`
	Color        *string  `json:"color"`
	Icon         *string  `json:"icon"`
}

type createPlanningItemDto struct {
	CategoryID      *string `json:"categoryId"`
	Name            string  `json:"name"`
	EstimatedAmount float64 `json:"estimatedAmount"`
	Notes           *string `json:"notes"`
}

type updatePlanningItemDto struct {
	CategoryID      *string  `json:"categoryId"`
	Name            *string  `json:"name"`
	EstimatedAmount *float64 `json:"estimatedAmount"`
	Notes           *string  `json:"notes"`
}

type createContributionDto struct {
	Amount           float64 `json:"amount"`
	ContributionDate string  `json:"contributionDate"`
	Notes            *string `json:"notes"`
}

type updateContributionDto struct {
	Amount           *float64 `json:"amount"`
	ContributionDate *string  `json:"contributionDate"`
	Notes            *string  `json:"notes"`
}

type planningTransactionSummary struct {
	ID             string
	AccountID      string
	UserID         string
	PlanningPlanID *string
	CategoryID     *string
	Type           string
	Classification string
	Channel        string
	AmountCents    int64
	Date           time.Time
	Description    string
	CategoryName   *string
	CategoryColor  *string
	AccountName    *string
}

func (d *createPlanningPlanDto) validate() error {
	if d.Name == "" {
		return errors.New("name is required")
	}
	if len(d.Name) > 120 {
		return errors.New("name max 120 chars")
	}
	if d.TargetAmount <= 0 {
		return errors.New("targetAmount must be > 0")
	}
	if d.Status != "" && !models.ValidPlanningStatuses[d.Status] {
		return errors.New("invalid status")
	}
	return nil
}

func (d *createPlanningItemDto) validate() error {
	if d.Name == "" {
		return errors.New("name is required")
	}
	if d.EstimatedAmount <= 0 {
		return errors.New("estimatedAmount must be > 0")
	}
	return nil
}

func (d *createContributionDto) validate() error {
	if d.Amount <= 0 {
		return errors.New("amount must be > 0")
	}
	if d.ContributionDate == "" {
		return errors.New("contributionDate is required")
	}
	return nil
}

func parseOptionalDate(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	if *value == "" {
		return nil, nil
	}
	if len(*value) < 10 {
		return nil, errors.New("invalid date format, use YYYY-MM-DD")
	}
	parsedDate, err := time.Parse("2006-01-02", (*value)[:10])
	if err != nil {
		return nil, errors.New("invalid date format, use YYYY-MM-DD")
	}
	date := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC)
	return &date, nil
}

func planningPlanResponse(plan models.PlanningPlanSummary) map[string]any {
	progress := 0.0
	if plan.TargetAmountCents > 0 {
		progress = float64(plan.ContributedTotalCents) / float64(plan.TargetAmountCents) * 100
	}

	return map[string]any{
		"id":                    plan.ID,
		"userId":                plan.UserID,
		"name":                  plan.Name,
		"targetAmount":          money.ToReais(plan.TargetAmountCents),
		"targetDate":            plan.TargetDate,
		"status":                plan.Status,
		"notes":                 plan.Notes,
		"color":                 plan.Color,
		"icon":                  plan.Icon,
		"estimatedTotal":        money.ToReais(plan.EstimatedTotalCents),
		"contributedTotal":      money.ToReais(plan.ContributedTotalCents),
		"remainingToContribute": money.ToReais(maxInt64(plan.TargetAmountCents-plan.ContributedTotalCents, 0)),
		"itemCount":             plan.ItemCount,
		"contributionCount":     plan.ContributionCount,
		"lastContributionDate":  plan.LastContributionDate,
		"progressPercent":       progress,
		"isActive":              plan.IsActive,
		"createdAt":             plan.CreatedAt,
		"updatedAt":             plan.UpdatedAt,
	}
}

func planningItemResponse(item models.PlanningPlanItemWithCategory) map[string]any {
	return map[string]any{
		"id":              item.ID,
		"planId":          item.PlanID,
		"categoryId":      item.CategoryID,
		"name":            item.Name,
		"estimatedAmount": money.ToReais(item.EstimatedAmountCents),
		"notes":           item.Notes,
		"sortOrder":       item.SortOrder,
		"category": map[string]any{
			"id":    item.CategoryID,
			"name":  item.CategoryName,
			"color": item.CategoryColor,
		},
		"createdAt": item.CreatedAt,
		"updatedAt": item.UpdatedAt,
	}
}

func contributionResponse(contribution models.PlanningContribution) map[string]any {
	return map[string]any{
		"id":               contribution.ID,
		"planId":           contribution.PlanID,
		"amount":           money.ToReais(contribution.AmountCents),
		"contributionDate": contribution.ContributionDate,
		"notes":            contribution.Notes,
		"createdAt":        contribution.CreatedAt,
		"updatedAt":        contribution.UpdatedAt,
	}
}

func planningTransactionResponse(t planningTransactionSummary) map[string]any {
	return map[string]any{
		"id":             t.ID,
		"accountId":      t.AccountID,
		"userId":         t.UserID,
		"planningPlanId": t.PlanningPlanID,
		"categoryId":     t.CategoryID,
		"type":           t.Type,
		"classification": t.Classification,
		"channel":        t.Channel,
		"amount":         money.ToReais(t.AmountCents),
		"date":           t.Date,
		"description":    t.Description,
		"category": map[string]any{
			"id":    t.CategoryID,
			"name":  t.CategoryName,
			"color": t.CategoryColor,
		},
		"account": map[string]any{
			"id":   t.AccountID,
			"name": t.AccountName,
		},
	}
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func (h *Handler) ListPlanningPlans(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT p.id, p.user_id, p.name, p.target_amount_cents, p.target_date, p.status,
		       p.notes, p.color, p.icon, p.is_active, p.deleted_at, p.created_at, p.updated_at,
		       COALESCE(items.estimated_total_cents, 0) AS estimated_total_cents,
		       COALESCE(items.item_count, 0) AS item_count,
		       COALESCE(contrib.contributed_total_cents, 0) AS contributed_total_cents,
		       COALESCE(contrib.contribution_count, 0) AS contribution_count,
		       contrib.last_contribution_date
		FROM planning_plans p
		LEFT JOIN (
			SELECT plan_id, SUM(estimated_amount_cents) AS estimated_total_cents, COUNT(*) AS item_count
			FROM planning_plan_items
			WHERE is_active = true
			GROUP BY plan_id
		) items ON items.plan_id = p.id
		LEFT JOIN (
			SELECT plan_id,
			       SUM(amount_cents) AS contributed_total_cents,
			       COUNT(*) AS contribution_count,
			       MAX(contribution_date) AS last_contribution_date
			FROM planning_contributions
			WHERE is_active = true
			GROUP BY plan_id
		) contrib ON contrib.plan_id = p.id
		WHERE p.user_id = $1 AND p.is_active = true
		ORDER BY p.target_date NULLS LAST, p.created_at DESC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var plans []any
	for rows.Next() {
		var plan models.PlanningPlanSummary
		if err := rows.Scan(
			&plan.ID, &plan.UserID, &plan.Name, &plan.TargetAmountCents, &plan.TargetDate, &plan.Status,
			&plan.Notes, &plan.Color, &plan.Icon, &plan.IsActive, &plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt,
			&plan.EstimatedTotalCents, &plan.ItemCount, &plan.ContributedTotalCents, &plan.ContributionCount, &plan.LastContributionDate,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		plans = append(plans, planningPlanResponse(plan))
	}

	if plans == nil {
		plans = []any{}
	}
	writeJSON(w, http.StatusOK, plans)
}

func (h *Handler) GetPlanningPlan(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var plan models.PlanningPlanSummary
	err := h.db.QueryRow(r.Context(), `
		SELECT p.id, p.user_id, p.name, p.target_amount_cents, p.target_date, p.status,
		       p.notes, p.color, p.icon, p.is_active, p.deleted_at, p.created_at, p.updated_at,
		       COALESCE(items.estimated_total_cents, 0) AS estimated_total_cents,
		       COALESCE(items.item_count, 0) AS item_count,
		       COALESCE(contrib.contributed_total_cents, 0) AS contributed_total_cents,
		       COALESCE(contrib.contribution_count, 0) AS contribution_count,
		       contrib.last_contribution_date
		FROM planning_plans p
		LEFT JOIN (
			SELECT plan_id, SUM(estimated_amount_cents) AS estimated_total_cents, COUNT(*) AS item_count
			FROM planning_plan_items
			WHERE is_active = true
			GROUP BY plan_id
		) items ON items.plan_id = p.id
		LEFT JOIN (
			SELECT plan_id,
			       SUM(amount_cents) AS contributed_total_cents,
			       COUNT(*) AS contribution_count,
			       MAX(contribution_date) AS last_contribution_date
			FROM planning_contributions
			WHERE is_active = true
			GROUP BY plan_id
		) contrib ON contrib.plan_id = p.id
		WHERE p.id = $1 AND p.user_id = $2 AND p.is_active = true
	`, id, claims.UserID).Scan(
		&plan.ID, &plan.UserID, &plan.Name, &plan.TargetAmountCents, &plan.TargetDate, &plan.Status,
		&plan.Notes, &plan.Color, &plan.Icon, &plan.IsActive, &plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt,
		&plan.EstimatedTotalCents, &plan.ItemCount, &plan.ContributedTotalCents, &plan.ContributionCount, &plan.LastContributionDate,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "planning not found")
		return
	}

	itemRows, err := h.db.Query(r.Context(), `
		SELECT i.id, i.plan_id, i.category_id, i.name, i.estimated_amount_cents, i.notes,
		       i.sort_order, i.is_active, i.deleted_at, i.created_at, i.updated_at,
		       c.name, c.color
		FROM planning_plan_items i
		LEFT JOIN categories c ON c.id = i.category_id
		WHERE i.plan_id = $1 AND i.is_active = true
		ORDER BY i.sort_order ASC, i.created_at ASC
	`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer itemRows.Close()

	items := []any{}
	for itemRows.Next() {
		var item models.PlanningPlanItemWithCategory
		if err := itemRows.Scan(
			&item.ID, &item.PlanID, &item.CategoryID, &item.Name, &item.EstimatedAmountCents, &item.Notes,
			&item.SortOrder, &item.IsActive, &item.DeletedAt, &item.CreatedAt, &item.UpdatedAt,
			&item.CategoryName, &item.CategoryColor,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		items = append(items, planningItemResponse(item))
	}

	contributionRows, err := h.db.Query(r.Context(), `
		SELECT id, plan_id, amount_cents, contribution_date, notes, is_active, deleted_at, created_at, updated_at
		FROM planning_contributions
		WHERE plan_id = $1 AND is_active = true
		ORDER BY contribution_date DESC, created_at DESC
	`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer contributionRows.Close()

	contributions := []any{}
	for contributionRows.Next() {
		var contribution models.PlanningContribution
		if err := contributionRows.Scan(
			&contribution.ID, &contribution.PlanID, &contribution.AmountCents, &contribution.ContributionDate,
			&contribution.Notes, &contribution.IsActive, &contribution.DeletedAt, &contribution.CreatedAt, &contribution.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		contributions = append(contributions, contributionResponse(contribution))
	}

	transactionRows, err := h.db.Query(r.Context(), `
		SELECT t.id, t.account_id, t.user_id, t.planning_plan_id, t.category_id,
		       t.type, t.classification, t.channel, t.amount_cents, t.date, t.description,
		       c.name, c.color, a.name
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		LEFT JOIN accounts a ON a.id = t.account_id
		WHERE t.planning_plan_id = $1
		  AND t.user_id = $2
		  AND t.is_active = true
		ORDER BY t.date DESC, t.created_at DESC
	`, id, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer transactionRows.Close()

	transactions := []any{}
	for transactionRows.Next() {
		var transaction planningTransactionSummary
		if err := transactionRows.Scan(
			&transaction.ID, &transaction.AccountID, &transaction.UserID, &transaction.PlanningPlanID, &transaction.CategoryID,
			&transaction.Type, &transaction.Classification, &transaction.Channel, &transaction.AmountCents, &transaction.Date, &transaction.Description,
			&transaction.CategoryName, &transaction.CategoryColor, &transaction.AccountName,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		transactions = append(transactions, planningTransactionResponse(transaction))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"plan":          planningPlanResponse(plan),
		"items":         items,
		"contributions": contributions,
		"transactions":  transactions,
	})
}

func (h *Handler) CreatePlanningPlan(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto createPlanningPlanDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	targetDate, err := parseOptionalDate(dto.TargetDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	status := dto.Status
	if status == "" {
		status = models.PlanningStatusACTIVE
	}

	var plan models.PlanningPlanSummary
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO planning_plans (user_id, name, target_amount_cents, target_date, status, notes, color, icon)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, name, target_amount_cents, target_date, status, notes, color, icon,
		          is_active, deleted_at, created_at, updated_at
	`, claims.UserID, dto.Name, money.ToCents(dto.TargetAmount), targetDate, status, dto.Notes, dto.Color, dto.Icon).Scan(
		&plan.ID, &plan.UserID, &plan.Name, &plan.TargetAmountCents, &plan.TargetDate, &plan.Status,
		&plan.Notes, &plan.Color, &plan.Icon, &plan.IsActive, &plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, planningPlanResponse(plan))
}

func (h *Handler) UpdatePlanningPlan(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var dto updatePlanningPlanDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var targetAmountCents *int64
	if dto.TargetAmount != nil {
		if *dto.TargetAmount <= 0 {
			writeError(w, http.StatusBadRequest, "targetAmount must be > 0")
			return
		}
		cents := money.ToCents(*dto.TargetAmount)
		targetAmountCents = &cents
	}

	var targetDate *time.Time
	if dto.TargetDate != nil {
		parsed, err := parseOptionalDate(dto.TargetDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		targetDate = parsed
	}

	if dto.Status != nil && *dto.Status != "" && !models.ValidPlanningStatuses[*dto.Status] {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	var plan models.PlanningPlanSummary
	err := h.db.QueryRow(r.Context(), `
		UPDATE planning_plans SET
			name                = COALESCE(NULLIF($1, ''), name),
			target_amount_cents = COALESCE($2, target_amount_cents),
			target_date         = COALESCE($3, target_date),
			status              = COALESCE(NULLIF($4, ''), status),
			notes               = COALESCE($5, notes),
			color               = COALESCE($6, color),
			icon                = COALESCE($7, icon),
			updated_at          = NOW()
		WHERE id = $8 AND user_id = $9 AND is_active = true
		RETURNING id, user_id, name, target_amount_cents, target_date, status, notes, color, icon,
		          is_active, deleted_at, created_at, updated_at
	`, dto.Name, targetAmountCents, targetDate, dto.Status, dto.Notes, dto.Color, dto.Icon, id, claims.UserID).Scan(
		&plan.ID, &plan.UserID, &plan.Name, &plan.TargetAmountCents, &plan.TargetDate, &plan.Status,
		&plan.Notes, &plan.Color, &plan.Icon, &plan.IsActive, &plan.DeletedAt, &plan.CreatedAt, &plan.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "planning not found")
		return
	}

	writeJSON(w, http.StatusOK, planningPlanResponse(plan))
}

func (h *Handler) DeletePlanningPlan(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")
	now := time.Now()

	tag, err := h.db.Exec(r.Context(), `
		UPDATE planning_plans
		SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND is_active = true
	`, now, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "planning not found")
		return
	}

	_, _ = h.db.Exec(r.Context(), `
		UPDATE planning_plan_items
		SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE plan_id = $2 AND is_active = true
	`, now, id)
	_, _ = h.db.Exec(r.Context(), `
		UPDATE planning_contributions
		SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE plan_id = $2 AND is_active = true
	`, now, id)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreatePlanningItem(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	planID := r.PathValue("id")

	var dto createPlanningItemDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var item models.PlanningPlanItemWithCategory
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO planning_plan_items (plan_id, category_id, name, estimated_amount_cents, notes, sort_order)
		SELECT p.id, $2, $3, $4, $5,
		       COALESCE((SELECT MAX(sort_order) + 1 FROM planning_plan_items WHERE plan_id = p.id AND is_active = true), 0)
		FROM planning_plans p
		WHERE p.id = $1 AND p.user_id = $6 AND p.is_active = true
		RETURNING id, plan_id, category_id, name, estimated_amount_cents, notes, sort_order,
		          is_active, deleted_at, created_at, updated_at
	`, planID, dto.CategoryID, dto.Name, money.ToCents(dto.EstimatedAmount), dto.Notes, claims.UserID).Scan(
		&item.ID, &item.PlanID, &item.CategoryID, &item.Name, &item.EstimatedAmountCents, &item.Notes, &item.SortOrder,
		&item.IsActive, &item.DeletedAt, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "planning not found")
		return
	}

	if item.CategoryID != nil {
		_ = h.db.QueryRow(r.Context(), `
			SELECT name, color FROM categories WHERE id = $1
		`, *item.CategoryID).Scan(&item.CategoryName, &item.CategoryColor)
	}

	writeJSON(w, http.StatusCreated, planningItemResponse(item))
}

func (h *Handler) UpdatePlanningItem(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	planID := r.PathValue("id")
	itemID := r.PathValue("itemId")

	var dto updatePlanningItemDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var estimatedAmountCents *int64
	if dto.EstimatedAmount != nil {
		if *dto.EstimatedAmount <= 0 {
			writeError(w, http.StatusBadRequest, "estimatedAmount must be > 0")
			return
		}
		cents := money.ToCents(*dto.EstimatedAmount)
		estimatedAmountCents = &cents
	}

	var item models.PlanningPlanItemWithCategory
	err := h.db.QueryRow(r.Context(), `
		UPDATE planning_plan_items i
		SET category_id             = COALESCE($1, i.category_id),
		    name                    = COALESCE(NULLIF($2, ''), i.name),
		    estimated_amount_cents  = COALESCE($3, i.estimated_amount_cents),
		    notes                   = COALESCE($4, i.notes),
		    updated_at              = NOW()
		FROM planning_plans p
		WHERE i.id = $5
		  AND i.plan_id = p.id
		  AND p.id = $6
		  AND p.user_id = $7
		  AND p.is_active = true
		  AND i.is_active = true
		RETURNING i.id, i.plan_id, i.category_id, i.name, i.estimated_amount_cents, i.notes,
		          i.sort_order, i.is_active, i.deleted_at, i.created_at, i.updated_at
	`, dto.CategoryID, dto.Name, estimatedAmountCents, dto.Notes, itemID, planID, claims.UserID).Scan(
		&item.ID, &item.PlanID, &item.CategoryID, &item.Name, &item.EstimatedAmountCents, &item.Notes,
		&item.SortOrder, &item.IsActive, &item.DeletedAt, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "planning item not found")
		return
	}

	if item.CategoryID != nil {
		_ = h.db.QueryRow(r.Context(), `SELECT name, color FROM categories WHERE id = $1`, *item.CategoryID).
			Scan(&item.CategoryName, &item.CategoryColor)
	}

	writeJSON(w, http.StatusOK, planningItemResponse(item))
}

func (h *Handler) DeletePlanningItem(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	planID := r.PathValue("id")
	itemID := r.PathValue("itemId")
	now := time.Now()

	tag, err := h.db.Exec(r.Context(), `
		UPDATE planning_plan_items i
		SET is_active = false, deleted_at = $1, updated_at = NOW()
		FROM planning_plans p
		WHERE i.id = $2
		  AND i.plan_id = p.id
		  AND p.id = $3
		  AND p.user_id = $4
		  AND p.is_active = true
		  AND i.is_active = true
	`, now, itemID, planID, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "planning item not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreatePlanningContribution(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	planID := r.PathValue("id")

	var dto createContributionDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	contributionDate, err := parseOptionalDate(&dto.ContributionDate)
	if err != nil || contributionDate == nil {
		writeError(w, http.StatusBadRequest, "invalid contributionDate")
		return
	}

	var contribution models.PlanningContribution
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO planning_contributions (plan_id, amount_cents, contribution_date, notes)
		SELECT p.id, $2, $3, $4
		FROM planning_plans p
		WHERE p.id = $1 AND p.user_id = $5 AND p.is_active = true
		RETURNING id, plan_id, amount_cents, contribution_date, notes, is_active, deleted_at, created_at, updated_at
	`, planID, money.ToCents(dto.Amount), contributionDate, dto.Notes, claims.UserID).Scan(
		&contribution.ID, &contribution.PlanID, &contribution.AmountCents, &contribution.ContributionDate,
		&contribution.Notes, &contribution.IsActive, &contribution.DeletedAt, &contribution.CreatedAt, &contribution.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "planning not found")
		return
	}

	writeJSON(w, http.StatusCreated, contributionResponse(contribution))
}

func (h *Handler) UpdatePlanningContribution(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	planID := r.PathValue("id")
	contributionID := r.PathValue("contributionId")

	var dto updateContributionDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var amountCents *int64
	if dto.Amount != nil {
		if *dto.Amount <= 0 {
			writeError(w, http.StatusBadRequest, "amount must be > 0")
			return
		}
		cents := money.ToCents(*dto.Amount)
		amountCents = &cents
	}

	var contributionDate *time.Time
	if dto.ContributionDate != nil {
		parsed, err := parseOptionalDate(dto.ContributionDate)
		if err != nil || parsed == nil {
			writeError(w, http.StatusBadRequest, "invalid contributionDate")
			return
		}
		contributionDate = parsed
	}

	var contribution models.PlanningContribution
	err := h.db.QueryRow(r.Context(), `
		UPDATE planning_contributions c
		SET amount_cents = COALESCE($1, c.amount_cents),
		    contribution_date = COALESCE($2, c.contribution_date),
		    notes = COALESCE($3, c.notes),
		    updated_at = NOW()
		FROM planning_plans p
		WHERE c.id = $4
		  AND c.plan_id = p.id
		  AND p.id = $5
		  AND p.user_id = $6
		  AND p.is_active = true
		  AND c.is_active = true
		RETURNING c.id, c.plan_id, c.amount_cents, c.contribution_date, c.notes, c.is_active, c.deleted_at, c.created_at, c.updated_at
	`, amountCents, contributionDate, dto.Notes, contributionID, planID, claims.UserID).Scan(
		&contribution.ID, &contribution.PlanID, &contribution.AmountCents, &contribution.ContributionDate,
		&contribution.Notes, &contribution.IsActive, &contribution.DeletedAt, &contribution.CreatedAt, &contribution.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "contribution not found")
		return
	}

	writeJSON(w, http.StatusOK, contributionResponse(contribution))
}

func (h *Handler) DeletePlanningContribution(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	planID := r.PathValue("id")
	contributionID := r.PathValue("contributionId")
	now := time.Now()

	tag, err := h.db.Exec(r.Context(), `
		UPDATE planning_contributions c
		SET is_active = false, deleted_at = $1, updated_at = NOW()
		FROM planning_plans p
		WHERE c.id = $2
		  AND c.plan_id = p.id
		  AND p.id = $3
		  AND p.user_id = $4
		  AND p.is_active = true
		  AND c.is_active = true
	`, now, contributionID, planID, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "contribution not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
