package handlers

import (
	"net/http"

	"github.com/nilbyte/somma/backend/internal/middleware"
)

// Categorias da tabela categories de database/migrations (o schema.sql do sqlc não a descreve).

type categoryResponse struct {
	ID       string             `json:"id"`
	Name     string             `json:"name"`
	Type     string             `json:"type"`
	Color    *string            `json:"color,omitempty"`
	Children []categoryResponse `json:"children,omitempty"`
}

// ListCategories atende GET /api/v1/categories: as categorias do usuário em
// árvore (subcategorias dentro de children), ordenadas por tipo e nome.
func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id, name, type::TEXT, color, parent_id
		FROM categories
		WHERE user_id = $1
		ORDER BY type, name`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	defer rows.Close()

	type row struct {
		cat      categoryResponse
		parentID *string
	}
	var all []row
	for rows.Next() {
		var c row
		if err := rows.Scan(&c.cat.ID, &c.cat.Name, &c.cat.Type, &c.cat.Color, &c.parentID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list categories")
			return
		}
		all = append(all, c)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}

	children := map[string][]categoryResponse{}
	for _, c := range all {
		if c.parentID != nil {
			children[*c.parentID] = append(children[*c.parentID], c.cat)
		}
	}
	roots := []categoryResponse{}
	for _, c := range all {
		if c.parentID == nil {
			c.cat.Children = children[c.cat.ID]
			roots = append(roots, c.cat)
		}
	}

	writeJSON(w, http.StatusOK, roots)
}
