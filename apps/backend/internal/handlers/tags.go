package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/nilbyte/personalledger/backend/internal/models"
)

type createTagDto struct {
	Name  string  `json:"name"`
	Color *string `json:"color"`
}

func (d *createTagDto) validate() error {
	if d.Name == "" {
		return errors.New("name is required")
	}
	if len(d.Name) > 100 {
		return errors.New("name max 100 chars")
	}
	return nil
}

func (h *Handler) ListTags(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, name, color, created_at, updated_at FROM tags ORDER BY name ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var tags []any
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Color, &t.CreatedAt, &t.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		tags = append(tags, tagResponse(t))
	}

	if tags == nil {
		tags = []any{}
	}
	writeJSON(w, http.StatusOK, tags)
}

func (h *Handler) GetTag(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var t models.Tag
	err := h.db.QueryRow(r.Context(), `
		SELECT id, name, color, created_at, updated_at FROM tags WHERE id = $1
	`, id).Scan(&t.ID, &t.Name, &t.Color, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}

	writeJSON(w, http.StatusOK, tagResponse(t))
}

func (h *Handler) CreateTag(w http.ResponseWriter, r *http.Request) {
	var dto createTagDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var t models.Tag
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO tags (name, color) VALUES ($1, $2)
		RETURNING id, name, color, created_at, updated_at
	`, dto.Name, dto.Color).Scan(&t.ID, &t.Name, &t.Color, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, tagResponse(t))
}

func (h *Handler) UpdateTag(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var dto createTagDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var t models.Tag
	err := h.db.QueryRow(r.Context(), `
		UPDATE tags SET
			name       = COALESCE(NULLIF($1,''), name),
			color      = COALESCE($2, color),
			updated_at = NOW()
		WHERE id = $3
		RETURNING id, name, color, created_at, updated_at
	`, dto.Name, dto.Color, id).Scan(&t.ID, &t.Name, &t.Color, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}

	writeJSON(w, http.StatusOK, tagResponse(t))
}

func (h *Handler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	tag, err := h.db.Exec(r.Context(), `DELETE FROM tags WHERE id = $1`, id)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func tagResponse(t models.Tag) map[string]any {
	return map[string]any{
		"id":        t.ID,
		"name":      t.Name,
		"color":     t.Color,
		"createdAt": t.CreatedAt,
		"updatedAt": t.UpdatedAt,
	}
}
