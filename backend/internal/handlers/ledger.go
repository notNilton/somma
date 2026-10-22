package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/money"
)

// O app trabalha com datas de calendário no horário de Brasília (sem horário de verão desde 2019).
var brt = time.FixedZone("BRT", -3*60*60)

// parseDay lê YYYY-MM-DD como o início desse dia em Brasília.
func parseDay(s string) (time.Time, error) {
	return time.ParseInLocation(time.DateOnly, s, brt)
}

// dayTimestamp guarda um dia de calendário ao meio-dia de Brasília, longe da virada de data.
func dayTimestamp(day time.Time) pgtype.Timestamptz {
	t := time.Date(day.Year(), day.Month(), day.Day(), 12, 0, 0, 0, brt)
	return pgtype.Timestamptz{Time: t, Valid: true}
}

type ledgerTransaction struct {
	ID                 string  `json:"id"`
	Type               string  `json:"type"`
	Kind               string  `json:"kind"`
	Status             string  `json:"status"`
	Amount             float64 `json:"amount"`
	Description        string  `json:"description"`
	Date               string  `json:"date"`
	Notes              *string `json:"notes,omitempty"`
	CategoryID         *string `json:"categoryId,omitempty"`
	CardID             *string `json:"cardId,omitempty"`
	AccountID          *string `json:"accountId,omitempty"`
	TransferID         *string `json:"transferId,omitempty"`
	IsTransfer         bool    `json:"isTransfer"`
	InstallmentGroupID *string `json:"installmentGroupId,omitempty"`
	InstallmentNumber  *int16  `json:"installmentNumber,omitempty"`
	TotalInstallments  *int16  `json:"totalInstallments,omitempty"`
	IsInvoicePayment   bool    `json:"isInvoicePayment"`
	IsRecurring        bool    `json:"isRecurring"`
	RecurringOriginID  *string `json:"recurringOriginId,omitempty"`
}

