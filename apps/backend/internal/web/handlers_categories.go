package web

import (
	"net/http"

	"github.com/nilbyte/tallyoh/backend/internal/models"
)

func (h *Handler) ListCategoriesPage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id, user_id, name, type, description, color, parent_id, created_at, updated_at
		FROM categories
		WHERE user_id = $1 AND is_active = true
		ORDER BY type, name
	`, user.ID)
	if err != nil {
		h.engine.Render(w, r, "categories-list", map[string]any{
			"Title": "Categorias", "User": user, "Error": "Erro ao carregar",
		})
		return
	}
	defer rows.Close()

	var incomeCats, expenseCats []models.Category
	for rows.Next() {
		var c models.Category
		rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.Color, &c.ParentID, &c.CreatedAt, &c.UpdatedAt)
		if c.Type == "INCOME" {
			incomeCats = append(incomeCats, c)
		} else {
			expenseCats = append(expenseCats, c)
		}
	}

	h.engine.Render(w, r, "categories-list", map[string]any{
		"Title":       "Categorias",
		"User":        user,
		"IncomeCats":  incomeCats,
		"ExpenseCats": expenseCats,
	})
}
