package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/nilbyte/mirante/backend/internal/cache"
	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/money"
)

type createTransferDto struct {
	FromAccountID string  `json:"fromAccountId"`
	ToAccountID   string  `json:"toAccountId"`
	Amount        float64 `json:"amount"`
	Date          string  `json:"date"`
	Description   *string `json:"description"`
	Notes         *string `json:"notes"`
}

func (d *createTransferDto) validate() error {
	if d.FromAccountID == "" {
		return errors.New("fromAccountId is required")
	}
	if d.ToAccountID == "" {
		return errors.New("toAccountId is required")
	}
	if d.FromAccountID == d.ToAccountID {
		return errors.New("fromAccountId and toAccountId must be different")
	}
	if d.Amount <= 0 {
		return errors.New("amount must be > 0")
	}
	if d.Date == "" {
		return errors.New("date is required")
	}
	return nil
}

func (h *Handler) CreateTransfer(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	var dto createTransferDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	parsedDate, err := time.Parse("2006-01-02", dto.Date[:10])
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date format, use YYYY-MM-DD")
		return
	}
	txDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 12, 0, 0, 0, time.UTC)
	amountCents := money.ToCents(dto.Amount)

	desc := "Transferência"
	if dto.Description != nil && *dto.Description != "" {
		desc = *dto.Description
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	var sourceTxID string
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO transactions (
			account_id, user_id, type, classification, payment_method, channel,
			status, amount_cents, date, description, notes, currency_code, affects_account
		) VALUES ($1,$2,'EXPENSE','TRANSFER','DEBIT','BANK','COMPLETED',$3,$4,$5,$6,'BRL',true)
		RETURNING id
	`, dto.FromAccountID, claims.UserID, amountCents, txDate, desc, dto.Notes).Scan(&sourceTxID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	var destTxID string
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO transactions (
			account_id, user_id, type, classification, payment_method, channel,
			status, amount_cents, date, description, notes, currency_code, affects_account
		) VALUES ($1,$2,'INCOME','TRANSFER','DEBIT','BANK','COMPLETED',$3,$4,$5,$6,'BRL',true)
		RETURNING id
	`, dto.ToAccountID, claims.UserID, amountCents, txDate, desc, dto.Notes).Scan(&destTxID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	var transferID string
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO transfers (source_transaction_id, destination_transaction_id)
		VALUES ($1, $2) RETURNING id
	`, sourceTxID, destTxID).Scan(&transferID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":                    transferID,
		"sourceTxId":            sourceTxID,
		"destinationTxId":       destTxID,
		"fromAccountId":         dto.FromAccountID,
		"toAccountId":           dto.ToAccountID,
		"amount":                dto.Amount,
		"date":                  txDate,
		"description":           desc,
	})
}

func (h *Handler) ListTransfers(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT tr.id, tr.created_at,
		       src.id, src.amount_cents, src.date, src.description, src.account_id,
		       dst.id, dst.amount_cents, dst.date, dst.description, dst.account_id
		FROM transfers tr
		JOIN transactions src ON src.id = tr.source_transaction_id
		JOIN transactions dst ON dst.id = tr.destination_transaction_id
		WHERE src.user_id = $1
		  AND src.is_active = true
		ORDER BY tr.created_at DESC
	`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var transfers []any
	for rows.Next() {
		var id, srcID, dstID, srcAccountID, dstAccountID, srcDesc, dstDesc string
		var amountCents int64
		var createdAt, srcDate, dstDate any
		if err := rows.Scan(&id, &createdAt,
			&srcID, &amountCents, &srcDate, &srcDesc, &srcAccountID,
			&dstID, &amountCents, &dstDate, &dstDesc, &dstAccountID,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		transfers = append(transfers, map[string]any{
			"id":        id,
			"createdAt": createdAt,
			"amount":    money.ToReais(amountCents),
			"source": map[string]any{
				"id":          srcID,
				"accountId":   srcAccountID,
				"description": srcDesc,
				"date":        srcDate,
			},
			"destination": map[string]any{
				"id":          dstID,
				"accountId":   dstAccountID,
				"description": dstDesc,
				"date":        dstDate,
			},
		})
	}

	if transfers == nil {
		transfers = []any{}
	}
	writeJSON(w, http.StatusOK, transfers)
}

func (h *Handler) DeleteTransfer(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	id := r.PathValue("id")

	var srcID, dstID string
	if err := h.db.QueryRow(r.Context(), `
		SELECT tr.source_transaction_id, tr.destination_transaction_id
		FROM transfers tr
		JOIN transactions src ON src.id = tr.source_transaction_id
		WHERE tr.id = $1 AND src.user_id = $2
	`, id, claims.UserID).Scan(&srcID, &dstID); err != nil {
		writeError(w, http.StatusNotFound, "transfer not found")
		return
	}

	now := time.Now()
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	tx.Exec(r.Context(), `UPDATE transactions SET is_active=false, deleted_at=$1, updated_at=NOW() WHERE id=$2`, now, srcID)
	tx.Exec(r.Context(), `UPDATE transactions SET is_active=false, deleted_at=$1, updated_at=NOW() WHERE id=$2`, now, dstID)

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	w.WriteHeader(http.StatusNoContent)
}
