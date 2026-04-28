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

type createVehicleDto struct {
	Name         string   `json:"name"`
	LicensePlate *string  `json:"licensePlate"`
	Brand        *string  `json:"brand"`
	Model        *string  `json:"model"`
	Year         *int     `json:"year"`
	Tank         *float64 `json:"tank"`
}

func (d *createVehicleDto) validate() error {
	if d.Name == "" {
		return errors.New("name is required")
	}
	if len(d.Name) > 100 {
		return errors.New("name max 100 chars")
	}
	return nil
}

func (h *Handler) ListVehicles(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT id, user_id, name, license_plate, brand, model, year, tank,
		       is_active, deleted_at, created_at, updated_at
		FROM vehicles
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at ASC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var vehicles []any
	for rows.Next() {
		var v models.Vehicle
		if err := rows.Scan(
			&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
			&v.Year, &v.Tank, &v.IsActive, &v.DeletedAt, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		vehicles = append(vehicles, vehicleResponse(v))
	}

	if vehicles == nil {
		vehicles = []any{}
	}
	writeJSON(w, http.StatusOK, vehicles)
}

func (h *Handler) GetVehicle(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var v models.Vehicle
	err := h.db.QueryRow(r.Context(), `
		SELECT id, user_id, name, license_plate, brand, model, year, tank,
		       is_active, deleted_at, created_at, updated_at
		FROM vehicles WHERE id = $1 AND user_id = $2 AND is_active = true
	`, id, claims.UserID).Scan(
		&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
		&v.Year, &v.Tank, &v.IsActive, &v.DeletedAt, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "vehicle not found")
		return
	}

	writeJSON(w, http.StatusOK, vehicleResponse(v))
}

