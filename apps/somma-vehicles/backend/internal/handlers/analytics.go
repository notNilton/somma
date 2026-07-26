package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/vehicles/internal/middleware"
	"github.com/nilbyte/somma/vehicles/internal/models"
)

type AnalyticsHandler struct {
	DB *pgxpool.Pool
}

func NewAnalyticsHandler(db *pgxpool.Pool) *AnalyticsHandler {
	return &AnalyticsHandler{DB: db}
}

func (h *AnalyticsHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var summary models.AnalyticsSummary
	summary.PriceHistory = make([]models.FuelPricePoint, 0)
	summary.VehicleSpend = make([]models.VehicleSpendSummary, 0)

	// 1. Overall stats
	err := h.DB.QueryRow(r.Context(), `
		SELECT 
			COALESCE(SUM(total_amount_cents), 0),
			COALESCE(SUM(liters), 0),
			COUNT(id)
		FROM refueling_logs
		WHERE user_id = $1
	`, claims.UserID).Scan(&summary.TotalSpentCents, &summary.TotalLiters, &summary.TotalRefuelings)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch analytics"}`, http.StatusInternalServerError)
		return
	}

	// 2. Count active vehicles
	_ = h.DB.QueryRow(r.Context(), `
		SELECT COUNT(id) FROM vehicles WHERE user_id = $1 AND is_active = TRUE
	`, claims.UserID).Scan(&summary.TotalVehicles)

	// 3. Compute overall avg km/L and cost/km
	var minKM, maxKM float64
	err = h.DB.QueryRow(r.Context(), `
		SELECT COALESCE(MIN(current_km), 0), COALESCE(MAX(current_km), 0)
		FROM refueling_logs
		WHERE user_id = $1
	`, claims.UserID).Scan(&minKM, &maxKM)

	if err == nil && (maxKM-minKM) > 0 {
		totalDistance := maxKM - minKM
		if summary.TotalLiters > 0 {
			summary.AvgKmL = totalDistance / summary.TotalLiters
		}
		if summary.TotalSpentCents > 0 {
			summary.AvgCostPerKM = (float64(summary.TotalSpentCents) / 100.0) / totalDistance
		}
	}

	// 4. Vehicle spend breakdown
	vRows, err := h.DB.Query(r.Context(), `
		SELECT v.id, v.name, COALESCE(SUM(r.total_amount_cents), 0)
		FROM vehicles v
		LEFT JOIN refueling_logs r ON v.id = r.vehicle_id
		WHERE v.user_id = $1 AND v.is_active = TRUE
		GROUP BY v.id, v.name
		ORDER BY SUM(r.total_amount_cents) DESC NULLS LAST
	`, claims.UserID)
	if err == nil {
		defer vRows.Close()
		for vRows.Next() {
			var vs models.VehicleSpendSummary
			if err := vRows.Scan(&vs.VehicleID, &vs.VehicleName, &vs.TotalSpentCents); err == nil {
				summary.VehicleSpend = append(summary.VehicleSpend, vs)
			}
		}
	}

	// 5. Price history (last 10 refuelings)
	pRows, err := h.DB.Query(r.Context(), `
		SELECT TO_CHAR(date, 'YYYY-MM-DD'), fuel_type, price_per_liter_cents
		FROM refueling_logs
		WHERE user_id = $1
		ORDER BY date ASC
		LIMIT 20
	`, claims.UserID)
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var fp models.FuelPricePoint
			if err := pRows.Scan(&fp.Date, &fp.FuelType, &fp.PricePerLiterCents); err == nil {
				fp.PricePerLiterReais = float64(fp.PricePerLiterCents) / 100.0
				summary.PriceHistory = append(summary.PriceHistory, fp)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}
