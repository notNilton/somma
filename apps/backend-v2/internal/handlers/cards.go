package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/nilbyte/mirante/backend-v2/internal/middleware"
	"github.com/nilbyte/mirante/backend-v2/internal/models"
	"github.com/nilbyte/mirante/backend-v2/internal/money"
)

type createCardDto struct {
	AccountID   string   `json:"accountId"`
	Name        string   `json:"name"`
	Brand       *string  `json:"brand"`
	Last4       *string  `json:"last4"`
	Type        string   `json:"type"`
	CreditLimit *float64 `json:"creditLimit"`
	Color       *string  `json:"color"`
	Icon        *string  `json:"icon"`
	ClosingDay  *int     `json:"closingDay"`
	DueDay      *int     `json:"dueDay"`
}

func (d *createCardDto) validate() error {
	if d.AccountID == "" {
		return errors.New("accountId is required")
	}
	if d.Name == "" {
		return errors.New("name is required")
	}
	if len(d.Name) > 100 {
		return errors.New("name max 100 chars")
	}
	if !models.ValidCardTypes[d.Type] {
		return errors.New("type must be CREDIT or DEBIT")
	}
	if d.Last4 != nil && len(*d.Last4) > 4 {
		return errors.New("last4 max 4 chars")
	}
	return nil
}

func (h *Handler) ListCards(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT c.id, c.account_id, c.user_id, c.name, c.brand, c.last4, c.type,
		       c.credit_limit_cents, c.color, c.icon, c.closing_day, c.due_day,
		       c.is_active, c.deleted_at, c.created_at, c.updated_at
		FROM cards c
		WHERE c.user_id = $1 AND c.is_active = true
		ORDER BY c.created_at ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var cards []any
	for rows.Next() {
		var c models.Card
		if err := rows.Scan(
			&c.ID, &c.AccountID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.Type,
			&c.CreditLimitCents, &c.Color, &c.Icon, &c.ClosingDay, &c.DueDay,
			&c.IsActive, &c.DeletedAt, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		cards = append(cards, cardResponse(c))
	}

	if cards == nil {
		cards = []any{}
	}
	writeJSON(w, http.StatusOK, cards)
}

func (h *Handler) GetCard(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var c models.Card
	err := h.db.QueryRow(r.Context(), `
		SELECT id, account_id, user_id, name, brand, last4, type,
		       credit_limit_cents, color, icon, closing_day, due_day,
		       is_active, deleted_at, created_at, updated_at
		FROM cards
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, id, claims.UserID).Scan(
		&c.ID, &c.AccountID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.Type,
		&c.CreditLimitCents, &c.Color, &c.Icon, &c.ClosingDay, &c.DueDay,
		&c.IsActive, &c.DeletedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}

	writeJSON(w, http.StatusOK, cardResponse(c))
}

func (h *Handler) CreateCard(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto createCardDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var c models.Card
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO cards (account_id, user_id, name, brand, last4, type, credit_limit_cents, color, icon, closing_day, due_day)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, account_id, user_id, name, brand, last4, type,
		          credit_limit_cents, color, icon, closing_day, due_day,
		          is_active, deleted_at, created_at, updated_at
	`,
		dto.AccountID, claims.UserID, dto.Name, dto.Brand, dto.Last4, dto.Type,
		money.ToCentsPtr(dto.CreditLimit), dto.Color, dto.Icon, dto.ClosingDay, dto.DueDay,
	).Scan(
		&c.ID, &c.AccountID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.Type,
		&c.CreditLimitCents, &c.Color, &c.Icon, &c.ClosingDay, &c.DueDay,
		&c.IsActive, &c.DeletedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, cardResponse(c))
}

func (h *Handler) UpdateCard(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var dto createCardDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var c models.Card
	err := h.db.QueryRow(r.Context(), `
		UPDATE cards SET
			name               = COALESCE(NULLIF($1,''), name),
			brand              = COALESCE($2, brand),
			last4              = COALESCE($3, last4),
			type               = COALESCE(NULLIF($4,''), type),
			credit_limit_cents = COALESCE($5, credit_limit_cents),
			color              = COALESCE($6, color),
			icon               = COALESCE($7, icon),
			closing_day        = COALESCE($8, closing_day),
			due_day            = COALESCE($9, due_day),
			updated_at         = NOW()
		WHERE id = $10 AND user_id = $11 AND is_active = true
		RETURNING id, account_id, user_id, name, brand, last4, type,
		          credit_limit_cents, color, icon, closing_day, due_day,
		          is_active, deleted_at, created_at, updated_at
	`,
		dto.Name, dto.Brand, dto.Last4, dto.Type,
		money.ToCentsPtr(dto.CreditLimit), dto.Color, dto.Icon,
		dto.ClosingDay, dto.DueDay, id, claims.UserID,
	).Scan(
		&c.ID, &c.AccountID, &c.UserID, &c.Name, &c.Brand, &c.Last4, &c.Type,
		&c.CreditLimitCents, &c.Color, &c.Icon, &c.ClosingDay, &c.DueDay,
		&c.IsActive, &c.DeletedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}

	writeJSON(w, http.StatusOK, cardResponse(c))
}

func (h *Handler) DeleteCard(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	now := time.Now()
	tag, err := h.db.Exec(r.Context(), `
		UPDATE cards SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND is_active = true
	`, now, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func cardResponse(c models.Card) map[string]any {
	return map[string]any{
		"id":          c.ID,
		"accountId":   c.AccountID,
		"userId":      c.UserID,
		"name":        c.Name,
		"brand":       c.Brand,
		"last4":       c.Last4,
		"type":        c.Type,
		"creditLimit": money.ToReaisPtr(c.CreditLimitCents),
		"color":       c.Color,
		"icon":        c.Icon,
		"closingDay":  c.ClosingDay,
		"dueDay":      c.DueDay,
		"isActive":    c.IsActive,
		"createdAt":   c.CreatedAt,
		"updatedAt":   c.UpdatedAt,
	}
}
