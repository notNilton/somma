package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
)

func (h *Handler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userUUID, err := stringToUUID(claims.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id in claims")
		return
	}

	var req models.CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	accountID := strings.TrimSpace(req.AccountID)
	if accountID == "" {
		writeError(w, http.StatusBadRequest, "invalid accountId")
		return
	}

	if req.AmountCents <= 0 {
		writeError(w, http.StatusBadRequest, "amount must be greater than zero")
		return
	}

	req.Type = strings.ToLower(strings.TrimSpace(req.Type))
	txType := database.TransactionType(req.Type)
	switch txType {
	case database.TransactionTypePixIn, database.TransactionTypePixOut, database.TransactionTypeDebit, database.TransactionTypeTransfer:
		// válidos
	default:
		writeError(w, http.StatusBadRequest, "invalid transaction type (allowed: pix_in, pix_out, debit, transfer)")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start database transaction")
		return
	}
	defer tx.Rollback(r.Context())

	qtx := h.queries.WithTx(tx)

	account, err := qtx.GetAccountForUpdate(r.Context(), accountID)
	if err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}
	if account.UserID != userUUID {
		writeError(w, http.StatusForbidden, "account belongs to another user")
		return
	}

	// Atualizar saldo da conta de forma atômica
	var delta int64
	if txType == database.TransactionTypePixIn {
		delta = req.AmountCents
	} else {
		// pix_out, debit, transfer reduzem o saldo
		delta = -req.AmountCents
		if account.BalanceCents+delta < 0 {
			writeError(w, http.StatusBadRequest, "insufficient funds in account")
			return
		}
	}

	_, err = qtx.UpdateAccountBalance(r.Context(), database.UpdateAccountBalanceParams{
		ID:           accountID,
		BalanceCents: delta,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update account balance")
		return
	}

	createdTx, err := qtx.CreateAccountTransaction(r.Context(), database.CreateAccountTransactionParams{
		UserID:      userUUID,
		AccountID:   accountID,
		AmountCents: req.AmountCents,
		Type:        txType,
		Description: strings.TrimSpace(req.Description),
		InvoiceID:   pgtype.UUID{Valid: false},
		OccurredAt:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create account transaction")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":          uuidToString(createdTx.ID),
		"accountId":   createdTx.AccountID,
		"amountCents": createdTx.AmountCents,
		"type":        createdTx.Type,
		"description": createdTx.Description,
		"occurredAt":  createdTx.OccurredAt.Time.Format(time.RFC3339),
	})
}

func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userUUID, err := stringToUUID(claims.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id in claims")
		return
	}

	transactions, err := h.queries.ListAccountTransactionsByUserID(r.Context(), userUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list transactions")
		return
	}

	resp := make([]map[string]any, len(transactions))
	for i, t := range transactions {
		resp[i] = map[string]any{
			"id":          uuidToString(t.ID),
			"accountId":   t.AccountID,
			"amountCents": t.AmountCents,
			"type":        t.Type,
			"description": t.Description,
			"invoiceId":   uuidToString(t.InvoiceID),
			"occurredAt":  t.OccurredAt.Time.Format(time.RFC3339),
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
