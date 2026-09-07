package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/backend/internal/cache"
	"github.com/nilbyte/somma/backend/internal/mail"
)

type Handler struct {
	db           *pgxpool.Pool
	readDB       *pgxpool.Pool
	jwtKey       []byte
	cache        *cache.Cache
	isProduction bool
	mailer       mail.Mailer
	webappURL    string
}

func New(db *pgxpool.Pool, jwtKey []byte, c *cache.Cache, isProduction bool, mailer mail.Mailer, webappURL string) *Handler {
	return NewWithReadDB(db, db, jwtKey, c, isProduction, mailer, webappURL)
}

func NewWithReadDB(db *pgxpool.Pool, readDB *pgxpool.Pool, jwtKey []byte, c *cache.Cache, isProduction bool, mailer mail.Mailer, webappURL string) *Handler {
	if readDB == nil {
		readDB = db
	}
	return &Handler{
		db:           db,
		readDB:       readDB,
		jwtKey:       jwtKey,
		cache:        c,
		isProduction: isProduction,
		mailer:       mailer,
		webappURL:    webappURL,
	}
}

// dbRead returns the read replica pool if configured, or the primary db pool
func (h *Handler) getReadDB() *pgxpool.Pool {
	if h.readDB != nil {
		return h.readDB
	}
	return h.db
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
