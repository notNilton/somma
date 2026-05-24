package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/handlers"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
)

func Register(mux *http.ServeMux, db *pgxpool.Pool, jwtKey []byte, c *cache.Cache, isProduction bool) {
	h := handlers.New(db, jwtKey, c, isProduction)
	auth := middleware.Auth(jwtKey, db)

	// Health
	mux.HandleFunc("GET /api/health", h.Health)

	// Auth (público)
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("POST /api/auth/logout", h.Logout)

	// Users
	mux.HandleFunc("GET /api/users/me", auth(h.GetMe))
	mux.HandleFunc("PATCH /api/users/me", auth(h.UpdateMe))

	// Categories
	mux.HandleFunc("GET /api/v1/categories", auth(h.ListCategories))
	mux.HandleFunc("GET /api/v1/categories/{id}", auth(h.GetCategory))
	mux.HandleFunc("POST /api/v1/categories", auth(h.CreateCategory))
	mux.HandleFunc("PATCH /api/v1/categories/{id}", auth(h.UpdateCategory))
	mux.HandleFunc("DELETE /api/v1/categories/{id}", auth(h.DeleteCategory))

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
