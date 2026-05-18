package handlers

import (
	"context"
	"net/http"

	"github.com/nilbyte/tallyoh/backend/internal/version"
)

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	dbStatus := "connected"
	if err := h.db.Ping(context.Background()); err != nil {
		dbStatus = "disconnected"
	}

	var migrationVersion string
	if dbStatus == "connected" {
		h.db.QueryRow(context.Background(), `
			SELECT version::TEXT FROM schema_migrations ORDER BY version DESC LIMIT 1
		`).Scan(&migrationVersion)
	}

	status := http.StatusOK
	if dbStatus == "disconnected" {
		status = http.StatusServiceUnavailable
	}

	writeJSON(w, status, map[string]string{
		"status":           "ok",
		"database":         dbStatus,
		"version":          version.Version,
		"migrationVersion": migrationVersion,
	})
}
