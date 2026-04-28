package routes

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/mirante/backend/internal/cache"
	"github.com/nilbyte/mirante/backend/internal/handlers"
	"github.com/nilbyte/mirante/backend/internal/middleware"
)

func Register(mux *http.ServeMux, db *pgxpool.Pool, jwtKey []byte, c *cache.Cache) {
	h := handlers.New(db, jwtKey, c)
	auth := middleware.Auth(jwtKey)

	// Health
	mux.HandleFunc("GET /health", h.Health)

	// Auth (público)
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("POST /auth/register", h.Register)
	mux.HandleFunc("POST /auth/login", h.Login)

	// Users
	mux.HandleFunc("GET /users/me", auth(h.GetMe))
	mux.HandleFunc("PATCH /users/me", auth(h.UpdateMe))

	// Accounts
	mux.HandleFunc("GET /api/v1/accounts", auth(h.ListAccounts))
	mux.HandleFunc("GET /api/v1/accounts/credit-summary", auth(h.GetCreditSummary))
	mux.HandleFunc("GET /api/v1/accounts/{id}", auth(h.GetAccount))
	mux.HandleFunc("POST /api/v1/accounts", auth(h.CreateAccount))
	mux.HandleFunc("PATCH /api/v1/accounts/{id}", auth(h.UpdateAccount))
	mux.HandleFunc("DELETE /api/v1/accounts/{id}", auth(h.DeleteAccount))

	// Cards
	mux.HandleFunc("GET /api/v1/cards", auth(h.ListCards))
	mux.HandleFunc("GET /api/v1/cards/{id}", auth(h.GetCard))
	mux.HandleFunc("GET /api/v1/cards/{id}/statement", auth(h.GetCardStatement))
	mux.HandleFunc("POST /api/v1/cards", auth(h.CreateCard))
	mux.HandleFunc("PATCH /api/v1/cards/{id}", auth(h.UpdateCard))
	mux.HandleFunc("DELETE /api/v1/cards/{id}", auth(h.DeleteCard))

	// Transfers
	mux.HandleFunc("GET /api/v1/transfers", auth(h.ListTransfers))
	mux.HandleFunc("POST /api/v1/transfers", auth(h.CreateTransfer))
	mux.HandleFunc("DELETE /api/v1/transfers/{id}", auth(h.DeleteTransfer))

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
	mux.HandleFunc("GET /api/v1/transactions/export", auth(h.ExportTransactionsCSV))
	mux.HandleFunc("GET /api/v1/transactions/future", auth(h.ListFutureTransactions))
	mux.HandleFunc("GET /api/v1/transactions/{id}", auth(h.GetTransaction))
	mux.HandleFunc("POST /api/v1/transactions", auth(h.CreateTransaction))
	mux.HandleFunc("POST /api/v1/transactions/import", auth(h.ImportTransactions))
	mux.HandleFunc("POST /api/v1/transactions/import-csv", auth(h.ImportCSV))
	mux.HandleFunc("PATCH /api/v1/transactions/{id}", auth(h.UpdateTransaction))
	mux.HandleFunc("DELETE /api/v1/transactions/{id}", auth(h.DeleteTransaction))

	// Vehicles
	mux.HandleFunc("GET /api/v1/vehicles", auth(h.ListVehicles))
	mux.HandleFunc("GET /api/v1/vehicles/{id}", auth(h.GetVehicle))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/refuelings", auth(h.GetVehicleRefuelings))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/maintenances", auth(h.GetVehicleMaintenances))
	mux.HandleFunc("GET /api/v1/vehicles/{id}/expenses-stats", auth(h.GetVehicleExpenseStats))
	mux.HandleFunc("POST /api/v1/vehicles", auth(h.CreateVehicle))
	mux.HandleFunc("PATCH /api/v1/vehicles/{id}", auth(h.UpdateVehicle))
	mux.HandleFunc("DELETE /api/v1/vehicles/{id}", auth(h.DeleteVehicle))

	// Account Access (Colaboração)
	mux.HandleFunc("GET /api/v1/accounts/{id}/members", auth(h.ListAccountMembers))
	mux.HandleFunc("POST /api/v1/accounts/{id}/members", auth(h.InviteMember))
	mux.HandleFunc("PATCH /api/v1/accounts/{id}/members/{userId}", auth(h.UpdateMemberRole))
	mux.HandleFunc("DELETE /api/v1/accounts/{id}/members/{userId}", auth(h.RevokeMember))

	// Calendário Financeiro
	mux.HandleFunc("GET /api/v1/calendar", auth(h.GetFinancialCalendar))

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
