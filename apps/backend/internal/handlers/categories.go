package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"sort"

	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/models"
)

type createCategoryDto struct {
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	ParentID    *string `json:"parentId"`
}

func (d *createCategoryDto) validate() error {
	if d.Name == "" {
		return errors.New("name is required")
	}
	if len(d.Name) > 50 {
		return errors.New("name max 50 chars")
	}
	if !models.ValidTransactionTypes[d.Type] {
		return errors.New("invalid category type")
	}
	return nil
}

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT id, user_id, name, type, description, color, parent_id, created_at, updated_at
		FROM categories
		WHERE user_id = $1
		ORDER BY name ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	allCats := map[string]*models.CategoryWithChildren{}
	var roots []*models.CategoryWithChildren

	for rows.Next() {
		var c models.Category
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.Color, &c.ParentID, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		cwc := &models.CategoryWithChildren{Category: c, Children: []models.Category{}}
		allCats[c.ID] = cwc
	}

	for _, cwc := range allCats {
		if cwc.ParentID == nil {
			roots = append(roots, cwc)
		} else {
			if parent, ok := allCats[*cwc.ParentID]; ok {
				parent.Children = append(parent.Children, cwc.Category)
			}
		}
	}

	if roots == nil {
		writeJSON(w, http.StatusOK, []any{})
		return
	}

	var result []any
	sort.Slice(roots, func(i, j int) bool {
		return roots[i].Name < roots[j].Name
	})
	for _, r := range roots {
		result = append(result, categoryWithChildrenResponse(r))
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) GetCategory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var c models.Category
	err := h.db.QueryRow(r.Context(), `
		SELECT id, user_id, name, type, description, color, parent_id, created_at, updated_at
		FROM categories WHERE id = $1 AND user_id = $2
	`, id, claims.UserID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.Color, &c.ParentID, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}

	writeJSON(w, http.StatusOK, categoryResponse(c))
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto createCategoryDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var c models.Category
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO categories (user_id, name, type, description, color, parent_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, name, type) DO UPDATE SET
			description = EXCLUDED.description,
			color = EXCLUDED.color,
			updated_at = NOW()
		RETURNING id, user_id, name, type, description, color, parent_id, created_at, updated_at
	`, claims.UserID, dto.Name, dto.Type, dto.Description, dto.Color, dto.ParentID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.Color, &c.ParentID, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, categoryResponse(c))
}

func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var dto createCategoryDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var c models.Category
	err := h.db.QueryRow(r.Context(), `
		UPDATE categories SET
			name        = COALESCE(NULLIF($1,''), name),
			type        = COALESCE(NULLIF($2,''), type),
			description = COALESCE($3, description),
			color       = COALESCE($4, color),
			updated_at  = NOW()
		WHERE id = $5 AND user_id = $6
		RETURNING id, user_id, name, type, description, color, parent_id, created_at, updated_at
	`, dto.Name, dto.Type, dto.Description, dto.Color, id, claims.UserID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.Color, &c.ParentID, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}

	writeJSON(w, http.StatusOK, categoryResponse(c))
}

func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	tag, err := h.db.Exec(r.Context(), `
		DELETE FROM categories WHERE id = $1 AND user_id = $2
	`, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func categoryResponse(c models.Category) map[string]any {
	return map[string]any{
		"id":          c.ID,
		"userId":      c.UserID,
		"name":        c.Name,
		"type":        c.Type,
		"description": c.Description,
		"color":       c.Color,
		"parentId":    c.ParentID,
		"createdAt":   c.CreatedAt,
		"updatedAt":   c.UpdatedAt,
	}
}

func categoryWithChildrenResponse(c *models.CategoryWithChildren) map[string]any {
	sort.Slice(c.Children, func(i, j int) bool {
		return c.Children[i].Name < c.Children[j].Name
	})

	children := make([]map[string]any, 0, len(c.Children))
	for _, child := range c.Children {
		children = append(children, categoryResponse(child))
	}

	return map[string]any{
		"id":          c.ID,
		"userId":      c.UserID,
		"name":        c.Name,
		"type":        c.Type,
		"description": c.Description,
		"color":       c.Color,
		"parentId":    c.ParentID,
		"children":    children,
		"createdAt":   c.CreatedAt,
		"updatedAt":   c.UpdatedAt,
	}
}
