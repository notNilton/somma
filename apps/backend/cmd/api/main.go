package main

import (
	"log"
	"net/http"

	"github.com/nilbyte/mirante/backend-v2/internal/config"
	"github.com/nilbyte/mirante/backend-v2/internal/database"
	"github.com/nilbyte/mirante/backend-v2/internal/routes"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	routes.Register(mux, db, []byte(cfg.JWTSecret))

	log.Printf("starting server on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
