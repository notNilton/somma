package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
)

func (h *Handler) PayInvoice(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	invoiceID := r.PathValue("id")
	if strings.TrimSpace(invoiceID) == "" {
		writeError(w, http.StatusBadRequest, "invoice id is required")
		return
	}

	var req models.PayInvoiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.AccountID) == "" {
		writeError(w, http.StatusBadRequest, "accountId is required to pay invoice")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start database transaction")
		return
	}
	defer tx.Rollback(r.Context())

	if err := h.paymentService.PayInvoice(r.Context(), tx, claims.UserID, invoiceID, req.AccountID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit payment transaction")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message":   "invoice paid successfully",
		"invoiceId": invoiceID,
		"accountId": req.AccountID,
		"status":    "paid",
	})
}
