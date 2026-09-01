package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/vehicles/internal/middleware"
	"github.com/nilbyte/somma/vehicles/internal/models"
)

type RefuelingHandler struct {
	DB *pgxpool.Pool
}

func NewRefuelingHandler(db *pgxpool.Pool) *RefuelingHandler {
	return &RefuelingHandler{DB: db}
}

func (h *RefuelingHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	vehicleID := r.URL.Query().Get("vehicle_id")

	query := `
		WITH ordered_logs AS (
			SELECT 
				r.id, r.vehicle_id, r.transaction_id, r.user_id, r.date, 
				COALESCE(r.station, '') as station, r.fuel_type, r.current_km, r.liters, 
				r.price_per_liter_cents, r.total_amount_cents, r.is_full_tank, COALESCE(r.notes, '') as notes, 
				r.created_at, r.updated_at,
				v.name as vehicle_name, COALESCE(v.license_plate, '') as license_plate,
				LAG(r.current_km) OVER (PARTITION BY r.vehicle_id ORDER BY r.date ASC, r.current_km ASC) as prev_km
			FROM refueling_logs r
			JOIN vehicles v ON r.vehicle_id = v.id
			WHERE r.user_id = $1
	`
	args := []any{claims.UserID}

	if vehicleID != "" {
		query += " AND r.vehicle_id = $2"
		args = append(args, vehicleID)
	}

	query += `
		)
		SELECT 
			id, vehicle_id, transaction_id, user_id, date, 
			station, fuel_type, current_km, liters, 
			price_per_liter_cents, total_amount_cents, is_full_tank, notes, 
			created_at, updated_at, vehicle_name, license_plate,
			COALESCE(CASE WHEN prev_km IS NOT NULL AND current_km > prev_km THEN current_km - prev_km ELSE 0 END, 0) as distance_since_last_km,
			COALESCE(CASE WHEN prev_km IS NOT NULL AND current_km > prev_km AND liters > 0 THEN (current_km - prev_km) / liters ELSE 0 END, 0) as calculated_km_l
		FROM ordered_logs
		ORDER BY date DESC, current_km DESC
	`

	rows, err := h.DB.Query(r.Context(), query, args...)
	if err != nil {
		http.Error(w, `{"error":"database query error: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	logs := make([]models.RefuelingLog, 0)
	for rows.Next() {
		var log models.RefuelingLog
		err := rows.Scan(
			&log.ID, &log.VehicleID, &log.TransactionID, &log.UserID, &log.Date,
			&log.Station, &log.FuelType, &log.CurrentKM, &log.Liters,
			&log.PricePerLiterCents, &log.TotalAmountCents, &log.IsFullTank, &log.Notes,
			&log.CreatedAt, &log.UpdatedAt,
			&log.VehicleName, &log.LicensePlate,
			&log.DistanceSinceLastKM, &log.CalculatedKmL,
		)
		if err != nil {
			http.Error(w, `{"error":"scan error: `+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		logs = append(logs, log)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func (h *RefuelingHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req models.CreateRefuelingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body: `+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	if req.VehicleID == "" {
		http.Error(w, `{"error":"vehicle_id is required"}`, http.StatusBadRequest)
		return
	}
	if req.Liters <= 0 {
		http.Error(w, `{"error":"liters must be greater than 0"}`, http.StatusBadRequest)
		return
	}

	// Calculate total amount if missing
	if req.TotalAmountCents <= 0 && req.PricePerLiterCents > 0 {
		req.TotalAmountCents = int64(float64(req.PricePerLiterCents) * req.Liters)
	}

	refuelDate := time.Now()
	if req.Date != "" {
		if parsed, err := time.Parse(time.RFC3339, req.Date); err == nil {
			refuelDate = parsed
		} else if parsed, err := time.Parse("2006-01-02", req.Date); err == nil {
			refuelDate = parsed
		}
	}

	// Begin atomic transaction to insert into transactions + refueling_logs
	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		http.Error(w, `{"error":"failed to start db transaction"}`, http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// 1. Verify vehicle ownership & get vehicle name
	var vehicleName string
	err = tx.QueryRow(r.Context(), `
		SELECT name FROM vehicles WHERE id = $1 AND user_id = $2
	`, req.VehicleID, claims.UserID).Scan(&vehicleName)
	if err != nil {
		http.Error(w, `{"error":"vehicle not found or access denied"}`, http.StatusBadRequest)
		return
	}

	// 2. Ensure Category "Combustível" exists in expenses database tables
	var categoryID string
	err = tx.QueryRow(r.Context(), `
		SELECT id FROM categories 
		WHERE user_id = $1 AND name IN ('Combustível', 'Veículos') AND type = 'EXPENSE'
		LIMIT 1
	`, claims.UserID).Scan(&categoryID)
	if err != nil {
		// Create category automatically
		err = tx.QueryRow(r.Context(), `
			INSERT INTO categories (user_id, name, type, description, color)
			VALUES ($1, 'Combustível', 'EXPENSE', 'Gastos com combustível e veículos', '#0284c7')
			RETURNING id
		`, claims.UserID).Scan(&categoryID)
		if err != nil {
			http.Error(w, `{"error":"failed to create fuel category: `+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
	}

	// 3. Create linked transaction in `transactions` table (so Expenses app sees it instantly!)
	txDescription := fmt.Sprintf("Abastecimento: %s (%.1fL)", vehicleName, req.Liters)
	if req.Station != "" {
		txDescription += fmt.Sprintf(" - %s", req.Station)
	}

	var transactionID string
	err = tx.QueryRow(r.Context(), `
		INSERT INTO transactions (
			user_id, category_id, type, kind, status,
			amount_cents, date, description, notes, currency_code, is_active
		)
		VALUES ($1, $2, 'EXPENSE', 'EXPENSE', 'COMPLETED', $3, $4, $5, $6, 'BRL', TRUE)
		RETURNING id
	`, claims.UserID, categoryID, req.TotalAmountCents, refuelDate, txDescription, req.Notes).Scan(&transactionID)
	if err != nil {
		http.Error(w, `{"error":"failed to create transaction in expenses: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// 4. Create refueling_log linked to transactionID
	var log models.RefuelingLog
	err = tx.QueryRow(r.Context(), `
		INSERT INTO refueling_logs (
			vehicle_id, transaction_id, user_id, date, station, fuel_type,
			current_km, liters, price_per_liter_cents, total_amount_cents, is_full_tank, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, vehicle_id, transaction_id, user_id, date, COALESCE(station, ''), fuel_type,
		          current_km, liters, price_per_liter_cents, total_amount_cents, is_full_tank, COALESCE(notes, ''),
		          created_at, updated_at
	`, req.VehicleID, transactionID, claims.UserID, refuelDate, req.Station, req.FuelType,
		req.CurrentKM, req.Liters, req.PricePerLiterCents, req.TotalAmountCents, req.IsFullTank, req.Notes).Scan(
		&log.ID, &log.VehicleID, &log.TransactionID, &log.UserID, &log.Date, &log.Station, &log.FuelType,
		&log.CurrentKM, &log.Liters, &log.PricePerLiterCents, &log.TotalAmountCents, &log.IsFullTank, &log.Notes,
		&log.CreatedAt, &log.UpdatedAt,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to create refueling log: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// 5. Update vehicle odometer_km if current_km is higher
	_, _ = tx.Exec(r.Context(), `
		UPDATE vehicles
		SET odometer_km = GREATEST(odometer_km, $1), updated_at = NOW()
		WHERE id = $2
	`, req.CurrentKM, req.VehicleID)

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, `{"error":"failed to commit transaction"}`, http.StatusInternalServerError)
		return
	}

	log.VehicleName = vehicleName

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(log)
}

func (h *RefuelingHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/refuelings/")

	var req models.UpdateRefuelingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// 1. Update refueling log
	var log models.RefuelingLog
	err = tx.QueryRow(r.Context(), `
		UPDATE refueling_logs
		SET station = $1, fuel_type = $2, current_km = $3, liters = $4,
		    price_per_liter_cents = $5, total_amount_cents = $6, is_full_tank = $7, notes = $8, updated_at = NOW()
		WHERE id = $9 AND user_id = $10
		RETURNING id, vehicle_id, transaction_id, user_id, date, COALESCE(station, ''), fuel_type,
		          current_km, liters, price_per_liter_cents, total_amount_cents, is_full_tank, COALESCE(notes, ''),
		          created_at, updated_at
	`, req.Station, req.FuelType, req.CurrentKM, req.Liters,
		req.PricePerLiterCents, req.TotalAmountCents, req.IsFullTank, req.Notes, id, claims.UserID).Scan(
		&log.ID, &log.VehicleID, &log.TransactionID, &log.UserID, &log.Date, &log.Station, &log.FuelType,
		&log.CurrentKM, &log.Liters, &log.PricePerLiterCents, &log.TotalAmountCents, &log.IsFullTank, &log.Notes,
		&log.CreatedAt, &log.UpdatedAt,
	)
	if err != nil {
		http.Error(w, `{"error":"refueling log not found"}`, http.StatusNotFound)
		return
	}

	// 2. Automatically update shared transaction in `transactions`
	_, err = tx.Exec(r.Context(), `
		UPDATE transactions
		SET amount_cents = $1, notes = $2, updated_at = NOW()
		WHERE id = $3 AND user_id = $4
	`, req.TotalAmountCents, req.Notes, log.TransactionID, claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"failed to update linked transaction"}`, http.StatusInternalServerError)
		return
	}

	// 3. Re-evaluate vehicle odometer
	_, _ = tx.Exec(r.Context(), `
		UPDATE vehicles
		SET odometer_km = (SELECT COALESCE(MAX(current_km), 0) FROM refueling_logs WHERE vehicle_id = $1), updated_at = NOW()
		WHERE id = $1
	`, log.VehicleID)

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, `{"error":"failed to commit transaction"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(log)
}

func (h *RefuelingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/refuelings/")

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var transactionID, vehicleID string
	err = tx.QueryRow(r.Context(), `
		DELETE FROM refueling_logs 
		WHERE id = $1 AND user_id = $2
		RETURNING transaction_id, vehicle_id
	`, id, claims.UserID).Scan(&transactionID, &vehicleID)
	if err != nil {
		http.Error(w, `{"error":"refueling log not found"}`, http.StatusNotFound)
		return
	}

	// Also delete the linked transaction from transactions table
	_, _ = tx.Exec(r.Context(), `
		DELETE FROM transactions WHERE id = $1 AND user_id = $2
	`, transactionID, claims.UserID)

	// Update vehicle odometer
	_, _ = tx.Exec(r.Context(), `
		UPDATE vehicles
		SET odometer_km = (SELECT COALESCE(MAX(current_km), 0) FROM refueling_logs WHERE vehicle_id = $1), updated_at = NOW()
		WHERE id = $1
	`, vehicleID)

	if err := tx.Commit(r.Context()); err != nil {
		http.Error(w, `{"error":"failed to commit transaction"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
