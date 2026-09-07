package routes

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/backend/internal/cache"
	"github.com/nilbyte/somma/backend/internal/handlers"
	"github.com/nilbyte/somma/backend/internal/mail"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"golang.org/x/time/rate"
)

func Register(mux *http.ServeMux, db *pgxpool.Pool, jwtKey []byte, c *cache.Cache, isProduction bool, mailer mail.Mailer, webappURL string) {
	RegisterWithReadDB(mux, db, db, jwtKey, c, isProduction, mailer, webappURL)
}

func RegisterWithReadDB(mux *http.ServeMux, db *pgxpool.Pool, readDB *pgxpool.Pool, jwtKey []byte, c *cache.Cache, isProduction bool, mailer mail.Mailer, webappURL string) {
	h := handlers.NewWithReadDB(db, readDB, jwtKey, c, isProduction, mailer, webappURL)
	auth := middleware.Auth(jwtKey, db)

	authRL := middleware.NewRateLimiter(rate.Limit(5.0/60.0), 5)
	readRL := middleware.NewRateLimiter(rate.Every(500*time.Millisecond), 30)
	writeRL := middleware.NewRateLimiter(rate.Every(2*time.Second), 10)

	// Health
	mux.HandleFunc("GET /healthz", h.Health)
	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("GET /api/healthz", h.Health)

	// Auth
	mux.HandleFunc("POST /api/auth/register", authRL.LimitHandler(h.Register))
	mux.HandleFunc("POST /api/auth/login", authRL.LimitHandler(h.Login))
	mux.HandleFunc("POST /api/auth/logout", h.Logout)
	mux.HandleFunc("POST /api/auth/forgot-password", authRL.LimitHandler(h.ForgotPassword))
	mux.HandleFunc("POST /api/auth/reset-password", authRL.LimitHandler(h.ResetPassword))

	// Users
	mux.HandleFunc("GET /api/users/me", auth(readRL.LimitUser(h.GetMe)))
	mux.HandleFunc("PATCH /api/users/me", auth(writeRL.LimitUser(h.UpdateMe)))

	// Categories
	mux.HandleFunc("GET /api/v1/categories", auth(readRL.LimitUser(h.ListCategories)))
	mux.HandleFunc("GET /api/v1/categories/{id}", auth(readRL.LimitUser(h.GetCategory)))
	mux.HandleFunc("POST /api/v1/categories", auth(writeRL.LimitUser(h.CreateCategory)))
	mux.HandleFunc("PATCH /api/v1/categories/{id}", auth(writeRL.LimitUser(h.UpdateCategory)))
	mux.HandleFunc("DELETE /api/v1/categories/{id}", auth(writeRL.LimitUser(h.DeleteCategory)))

	// Transactions
	mux.HandleFunc("GET /api/v1/transactions", auth(readRL.LimitUser(h.ListTransactions)))
	mux.HandleFunc("GET /api/v1/transactions/future", auth(readRL.LimitUser(h.ListFutureTransactions)))
	mux.HandleFunc("GET /api/v1/transactions/{id}", auth(readRL.LimitUser(h.GetTransaction)))
	mux.HandleFunc("POST /api/v1/transactions", auth(writeRL.LimitUser(h.CreateTransaction)))
	mux.HandleFunc("PATCH /api/v1/transactions/{id}", auth(writeRL.LimitUser(h.UpdateTransaction)))
	mux.HandleFunc("DELETE /api/v1/transactions/{id}", auth(writeRL.LimitUser(h.DeleteTransaction)))
	mux.HandleFunc("PATCH /api/v1/transactions/{id}/restore", auth(writeRL.LimitUser(h.RestoreTransaction)))

	// Budgets
	mux.HandleFunc("GET /api/v1/budgets", auth(readRL.LimitUser(h.ListBudgets)))
	mux.HandleFunc("POST /api/v1/budgets", auth(writeRL.LimitUser(h.CreateBudget)))
	mux.HandleFunc("PATCH /api/v1/budgets/{id}", auth(writeRL.LimitUser(h.UpdateBudget)))
	mux.HandleFunc("DELETE /api/v1/budgets/{id}", auth(writeRL.LimitUser(h.DeleteBudget)))

	// Dashboard & Analytics
	mux.HandleFunc("GET /api/v1/dashboard", auth(readRL.LimitUser(h.GetDashboard)))
	mux.HandleFunc("GET /api/v1/dashboard/monthly-evolution", auth(readRL.LimitUser(h.GetMonthlyEvolution)))
	mux.HandleFunc("GET /api/v1/dashboard/category-breakdown", auth(readRL.LimitUser(h.GetCategoryBreakdown)))
	mux.HandleFunc("GET /api/v1/analytics/annual-evolution", auth(readRL.LimitUser(h.GetAnnualEvolution)))
	mux.HandleFunc("GET /api/v1/analytics/trends", auth(readRL.LimitUser(h.GetTrends)))

	// Settings
	mux.HandleFunc("GET /api/v1/settings/profile", auth(readRL.LimitUser(h.GetProfile)))
	mux.HandleFunc("PATCH /api/v1/settings/profile", auth(writeRL.LimitUser(h.UpdateProfile)))
	mux.HandleFunc("PATCH /api/v1/settings/change-password", auth(writeRL.LimitUser(h.ChangePassword)))
	mux.HandleFunc("DELETE /api/v1/settings/account", auth(writeRL.LimitUser(h.DeleteMyAccount)))
	mux.HandleFunc("GET /api/v1/settings/initial-balance", auth(readRL.LimitUser(h.GetInitialBalance)))
	mux.HandleFunc("PATCH /api/v1/settings/initial-balance", auth(writeRL.LimitUser(h.UpdateInitialBalance)))

	// Accounts & Transfers
	mux.HandleFunc("GET /api/v1/accounts", auth(readRL.LimitUser(h.ListAccounts)))
	mux.HandleFunc("POST /api/v1/accounts", auth(writeRL.LimitUser(h.CreateAccount)))
	mux.HandleFunc("PATCH /api/v1/accounts/{id}", auth(writeRL.LimitUser(h.UpdateAccount)))
	mux.HandleFunc("DELETE /api/v1/accounts/{id}", auth(writeRL.LimitUser(h.DeleteAccount)))
	mux.HandleFunc("POST /api/v1/transfers", auth(writeRL.LimitUser(h.CreateTransfer)))

	// Credit Cards & Invoices
	mux.HandleFunc("GET /api/v1/cards", auth(readRL.LimitUser(h.ListCards)))
	mux.HandleFunc("POST /api/v1/cards", auth(writeRL.LimitUser(h.CreateCard)))
	mux.HandleFunc("PATCH /api/v1/cards/{id}", auth(writeRL.LimitUser(h.UpdateCard)))
	mux.HandleFunc("DELETE /api/v1/cards/{id}", auth(writeRL.LimitUser(h.DeleteCard)))
	mux.HandleFunc("GET /api/v1/cards/{id}/invoices", auth(readRL.LimitUser(h.ListCardInvoices)))
	mux.HandleFunc("GET /api/v1/cards/{id}/invoices/{month}", auth(readRL.LimitUser(h.ListInvoiceTransactions)))
	mux.HandleFunc("POST /api/v1/cards/{id}/invoices/{month}/pay", auth(writeRL.LimitUser(h.PayCardInvoice)))

	// Import
	mux.HandleFunc("POST /api/v1/import/preview", auth(writeRL.LimitUser(h.PreviewImport)))
	mux.HandleFunc("POST /api/v1/import/confirm", auth(writeRL.LimitUser(h.ConfirmImport)))

	// Goals
	mux.HandleFunc("GET /api/v1/goals", auth(readRL.LimitUser(h.ListGoals)))
	mux.HandleFunc("POST /api/v1/goals", auth(writeRL.LimitUser(h.CreateGoal)))
	mux.HandleFunc("PATCH /api/v1/goals/{id}", auth(writeRL.LimitUser(h.UpdateGoal)))
	mux.HandleFunc("DELETE /api/v1/goals/{id}", auth(writeRL.LimitUser(h.DeleteGoal)))

	// Alerts
	mux.HandleFunc("GET /api/v1/alerts", auth(readRL.LimitUser(h.ListAlerts)))
	mux.HandleFunc("PATCH /api/v1/alerts/{id}/read", auth(writeRL.LimitUser(h.MarkAlertRead)))
	mux.HandleFunc("DELETE /api/v1/alerts", auth(writeRL.LimitUser(h.ClearReadAlerts)))
}
