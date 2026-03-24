package handlers

import (
	"context"
	"net/http"
)

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	dbStatus := "connected"
	if err := h.db.Ping(context.Background()); err != nil {
		dbStatus = "disconnected"
	}

	status := http.StatusOK
	if dbStatus == "disconnected" {
		status = http.StatusServiceUnavailable
	}

	writeJSON(w, status, map[string]string{
		"status":   "ok",
		"database": dbStatus,
		"version":  "2.0.0",
	})
}
