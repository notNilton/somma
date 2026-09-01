package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/vehicles/internal/config"
	"github.com/nilbyte/somma/vehicles/internal/handlers"
	"github.com/nilbyte/somma/vehicles/internal/middleware"
)

func RegisterRoutes(mux *http.ServeMux, cfg *config.Config, db *pgxpool.Pool) {
	healthH := handlers.NewHealthHandler(db)
	vehicleH := handlers.NewVehicleHandler(db)
	refuelingH := handlers.NewRefuelingHandler(db)
	analyticsH := handlers.NewAnalyticsHandler(db)

	isDev := cfg.Env == "development"
	auth := middleware.Auth([]byte(cfg.JWTSecret), db, isDev)

	// Health check
	mux.HandleFunc("GET /api/health", healthH.Health)

	// Vehicles
	mux.HandleFunc("GET /api/vehicles", auth(vehicleH.List))
	mux.HandleFunc("POST /api/vehicles", auth(vehicleH.Create))
	mux.HandleFunc("GET /api/vehicles/", auth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			vehicleH.Get(w, r)
		} else if r.Method == http.MethodPut {
			vehicleH.Update(w, r)
		} else if r.Method == http.MethodDelete {
			vehicleH.Delete(w, r)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}))

	// Refuelings
	mux.HandleFunc("GET /api/refuelings", auth(refuelingH.List))
	mux.HandleFunc("POST /api/refuelings", auth(refuelingH.Create))
	mux.HandleFunc("GET /api/refuelings/", auth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			// Get by ID if needed or list
			refuelingH.List(w, r)
		} else if r.Method == http.MethodPut {
			refuelingH.Update(w, r)
		} else if r.Method == http.MethodDelete {
			refuelingH.Delete(w, r)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}))

	// Analytics
	mux.HandleFunc("GET /api/analytics", auth(analyticsH.GetSummary))
}