// ListLedger atende GET /api/v1/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD (to inclusivo).
func (h *Handler) ListLedger(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	from, err := parseDay(r.URL.Query().Get("from"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "from must be YYYY-MM-DD")
		return
	}
	to, err := parseDay(r.URL.Query().Get("to"))
	if err != nil || to.Before(from) {
		writeError(w, http.StatusBadRequest, "to must be YYYY-MM-DD and not before from")
		return
	}

	rows, err := h.queries.ListLedgerTransactions(r.Context(), database.ListLedgerTransactionsParams{
		UserID:   claims.UserID,
		DateFrom: pgtype.Timestamptz{Time: from, Valid: true},
		DateTo:   pgtype.Timestamptz{Time: to.AddDate(0, 0, 1), Valid: true},
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list transactions")
		return
	}

	items := make([]ledgerTransaction, len(rows))
	for i, t := range rows {
		items[i] = toLedgerTransaction(t)
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func toLedgerTransaction(t database.ListLedgerTransactionsRow) ledgerTransaction {
	return ledgerTransaction{
		ID:                 t.ID,
		Type:               t.Type,
		Kind:               t.Kind,
		Status:             t.Status,
		Amount:             money.ToReais(t.AmountCents),
		Description:        t.Description,
		Date:               t.Date.Time.In(brt).Format(time.DateOnly),
		Notes:              t.Notes,
		CategoryID:         t.CategoryID,
		CardID:             t.CardID,
		AccountID:          t.AccountID,
		TransferID:         t.TransferID,
		IsTransfer:         t.IsTransfer,
		InstallmentGroupID: t.InstallmentGroupID,
		InstallmentNumber:  t.InstallmentNumber,
		TotalInstallments:  t.TotalInstallments,
		IsInvoicePayment:   t.IsInvoicePayment,
		IsRecurring:        t.IsRecurring,
		RecurringOriginID:  t.RecurringOriginID,
	}
}

// ownedAccount confirma que a conta existe, está ativa e é do usuário.
func ownedAccount(ctx context.Context, qtx *database.Queries, userID, accountID string) bool {
	acc, err := qtx.GetAccountByID(ctx, accountID)
	return err == nil && acc.IsActive && uuidToString(acc.UserID) == userID
}

type updateLedgerRequest struct {
	Type        string  `json:"type"`
	Kind        string  `json:"kind"`
	Amount      float64 `json:"amount"`
	Description string  `json:"description"`
	Date        string  `json:"date"`
	CategoryID  string  `json:"categoryId"`
	AccountID   string  `json:"accountId"`
	// Marcar num lançamento avulso o transforma na origem de uma série mensal.
	IsRecurring       bool   `json:"isRecurring"`
	RecurrenceEndDate string `json:"recurrenceEndDate"`
}

var validKinds = map[string]bool{"INCOME": true, "EXPENSE": true, "CREDIT": true, "SAVING": true, "BUDGET": true}

// UpdateLedger atende PATCH /api/v1/transactions/{id}. O drawer do web envia o
// formulário inteiro, então os vínculos ausentes (conta, categoria) ficam vazios.
func (h *Handler) UpdateLedger(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req updateLedgerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Type != "INCOME" && req.Type != "EXPENSE" {
		writeError(w, http.StatusBadRequest, "tipo deve ser INCOME ou EXPENSE")
		return
	}
	if req.Kind == "" {
		req.Kind = req.Type
	}
	if !validKinds[req.Kind] {
		writeError(w, http.StatusBadRequest, "kind inválido")
		return
	}
	amountCents := money.ToCents(req.Amount)
	if amountCents <= 0 {
		writeError(w, http.StatusBadRequest, "valor deve ser maior que zero")
		return
	}
	day, err := parseDay(req.Date)
	if err != nil {
		writeError(w, http.StatusBadRequest, "data deve ser YYYY-MM-DD")
		return
	}
	description := strings.TrimSpace(req.Description)
	if len(description) > 255 {
		writeError(w, http.StatusBadRequest, "descrição deve ter até 255 caracteres")
		return
	}
	accountID, categoryID := optional(req.AccountID), optional(req.CategoryID)
	if req.Kind == "CREDIT" && accountID == nil {
		writeError(w, http.StatusBadRequest, "selecione a conta do cartão de crédito")
		return
	}

	ctx := r.Context()
	dbTx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update transaction")
		return
	}
	defer dbTx.Rollback(ctx)
	qtx := h.queries.WithTx(dbTx)

	current, err := qtx.GetLedgerTransactionForUpdate(ctx, database.GetLedgerTransactionForUpdateParams{
		ID:     r.PathValue("id"),
		UserID: claims.UserID,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update transaction")
		return
	}
	if accountID != nil && !ownedAccount(ctx, qtx, claims.UserID, *accountID) {
		writeError(w, http.StatusBadRequest, "conta não encontrada")
		return
	}
	makeRecurring := req.IsRecurring && !current.IsRecurring
	var occurrences int
	var recurrenceEnd pgtype.Date
	if makeRecurring {
		if current.InstallmentGroupID != nil {
			writeError(w, http.StatusBadRequest, "compra parcelada não pode virar recorrente")
			return
		}
		if occurrences, recurrenceEnd, err = parseRecurrence(day, req.RecurrenceEndDate); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}
	var cardID *string
	switch {
	case current.IsInvoicePayment:
		cardID = current.CardID // pagamento de fatura continua ligado ao cartão que pagou
	case req.Kind == "CREDIT":
		id, err := ensureAccountCard(ctx, dbTx, claims.UserID, *accountID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to resolve credit card")
			return
		}
		cardID = &id
	}

	updated, err := qtx.UpdateLedgerTransaction(ctx, database.UpdateLedgerTransactionParams{
		ID:          current.ID,
		UserID:      claims.UserID,
		Type:        req.Type,
		Kind:        req.Kind,
		AmountCents: amountCents,
		Description: description,
		Date:        dayTimestamp(day),
		CategoryID:  categoryID,
		AccountID:   accountID,
		CardID:      cardID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update transaction")
		return
	}

	if makeRecurring {
		err = qtx.MarkRecurringOrigin(ctx, database.MarkRecurringOriginParams{
			ID:                updated.ID,
			UserID:            claims.UserID,
			RecurrenceEndDate: recurrenceEnd,
		})
		if err == nil {
			err = createRecurringCopies(ctx, qtx, database.CreateLedgerTransactionParams{
				UserID:      claims.UserID,
				Type:        updated.Type,
				Kind:        updated.Kind,
				Status:      updated.Status,
				AmountCents: updated.AmountCents,
				Description: updated.Description,
				Notes:       updated.Notes,
				CategoryID:  updated.CategoryID,
				AccountID:   updated.AccountID,
				CardID:      updated.CardID,
			}, day, updated.ID, occurrences, recurrenceEnd)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create recurrence")
			return
		}
		updated.IsRecurring = true
	}

	if err := dbTx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update transaction")
		return
	}

	writeJSON(w, http.StatusOK, toLedgerTransaction(database.ListLedgerTransactionsRow(updated)))
}

// DeleteLedger atende DELETE /api/v1/transactions/{id}: exclusão lógica.
func (h *Handler) DeleteLedger(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	ctx := r.Context()
	dbTx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete transaction")
		return
	}
	defer dbTx.Rollback(ctx)
	qtx := h.queries.WithTx(dbTx)

	current, err := qtx.GetLedgerTransactionForUpdate(ctx, database.GetLedgerTransactionForUpdateParams{
		ID:     r.PathValue("id"),
		UserID: claims.UserID,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete transaction")
		return
	}

	// ?scope=following numa recorrência exclui esta ocorrência e as seguintes da série.
	if r.URL.Query().Get("scope") == "following" && current.IsRecurring {
		seriesID := current.ID
		if current.RecurringOriginID != nil {
			seriesID = *current.RecurringOriginID
		}
		_, err = qtx.SoftDeleteRecurringFrom(ctx, database.SoftDeleteRecurringFromParams{
			UserID:   claims.UserID,
			SeriesID: seriesID,
			FromDate: current.Date,
		})
	} else {
		err = qtx.SoftDeleteLedgerTransaction(ctx, database.SoftDeleteLedgerTransactionParams{
			ID:     current.ID,
			UserID: claims.UserID,
		})
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete transaction")
		return
	}

	if err := dbTx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete transaction")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type createLedgerRequest struct {
	Type              string  `json:"type"`
	Kind              string  `json:"kind"`
	Status            string  `json:"status"`
	Amount            float64 `json:"amount"`
	Description       string  `json:"description"`
	Date              string  `json:"date"`
	Notes             string  `json:"notes"`
	CategoryID        string  `json:"categoryId"`
	AccountID         string  `json:"accountId"`
	TotalInstallments int     `json:"totalInstallments"`
	// Recorrência mensal: sem data final, gera 12 ocorrências.
	IsRecurring       bool   `json:"isRecurring"`
	RecurrenceEndDate string `json:"recurrenceEndDate"`
}

const (
	defaultRecurrences = 12 // recorrência sem data final: um ano de ocorrências
	maxRecurrences     = 60
)

// parseRecurrence devolve quantas ocorrências mensais gerar a partir de day e a
// data final a gravar (vazia = sem fim, 12 meses).
func parseRecurrence(day time.Time, endDate string) (int, pgtype.Date, error) {
	if endDate == "" {
		return defaultRecurrences, pgtype.Date{}, nil
	}
	end, err := parseDay(endDate)
	if err != nil || end.Before(day) {
		return 0, pgtype.Date{}, errors.New("data final da recorrência deve ser YYYY-MM-DD e não antes da data")
	}
	n := monthsUntil(day, end)
	if n > maxRecurrences {
		return 0, pgtype.Date{}, errors.New("recorrência de no máximo 5 anos")
	}
	return n, pgtype.Date{Time: end, Valid: true}, nil
}

// createRecurringCopies cria as ocorrências 2..n da série cuja origem é originID,
// copiando os dados de params e avançando um mês por vez a partir de day.
func createRecurringCopies(ctx context.Context, qtx *database.Queries, params database.CreateLedgerTransactionParams,
	day time.Time, originID string, occurrences int, end pgtype.Date) error {
	monthly := "MONTHLY"
	params.IsRecurring, params.RecurrenceFreq, params.RecurrenceEndDate = true, &monthly, end
	params.RecurringOriginID = &originID
	params.InstallmentGroupID, params.InstallmentNumber, params.TotalInstallments = nil, nil, nil
	for i := 1; i < occurrences; i++ {
		params.Date = dayTimestamp(addMonthsClamped(day, i))
		if _, err := qtx.CreateLedgerTransaction(ctx, params); err != nil {
			return err
		}
	}
	return nil
}

// monthsUntil conta as ocorrências mensais (mesmo dia, limitado ao fim do mês)
// de start até end, inclusive.
func monthsUntil(start, end time.Time) int {
	n := 0
	for !addMonthsClamped(start, n).After(end) {
		n++
		if n > maxRecurrences {
			break
		}
	}
	return n
}

// splitInstallments divide o total em n parcelas; os centavos que sobram vão na primeira.
func splitInstallments(totalCents int64, n int) []int64 {
	parts := make([]int64, n)
	base := totalCents / int64(n)
	for i := range parts {
		parts[i] = base
	}
	parts[0] += totalCents - base*int64(n)
	return parts
}

// addMonthsClamped soma meses mantendo o dia, limitado ao fim do mês (31/01 + 1 → 28/02).
func addMonthsClamped(day time.Time, months int) time.Time {
	first := time.Date(day.Year(), day.Month()+time.Month(months), 1, 0, 0, 0, 0, day.Location())
	last := first.AddDate(0, 1, -1).Day()
	return time.Date(first.Year(), first.Month(), min(day.Day(), last), 0, 0, 0, 0, day.Location())
}

// CreateLedger atende POST /api/v1/transactions. Compras no crédito são feitas
// na conta e vão para o cartão dela (sem mexer no saldo); podem ser parceladas:
// uma linha por mês, ligadas pelo installment_group_id. Os demais tipos movem o
// saldo da conta vinculada.
func (h *Handler) CreateLedger(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req createLedgerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Kind == "" {
		req.Kind = req.Type
	}
	if !validKinds[req.Kind] {
		writeError(w, http.StatusBadRequest, "kind inválido")
		return
	}
	// O tipo segue o kind: só renda é entrada.
	req.Type = "EXPENSE"
	if req.Kind == "INCOME" {
		req.Type = "INCOME"
	}
	if req.Status == "" {
		req.Status = "COMPLETED"
	}
	if req.Status != "COMPLETED" && req.Status != "PENDING" {
		writeError(w, http.StatusBadRequest, "status inválido")
		return
	}
	amountCents := money.ToCents(req.Amount)
	if amountCents <= 0 {
		writeError(w, http.StatusBadRequest, "valor deve ser maior que zero")
		return
	}
	day, err := parseDay(req.Date)
	if err != nil {
		writeError(w, http.StatusBadRequest, "data deve ser YYYY-MM-DD")
		return
	}
	description := strings.TrimSpace(req.Description)
	if len(description) > 240 {
		writeError(w, http.StatusBadRequest, "descrição deve ter até 240 caracteres")
		return
	}

	accountID := optional(req.AccountID)
	installments := 1
	if req.Kind == "CREDIT" {
		if accountID == nil {
			writeError(w, http.StatusBadRequest, "selecione a conta do cartão de crédito")
			return
		}
		if req.TotalInstallments > 1 {
			installments = req.TotalInstallments
		}
		if installments > 48 {
			writeError(w, http.StatusBadRequest, "máximo de 48 parcelas")
			return
		}
	}

	occurrences := 1
	var recurrenceEnd pgtype.Date
	if req.IsRecurring {
		if installments > 1 {
			writeError(w, http.StatusBadRequest, "use parcelamento ou recorrência, não os dois")
			return
		}
		if occurrences, recurrenceEnd, err = parseRecurrence(day, req.RecurrenceEndDate); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	ctx := r.Context()
	dbTx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create transaction")
		return
	}
	defer dbTx.Rollback(ctx)
	qtx := h.queries.WithTx(dbTx)

	if accountID != nil && !ownedAccount(ctx, qtx, claims.UserID, *accountID) {
		writeError(w, http.StatusBadRequest, "conta não encontrada")
		return
	}
	var cardID *string
	if req.Kind == "CREDIT" {
		id, err := ensureAccountCard(ctx, dbTx, claims.UserID, *accountID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to resolve credit card")
			return
		}
		cardID = &id
	}

	params := database.CreateLedgerTransactionParams{
		UserID:     claims.UserID,
		Type:       req.Type,
		Kind:       req.Kind,
		Status:     req.Status,
		Notes:      optional(req.Notes),
		CategoryID: optional(req.CategoryID),
		AccountID:  accountID,
		CardID:     cardID,
	}
	var first database.CreateLedgerTransactionRow
	if req.IsRecurring {
		// Cada mês vira um lançamento; a primeira ocorrência é a origem da série.
		monthly := "MONTHLY"
		params.IsRecurring, params.RecurrenceFreq, params.RecurrenceEndDate = true, &monthly, recurrenceEnd
		params.AmountCents, params.Description, params.Date = amountCents, description, dayTimestamp(day)
		if first, err = qtx.CreateLedgerTransaction(ctx, params); err == nil {
			err = createRecurringCopies(ctx, qtx, params, day, first.ID, occurrences, recurrenceEnd)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create transaction")
			return
		}
	} else {
		var groupID *string
		if installments > 1 {
			id := uuid.NewString()
			groupID = &id
		}
		for i, partCents := range splitInstallments(amountCents, installments) {
			params.AmountCents = partCents
			params.Date = dayTimestamp(addMonthsClamped(day, i))
			params.Description = description
			if groupID != nil {
				n, total := int16(i+1), int16(installments)
				params.InstallmentGroupID, params.InstallmentNumber, params.TotalInstallments = groupID, &n, &total
				params.Description = strings.TrimSpace(fmt.Sprintf("%s (%d/%d)", description, n, total))
			}
			row, err := qtx.CreateLedgerTransaction(ctx, params)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to create transaction")
				return
			}
			if i == 0 {
				first = row
			}
		}
	}

	if err := dbTx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create transaction")
		return
	}
	writeJSON(w, http.StatusCreated, toLedgerTransaction(database.ListLedgerTransactionsRow(first)))
}
