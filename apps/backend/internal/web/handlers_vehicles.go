package web

import (
	"net/http"
	"time"
)

func (h *Handler) ListVehiclesPage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id, name, license_plate, brand, model, year, tank_capacity_liters, created_at
		FROM vehicles
		WHERE user_id = $1 AND is_active = true
		ORDER BY name
	`, user.ID)
	if err != nil {
		h.engine.Render(w, r, "vehicles-list", map[string]any{
			"Title": "Veículos", "User": user, "Error": "Erro ao carregar",
		})
		return
	}
	defer rows.Close()

	var vehicles []map[string]any
	for rows.Next() {
		var id, name string
		var licensePlate, brand, model *string
		var year, tank *int
		var createdAt time.Time
		rows.Scan(&id, &name, &licensePlate, &brand, &model, &year, &tank, &createdAt)
		vehicles = append(vehicles, map[string]any{
			"ID": id, "Name": name, "LicensePlate": licensePlate, "Brand": brand,
			"Model": model, "Year": year, "Tank": tank, "CreatedAt": createdAt,
		})
	}
	if vehicles == nil {
		vehicles = []map[string]any{}
	}

	h.engine.Render(w, r, "vehicles-list", map[string]any{
		"Title":    "Veículos",
		"User":     user,
		"Vehicles": vehicles,
	})
}
