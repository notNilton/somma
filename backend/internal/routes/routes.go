package routes

import (
	"net/http"

	"github.com/nilbyte/somma/backend/internal/handlers"
	"github.com/nilbyte/somma/backend/internal/middleware"
)

func Register(mux *http.ServeMux, h *handlers.Handler, jwtKey []byte) {
	auth := middleware.Auth(jwtKey, nil)

	// Health
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth (Público)
	mux.HandleFunc("POST /auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /auth/login", h.Login)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("POST /api/auth/logout", h.Logout)

	// Dashboard
	mux.HandleFunc("GET /dashboard", auth(h.GetDashboard))
	mux.HandleFunc("GET /api/dashboard", auth(h.GetDashboard))
	mux.HandleFunc("GET /api/v1/dashboard", auth(h.GetDashboard))

	// Accounts
	mux.HandleFunc("POST /accounts", auth(h.CreateAccount))
	mux.HandleFunc("POST /api/accounts", auth(h.CreateAccount))
	mux.HandleFunc("GET /accounts", auth(h.ListAccounts))
	mux.HandleFunc("GET /api/accounts", auth(h.ListAccounts))
	mux.HandleFunc("GET /api/v1/accounts", auth(h.ListAccounts))
	mux.HandleFunc("POST /api/v1/accounts", auth(h.CreateAccount))
	mux.HandleFunc("PATCH /api/v1/accounts/{id}", auth(h.UpdateAccount))
	mux.HandleFunc("DELETE /api/v1/accounts/{id}", auth(h.DeleteAccount))

	// Transactions
	mux.HandleFunc("POST /transactions", auth(h.CreateTransaction))
	mux.HandleFunc("POST /api/transactions", auth(h.CreateTransaction))
	mux.HandleFunc("GET /transactions", auth(h.ListTransactions))
	mux.HandleFunc("GET /api/transactions", auth(h.ListTransactions))
	mux.HandleFunc("GET /api/v1/transactions", auth(h.ListLedger))
	mux.HandleFunc("POST /api/v1/transactions", auth(h.CreateLedger))
	mux.HandleFunc("GET /api/v1/categories", auth(h.ListCategories))
	mux.HandleFunc("GET /api/v1/cards", auth(h.ListCreditCards))
	mux.HandleFunc("PUT /api/v1/accounts/{id}/card", auth(h.UpsertAccountCard))
	mux.HandleFunc("POST /api/v1/accounts/{id}/card/payments", auth(h.PayAccountCard))
	mux.HandleFunc("PATCH /api/v1/cards/{id}", auth(h.UpdateCreditCard))
	mux.HandleFunc("DELETE /api/v1/cards/{id}", auth(h.DeleteCreditCard))
	mux.HandleFunc("PATCH /api/v1/transactions/{id}", auth(h.UpdateLedger))
	mux.HandleFunc("DELETE /api/v1/transactions/{id}", auth(h.DeleteLedger))

	// Credit Cards
	mux.HandleFunc("POST /cards", auth(h.CreateCard))
	mux.HandleFunc("POST /api/cards", auth(h.CreateCard))
	mux.HandleFunc("GET /cards", auth(h.ListCards))
	mux.HandleFunc("GET /api/cards", auth(h.ListCards))
	mux.HandleFunc("POST /cards/{id}/purchases", auth(h.CreatePurchase))
	mux.HandleFunc("POST /api/cards/{id}/purchases", auth(h.CreatePurchase))
	mux.HandleFunc("GET /cards/{id}/invoices", auth(h.ListCardInvoices))
	mux.HandleFunc("GET /api/cards/{id}/invoices", auth(h.ListCardInvoices))

	// Invoices
	mux.HandleFunc("POST /invoices/{id}/pay", auth(h.PayInvoice))
	mux.HandleFunc("POST /api/invoices/{id}/pay", auth(h.PayInvoice))
}
