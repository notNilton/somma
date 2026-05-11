package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/personalledger/backend/internal/cache"
)

type Handler struct {
	db           *pgxpool.Pool
	jwtKey       []byte
	cache        *cache.Cache
	isProduction bool
}

func New(db *pgxpool.Pool, jwtKey []byte, c *cache.Cache, isProduction bool) *Handler {
	return &Handler{db: db, jwtKey: jwtKey, cache: c, isProduction: isProduction}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
