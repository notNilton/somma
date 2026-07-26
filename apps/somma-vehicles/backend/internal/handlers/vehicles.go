package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/vehicles/internal/middleware"
	"github.com/nilbyte/somma/vehicles/internal/models"
)

type VehicleHandler struct {
	DB *pgxpool.Pool
}

func NewVehicleHandler(db *pgxpool.Pool) *VehicleHandler {
	return &VehicleHandler{DB: db}
}

func (h *VehicleHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.DB.Query(r.Context(), `
		SELECT 
			v.id, v.user_id, v.name, COALESCE(v.license_plate, ''), COALESCE(v.brand, ''), COALESCE(v.model, ''), 
			COALESCE(v.year, 0), v.tank_liters, v.fuel_type, v.odometer_km, v.is_active, v.created_at, v.updated_at,
			COALESCE(SUM(r.total_amount_cents), 0) as total_spent,
			COUNT(r.id) as total_refuelings,
			COALESCE(SUM(r.liters), 0) as total_liters
		FROM vehicles v
		LEFT JOIN refueling_logs r ON v.id = r.vehicle_id
		WHERE v.user_id = $1 AND v.is_active = TRUE
		GROUP BY v.id
		ORDER BY v.created_at DESC
	`, claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"database error: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	vehicles := make([]models.Vehicle, 0)
	for rows.Next() {
		var v models.Vehicle
		var totalSpent int64
		var totalRefuelings int
		var totalLiters float64

		err := rows.Scan(
			&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
			&v.Year, &v.TankLiters, &v.FuelType, &v.OdometerKM, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
			&totalSpent, &totalRefuelings, &totalLiters,
		)
		if err != nil {
			http.Error(w, `{"error":"scan error: `+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		v.TotalSpentCents = totalSpent
		v.TotalRefuelings = totalRefuelings
		v.TotalLiters = totalLiters

		// Calculate avg km/L if there are refuelings
		if totalRefuelings > 1 && totalLiters > 0 {
			var minKM, maxKM float64
			err := h.DB.QueryRow(r.Context(), `
				SELECT COALESCE(MIN(current_km), 0), COALESCE(MAX(current_km), 0)
				FROM refueling_logs
				WHERE vehicle_id = $1
			`, v.ID).Scan(&minKM, &maxKM)
			if err == nil && (maxKM-minKM) > 0 {
				v.AvgKmL = (maxKM - minKM) / totalLiters
				if (maxKM - minKM) > 0 {
					v.AvgCostPerKM = (float64(totalSpent) / 100.0) / (maxKM - minKM)
				}
			}
		}

		vehicles = append(vehicles, v)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vehicles)
}

func (h *VehicleHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req models.CreateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		http.Error(w, `{"error":"vehicle name is required"}`, http.StatusBadRequest)
		return
	}

	if req.TankLiters <= 0 {
		req.TankLiters = 50.0
	}
	if req.FuelType == "" {
		req.FuelType = "Gasolina"
	}

	var v models.Vehicle
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO vehicles (user_id, name, license_plate, brand, model, year, tank_liters, fuel_type, odometer_km)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, name, COALESCE(license_plate, ''), COALESCE(brand, ''), COALESCE(model, ''), 
		          COALESCE(year, 0), tank_liters, fuel_type, odometer_km, is_active, created_at, updated_at
	`, claims.UserID, req.Name, req.LicensePlate, req.Brand, req.Model, req.Year, req.TankLiters, req.FuelType, req.OdometerKM).Scan(
		&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
		&v.Year, &v.TankLiters, &v.FuelType, &v.OdometerKM, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)

	if err != nil {
		http.Error(w, `{"error":"failed to create vehicle: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(v)
}

func (h *VehicleHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/vehicles/")

	var v models.Vehicle
	var totalSpent int64
	var totalRefuelings int
	var totalLiters float64

	err := h.DB.QueryRow(r.Context(), `
		SELECT 
			v.id, v.user_id, v.name, COALESCE(v.license_plate, ''), COALESCE(v.brand, ''), COALESCE(v.model, ''), 
			COALESCE(v.year, 0), v.tank_liters, v.fuel_type, v.odometer_km, v.is_active, v.created_at, v.updated_at,
			COALESCE(SUM(r.total_amount_cents), 0) as total_spent,
			COUNT(r.id) as total_refuelings,
			COALESCE(SUM(r.liters), 0) as total_liters
		FROM vehicles v
		LEFT JOIN refueling_logs r ON v.id = r.vehicle_id
		WHERE v.id = $1 AND v.user_id = $2
		GROUP BY v.id
	`, id, claims.UserID).Scan(
		&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
		&v.Year, &v.TankLiters, &v.FuelType, &v.OdometerKM, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
		&totalSpent, &totalRefuelings, &totalLiters,
	)

	if err != nil {
		http.Error(w, `{"error":"vehicle not found"}`, http.StatusNotFound)
		return
	}

	v.TotalSpentCents = totalSpent
	v.TotalRefuelings = totalRefuelings
	v.TotalLiters = totalLiters

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (h *VehicleHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/vehicles/")

	var req models.UpdateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
		return
	}

	var v models.Vehicle
	err := h.DB.QueryRow(r.Context(), `
		UPDATE vehicles
		SET name = $1, license_plate = $2, brand = $3, model = $4, year = $5, tank_liters = $6, fuel_type = $7, odometer_km = $8, updated_at = NOW()
		WHERE id = $9 AND user_id = $10
		RETURNING id, user_id, name, COALESCE(license_plate, ''), COALESCE(brand, ''), COALESCE(model, ''), 
		          COALESCE(year, 0), tank_liters, fuel_type, odometer_km, is_active, created_at, updated_at
	`, req.Name, req.LicensePlate, req.Brand, req.Model, req.Year, req.TankLiters, req.FuelType, req.OdometerKM, id, claims.UserID).Scan(
		&v.ID, &v.UserID, &v.Name, &v.LicensePlate, &v.Brand, &v.Model,
		&v.Year, &v.TankLiters, &v.FuelType, &v.OdometerKM, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)

	if err != nil {
		http.Error(w, `{"error":"failed to update vehicle"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (h *VehicleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/vehicles/")

	_, err := h.DB.Exec(r.Context(), `
		DELETE FROM vehicles WHERE id = $1 AND user_id = $2
	`, id, claims.UserID)

	if err != nil {
		http.Error(w, `{"error":"failed to delete vehicle"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
