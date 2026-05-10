package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/personalledger/backend/internal/cache"
	"github.com/nilbyte/personalledger/backend/internal/handlers"
	"github.com/nilbyte/personalledger/backend/internal/middleware"
)

func Register(mux *http.ServeMux, db *pgxpool.Pool, jwtKey []byte, c *cache.Cache) {
	h := handlers.New(db, jwtKey, c)
	auth := middleware.Auth(jwtKey)

	// Health
	mux.HandleFunc("GET /health", h.Health)

	// Auth (público)
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("POST /api/auth/logout", h.Logout)
	mux.HandleFunc("POST /auth/register", h.Register)
	mux.HandleFunc("POST /auth/login", h.Login)
	mux.HandleFunc("POST /auth/logout", h.Logout)

	// Users
	mux.HandleFunc("GET /users/me", auth(h.GetMe))
	mux.HandleFunc("PATCH /users/me", auth(h.UpdateMe))

	// Categories
	mux.HandleFunc("GET /api/v1/categories", auth(h.ListCategories))
	mux.HandleFunc("GET /api/v1/categories/{id}", auth(h.GetCategory))
	mux.HandleFunc("POST /api/v1/categories", auth(h.CreateCategory))
	mux.HandleFunc("PATCH /api/v1/categories/{id}", auth(h.UpdateCategory))
	mux.HandleFunc("DELETE /api/v1/categories/{id}", auth(h.DeleteCategory))

	// Tags
	mux.HandleFunc("GET /api/v1/tags", auth(h.ListTags))
	mux.HandleFunc("GET /api/v1/tags/{id}", auth(h.GetTag))
	mux.HandleFunc("POST /api/v1/tags", auth(h.CreateTag))
	mux.HandleFunc("PATCH /api/v1/tags/{id}", auth(h.UpdateTag))
	mux.HandleFunc("DELETE /api/v1/tags/{id}", auth(h.DeleteTag))

	// Transactions
	mux.HandleFunc("GET /api/v1/transactions", auth(h.ListTransactions))
	mux.HandleFunc("GET /api/v1/transactions/future", auth(h.ListFutureTransactions))
	mux.HandleFunc("GET /api/v1/transactions/{id}", auth(h.GetTransaction))
	mux.HandleFunc("POST /api/v1/transactions", auth(h.CreateTransaction))
	mux.HandleFunc("PATCH /api/v1/transactions/{id}", auth(h.UpdateTransaction))
	mux.HandleFunc("DELETE /api/v1/transactions/{id}", auth(h.DeleteTransaction))

	// Budgets
	mux.HandleFunc("GET /api/v1/budgets", auth(h.ListBudgets))
	mux.HandleFunc("POST /api/v1/budgets", auth(h.CreateBudget))
	mux.HandleFunc("PATCH /api/v1/budgets/{id}", auth(h.UpdateBudget))
	mux.HandleFunc("DELETE /api/v1/budgets/{id}", auth(h.DeleteBudget))

	// Vehicles
	mux.HandleFunc("GET /api/v1/vehicles", auth(h.ListVehicles))
	mux.HandleFunc("GET /api/v1/vehicles/{id}", auth(h.GetVehicle))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/refuelings", auth(h.GetVehicleRefuelings))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/maintenances", auth(h.GetVehicleMaintenances))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/expenses-stats", auth(h.GetVehicleExpenseStats))
	mux.HandleFunc("POST /api/v1/vehicles", auth(h.CreateVehicle))
	mux.HandleFunc("PATCH /api/v1/vehicles/{id}", auth(h.UpdateVehicle))
	mux.HandleFunc("DELETE /api/v1/vehicles/{id}", auth(h.DeleteVehicle))

	// Dashboard & Analytics
	mux.HandleFunc("GET /api/v1/dashboard", auth(h.GetDashboard))
	mux.HandleFunc("GET /api/v1/dashboard/monthly-evolution", auth(h.GetMonthlyEvolution))
	mux.HandleFunc("GET /api/v1/dashboard/category-breakdown", auth(h.GetCategoryBreakdown))
	mux.HandleFunc("GET /api/v1/analytics/annual-evolution", auth(h.GetAnnualEvolution))

	// Settings
	mux.HandleFunc("GET /api/v1/settings/profile", auth(h.GetProfile))
	mux.HandleFunc("PATCH /api/v1/settings/profile", auth(h.UpdateProfile))
	mux.HandleFunc("PATCH /api/v1/settings/change-password", auth(h.ChangePassword))
	mux.HandleFunc("DELETE /api/v1/settings/account", auth(h.DeleteMyAccount))
}
