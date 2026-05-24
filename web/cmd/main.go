package main

import (
	"log"
	"net/http"

	"github.com/nilbyte/tallyoh/web/internal/config"
	"github.com/nilbyte/tallyoh/web/internal/handlers"
)

func main() {
	cfg := config.Load()
	h := handlers.New(cfg)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", h.Root)
	mux.HandleFunc("GET /login", h.LoginPage)
	mux.HandleFunc("POST /login", h.Login)
	mux.HandleFunc("POST /logout", h.Logout)
	mux.HandleFunc("GET /transactions", h.TransactionsPage)
	mux.HandleFunc("GET /transactions/new-form", h.NewTransactionForm)
	mux.HandleFunc("POST /transactions", h.CreateTransaction)
	mux.HandleFunc("DELETE /transactions/{id}", h.DeleteTransaction)

	log.Printf("Web listening on :%s  (API: %s)", cfg.Port, cfg.APIURL)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatal(err)
	}
}
