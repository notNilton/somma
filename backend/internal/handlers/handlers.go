package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/services"
)

type Handler struct {
	db             *pgxpool.Pool
	queries        *database.Queries
	cardService    *services.CardService
	paymentService *services.PaymentService
	jwtKey         []byte
}

func New(
	db *pgxpool.Pool,
	queries *database.Queries,
	cardService *services.CardService,
	paymentService *services.PaymentService,
	jwtKey []byte,
) *Handler {
	return &Handler{
		db:             db,
		queries:        queries,
		cardService:    cardService,
		paymentService: paymentService,
		jwtKey:         jwtKey,
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	src := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}

func stringToUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	return u, err
}