func (h *Handler) CreateVehicle(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto createVehicleDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var v models.Vehicle
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO vehicles (user_id, name, license_plate, brand, model, year, tank)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, name, license_plate, brand, model, year, tank,
		          is_active, deleted_at, created_at, updated_at
	`, claims.UserID, dto.Name, dto.LicensePlate, dto.Brand, dto.Model, dto.Year, dto.Tank).Scan(
		&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
		&v.Year, &v.Tank, &v.IsActive, &v.DeletedAt, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, vehicleResponse(v))
}

func (h *Handler) UpdateVehicle(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var dto createVehicleDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	var v models.Vehicle
	err := h.db.QueryRow(r.Context(), `
		UPDATE vehicles SET
			name          = COALESCE(NULLIF($1,''), name),
			license_plate = COALESCE($2, license_plate),
			brand         = COALESCE($3, brand),
			model         = COALESCE($4, model),
			year          = COALESCE($5, year),
			tank          = COALESCE($6, tank),
			updated_at    = NOW()
		WHERE id = $7 AND user_id = $8 AND is_active = true
		RETURNING id, user_id, name, license_plate, brand, model, year, tank,
		          is_active, deleted_at, created_at, updated_at
	`, dto.Name, dto.LicensePlate, dto.Brand, dto.Model, dto.Year, dto.Tank, id, claims.UserID).Scan(
		&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
		&v.Year, &v.Tank, &v.IsActive, &v.DeletedAt, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "vehicle not found")
		return
	}

	writeJSON(w, http.StatusOK, vehicleResponse(v))
}

func (h *Handler) DeleteVehicle(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	now := time.Now()
	tag, err := h.db.Exec(r.Context(), `
		UPDATE vehicles SET is_active = false, deleted_at = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND is_active = true
	`, now, id, claims.UserID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "vehicle not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetVehicleRefuelings(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	rows, err := h.db.Query(r.Context(), `
		SELECT rl.id, rl.vehicle_id, rl.transaction_id, rl.station, rl.fuel_type,
		       rl.current_km, rl.liters, rl.price_per_liter_cents, rl.created_at, rl.updated_at
		FROM refueling_logs rl
		JOIN vehicles v ON v.id = rl.vehicle_id
		WHERE rl.vehicle_id = $1 AND v.user_id = $2
		ORDER BY rl.created_at DESC
	`, id, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var logs []any
	for rows.Next() {
		var l models.RefuelingLog
		if err := rows.Scan(
			&l.ID, &l.VehicleID, &l.TransactionID, &l.Station, &l.FuelType,
			&l.CurrentKm, &l.Liters, &l.PricePerLiterCents, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		logs = append(logs, map[string]any{
			"id":            l.ID,
			"vehicleId":     l.VehicleID,
			"transactionId": l.TransactionID,
			"station":       l.Station,
			"fuelType":      l.FuelType,
			"currentKm":     l.CurrentKm,
			"liters":        l.Liters,
			"pricePerLiter": money.ToReaisPtr(l.PricePerLiterCents),
			"createdAt":     l.CreatedAt,
		})
	}

	if logs == nil {
		logs = []any{}
	}
	writeJSON(w, http.StatusOK, logs)
}

func (h *Handler) GetVehicleMaintenances(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	rows, err := h.db.Query(r.Context(), `
		SELECT vm.id, vm.vehicle_id, vm.transaction_id, vm.maintenance_type, vm.provider, vm.created_at, vm.updated_at
		FROM vehicle_maintenances vm
		JOIN vehicles v ON v.id = vm.vehicle_id
		WHERE vm.vehicle_id = $1 AND v.user_id = $2
		ORDER BY vm.created_at DESC
	`, id, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var maintenances []any
	for rows.Next() {
		var item struct {
			ID              string
			VehicleID       string
			TransactionID   string
			MaintenanceType string
			Provider        *string
			CreatedAt       time.Time
			UpdatedAt       time.Time
		}
		if err := rows.Scan(
			&item.ID, &item.VehicleID, &item.TransactionID, &item.MaintenanceType, &item.Provider, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		maintenances = append(maintenances, map[string]any{
			"id":              item.ID,
			"vehicleId":       item.VehicleID,
			"transactionId":   item.TransactionID,
			"maintenanceType": item.MaintenanceType,
			"provider":        item.Provider,
			"createdAt":       item.CreatedAt,
		})
	}

	if maintenances == nil {
		maintenances = []any{}
	}
	writeJSON(w, http.StatusOK, maintenances)
}

func (h *Handler) GetVehicleExpenseStats(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var totalFuelCents int64
	err := h.db.QueryRow(r.Context(), `
		SELECT COALESCE(
			ROUND(SUM(COALESCE(rl.liters, 0) * COALESCE(rl.price_per_liter_cents, 0))),
			0
		)::bigint
		FROM refueling_logs rl
		JOIN vehicles v ON v.id = rl.vehicle_id
		WHERE rl.vehicle_id = $1 AND v.user_id = $2
	`, id, claims.UserID).Scan(&totalFuelCents)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	var totalMaintenanceCents int64
	err = h.db.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(t.amount_cents), 0)
		FROM vehicle_maintenances vm
		JOIN vehicles v ON v.id = vm.vehicle_id
		JOIN transactions t ON t.id = vm.transaction_id
		WHERE vm.vehicle_id = $1
		  AND v.user_id = $2
		  AND t.is_active = true
	`, id, claims.UserID).Scan(&totalMaintenanceCents)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	totalFuel := money.ToReais(totalFuelCents)
	totalMaintenance := money.ToReais(totalMaintenanceCents)
	writeJSON(w, http.StatusOK, map[string]any{
		"totalFuel":       totalFuel,
		"totalMaintenance": totalMaintenance,
		"total":           totalFuel + totalMaintenance,
	})
}

func vehicleResponse(v models.Vehicle) map[string]any {
	return map[string]any{
		"id":           v.ID,
		"userId":       v.UserID,
		"name":         v.Name,
		"licensePlate": v.LicensePlate,
		"brand":        v.Brand,
		"model":        v.Model,
		"year":         v.Year,
		"tank":         v.Tank,
		"isActive":     v.IsActive,
		"createdAt":    v.CreatedAt,
		"updatedAt":    v.UpdatedAt,
	}
}
