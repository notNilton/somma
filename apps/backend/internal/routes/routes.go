package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/handlers"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/web"
)

func Register(mux *http.ServeMux, db *pgxpool.Pool, jwtKey []byte, c *cache.Cache, isProduction bool, wh *web.Handler) {
	h := handlers.New(db, jwtKey, c, isProduction)
	auth := middleware.Auth(jwtKey, db)
	webAuth := web.RequireAuth(jwtKey, db)
	redirectIfAuth := web.RedirectIfAuth(jwtKey, db)

	// ============================================================
	// Web routes (HTML)
	// ============================================================

	// Auth
	mux.HandleFunc("GET /login", redirectIfAuth(wh.LoginPage))
	mux.HandleFunc("POST /login", redirectIfAuth(wh.Login))
	mux.HandleFunc("GET /register", redirectIfAuth(wh.RegisterPage))
	mux.HandleFunc("POST /register", redirectIfAuth(wh.Register))
	mux.HandleFunc("POST /logout", webAuth(wh.Logout))

	// Home (calendar view)
	mux.HandleFunc("GET /{$}", webAuth(wh.HomePage))
	mux.HandleFunc("GET /", webAuth(wh.HomePage))

	// Create transaction from home
	mux.HandleFunc("POST /transactions", webAuth(wh.CreateTransactionHome))
	mux.HandleFunc("POST /transactions/{id}/edit", webAuth(wh.UpdateTransactionWeb))
	mux.HandleFunc("POST /transactions/{id}/delete", webAuth(wh.DeleteTransactionWeb))

	// ============================================================
	// API routes (JSON) — kept for compatibility
	// ============================================================

	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("POST /api/auth/logout", h.Logout)
	mux.HandleFunc("GET /api/users/me", auth(h.GetMe))
	mux.HandleFunc("PATCH /api/users/me", auth(h.UpdateMe))
	mux.HandleFunc("GET /api/v1/categories", auth(h.ListCategories))
	mux.HandleFunc("GET /api/v1/categories/{id}", auth(h.GetCategory))
	mux.HandleFunc("POST /api/v1/categories", auth(h.CreateCategory))
	mux.HandleFunc("PATCH /api/v1/categories/{id}", auth(h.UpdateCategory))
	mux.HandleFunc("DELETE /api/v1/categories/{id}", auth(h.DeleteCategory))
	mux.HandleFunc("GET /api/v1/tags", auth(h.ListTags))
	mux.HandleFunc("GET /api/v1/tags/{id}", auth(h.GetTag))
	mux.HandleFunc("POST /api/v1/tags", auth(h.CreateTag))
	mux.HandleFunc("PATCH /api/v1/tags/{id}", auth(h.UpdateTag))
	mux.HandleFunc("DELETE /api/v1/tags/{id}", auth(h.DeleteTag))
	mux.HandleFunc("GET /api/v1/transactions", auth(h.ListTransactions))
	mux.HandleFunc("GET /api/v1/transactions/future", auth(h.ListFutureTransactions))
	mux.HandleFunc("GET /api/v1/transactions/{id}", auth(h.GetTransaction))
	mux.HandleFunc("POST /api/v1/transactions", auth(h.CreateTransaction))
	mux.HandleFunc("PATCH /api/v1/transactions/{id}", auth(h.UpdateTransaction))
	mux.HandleFunc("DELETE /api/v1/transactions/{id}", auth(h.DeleteTransaction))
	mux.HandleFunc("GET /api/v1/budgets", auth(h.ListBudgets))
	mux.HandleFunc("POST /api/v1/budgets", auth(h.CreateBudget))
	mux.HandleFunc("PATCH /api/v1/budgets/{id}", auth(h.UpdateBudget))
	mux.HandleFunc("DELETE /api/v1/budgets/{id}", auth(h.DeleteBudget))
	mux.HandleFunc("GET /api/v1/vehicles", auth(h.ListVehicles))
	mux.HandleFunc("GET /api/v1/vehicles/{id}", auth(h.GetVehicle))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/refuelings", auth(h.GetVehicleRefuelings))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/maintenances", auth(h.GetVehicleMaintenances))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/expenses-stats", auth(h.GetVehicleExpenseStats))
	mux.HandleFunc("POST /api/v1/vehicles", auth(h.CreateVehicle))
	mux.HandleFunc("PATCH /api/v1/vehicles/{id}", auth(h.UpdateVehicle))
	mux.HandleFunc("DELETE /api/v1/vehicles/{id}", auth(h.DeleteVehicle))
	mux.HandleFunc("GET /api/v1/dashboard", auth(h.GetDashboard))
	mux.HandleFunc("GET /api/v1/dashboard/monthly-evolution", auth(h.GetMonthlyEvolution))
	mux.HandleFunc("GET /api/v1/dashboard/category-breakdown", auth(h.GetCategoryBreakdown))
	mux.HandleFunc("GET /api/v1/analytics/annual-evolution", auth(h.GetAnnualEvolution))
	mux.HandleFunc("GET /api/v1/settings/profile", auth(h.GetProfile))
	mux.HandleFunc("PATCH /api/v1/settings/profile", auth(h.UpdateProfile))
	mux.HandleFunc("PATCH /api/v1/settings/change-password", auth(h.ChangePassword))
	mux.HandleFunc("DELETE /api/v1/settings/account", auth(h.DeleteMyAccount))
}
