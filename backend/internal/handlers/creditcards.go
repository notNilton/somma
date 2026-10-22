package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/money"
)

// Cartão de crédito como função da conta bancária: cada conta tem no máximo um
// cartão (credit_cards.account_id), criado na primeira compra no crédito ou ao
// configurar limite e datas em PUT /api/v1/accounts/{id}/card.
// Usa pgx direto: o schema.sql do sqlc descreve outro credit_cards (o do card_service),
// incompatível com a tabela real.

var last4Pattern = regexp.MustCompile(`^[0-9]{4}$`)

type creditCardResponse struct {
	ID                  string  `json:"id"`
	UserID              string  `json:"userId"`
	Name                string  `json:"name"`
	AccountID           *string `json:"accountId"`
	Brand               *string `json:"brand,omitempty"`
	Last4               *string `json:"last4,omitempty"`
	CreditLimit         float64 `json:"creditLimit"`
	CreditLimitCents    int64   `json:"creditLimitCents"`
	AvailableLimit      float64 `json:"availableLimit"`
	AvailableLimitCents int64   `json:"availableLimitCents"`
	ClosingDay          int16   `json:"closingDay"`
	DueDay              int16   `json:"dueDay"`
	IsActive            bool    `json:"isActive"`
	CreatedAt           string  `json:"createdAt"`
	UpdatedAt           string  `json:"updatedAt"`
}

// O limite usado é a soma das compras no crédito ativas (inclusive parcelas e
// recorrências futuras) menos os pagamentos de fatura já feitos.
const cardSelect = `
	SELECT c.id, c.user_id, c.name, c.account_id, c.brand, c.last4, c.credit_limit_cents,
	       c.credit_limit_cents - GREATEST(COALESCE((
	           SELECT SUM(CASE WHEN t.is_invoice_payment THEN -t.amount_cents ELSE t.amount_cents END)
	           FROM transactions t
	           WHERE t.card_id = c.id AND t.is_active AND t.deleted_at IS NULL AND t.status <> 'CANCELED'
	             AND (t.kind = 'CREDIT' OR (t.is_invoice_payment AND t.date <= NOW()))
	       ), 0), 0) AS available_cents,
	       c.closing_day, c.due_day, c.is_active, c.created_at, c.updated_at
	FROM credit_cards c`

func scanCard(row pgx.Row) (creditCardResponse, error) {
	var c creditCardResponse
	var created, updated time.Time
	err := row.Scan(&c.ID, &c.UserID, &c.Name, &c.AccountID, &c.Brand, &c.Last4, &c.CreditLimitCents,
		&c.AvailableLimitCents, &c.ClosingDay, &c.DueDay, &c.IsActive, &created, &updated)
	c.CreditLimit = money.ToReais(c.CreditLimitCents)
	c.AvailableLimit = money.ToReais(c.AvailableLimitCents)
	c.CreatedAt, c.UpdatedAt = created.Format(time.RFC3339), updated.Format(time.RFC3339)
	return c, err
}

func (h *Handler) getCard(ctx context.Context, userID, cardID string) (creditCardResponse, error) {
	return scanCard(h.db.QueryRow(ctx, cardSelect+` WHERE c.id = $1 AND c.user_id = $2 AND c.is_active`, cardID, userID))
}

// ensureAccountCard devolve o cartão da conta, criando-o (sem limite, fecha dia 5,
// vence dia 15) se a conta ainda não tiver um. A conta já deve ter sido validada.
func ensureAccountCard(ctx context.Context, tx pgx.Tx, userID, accountID string) (string, error) {
	var id string
	err := tx.QueryRow(ctx,
		`SELECT id FROM credit_cards WHERE account_id = $1 AND user_id = $2 AND is_active`,
		accountID, userID).Scan(&id)
	if !errors.Is(err, pgx.ErrNoRows) {
		return id, err
	}
	err = tx.QueryRow(ctx, `
		INSERT INTO credit_cards (user_id, account_id, name, credit_limit_cents, closing_day, due_day)
		SELECT user_id, id, name, 0, 5, 15 FROM accounts WHERE id = $1 AND user_id = $2
		RETURNING id`, accountID, userID).Scan(&id)
	return id, err
}

type cardRequest struct {
	Name        *string  `json:"name"`
	Brand       *string  `json:"brand"`
	Last4       *string  `json:"last4"`
	CreditLimit *float64 `json:"creditLimit"`
	ClosingDay  *int     `json:"closingDay"`
	DueDay      *int     `json:"dueDay"`
}

// cardFields são os valores já validados que vão para o banco.
type cardFields struct {
	name               string
	brand, last4       *string
	limitCents         int64
	closingDay, dueDay int
}

func (f *cardFields) apply(req cardRequest) error {
	if req.Name != nil {
		f.name = strings.TrimSpace(*req.Name)
	}
	if req.Brand != nil {
		f.brand = optional(*req.Brand)
	}
	if req.Last4 != nil {
		f.last4 = optional(*req.Last4)
	}
	if req.CreditLimit != nil {
		f.limitCents = money.ToCents(*req.CreditLimit)
	}
	if req.ClosingDay != nil {
		f.closingDay = *req.ClosingDay
	}
	if req.DueDay != nil {
		f.dueDay = *req.DueDay
	}

	switch {
	case f.name == "":
		return errors.New("nome do cartão é obrigatório")
	case len(f.name) > 80:
		return errors.New("nome deve ter até 80 caracteres")
	case f.last4 != nil && !last4Pattern.MatchString(*f.last4):
		return errors.New("final do cartão deve ter 4 dígitos")
	case f.limitCents < 0:
		return errors.New("limite não pode ser negativo")
	case f.closingDay < 1 || f.closingDay > 31 || f.dueDay < 1 || f.dueDay > 31:
		return errors.New("dias de fechamento e vencimento devem estar entre 1 e 31")
	}
	return nil
}

func (h *Handler) ListCreditCards(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.Query(r.Context(), cardSelect+` WHERE c.user_id = $1 AND c.is_active ORDER BY c.name`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list cards")
		return
	}
	defer rows.Close()

	cards := []creditCardResponse{}
	for rows.Next() {
		c, err := scanCard(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list cards")
			return
		}
		cards = append(cards, c)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "failed to list cards")
		return
	}
	writeJSON(w, http.StatusOK, cards)
}

// UpsertAccountCard atende PUT /api/v1/accounts/{id}/card: configura limite,
// fechamento e vencimento do cartão da conta, criando-o se preciso.
func (h *Handler) UpsertAccountCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req cardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	dbTx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save card")
		return
	}
	defer dbTx.Rollback(ctx)

	accountID := r.PathValue("id")
	if !ownedAccount(ctx, h.queries.WithTx(dbTx), claims.UserID, accountID) {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}
	cardID, err := ensureAccountCard(ctx, dbTx, claims.UserID, accountID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save card")
		return
	}

	f := cardFields{name: "-", closingDay: 5, dueDay: 15}
	err = dbTx.QueryRow(ctx, `
		SELECT a.name, c.brand, c.last4, c.credit_limit_cents, c.closing_day, c.due_day
		FROM credit_cards c JOIN accounts a ON a.id = c.account_id
		WHERE c.id = $1`, cardID).Scan(&f.name, &f.brand, &f.last4, &f.limitCents, &f.closingDay, &f.dueDay)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save card")
		return
	}
	req.Name = nil // o cartão leva o nome da conta
	if err := f.apply(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	_, err = dbTx.Exec(ctx, `
		UPDATE credit_cards
		SET name = $2, brand = $3, last4 = $4, credit_limit_cents = $5,
		    closing_day = $6, due_day = $7, updated_at = NOW()
		WHERE id = $1`,
		cardID, f.name, f.brand, f.last4, f.limitCents, f.closingDay, f.dueDay)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save card")
		return
	}
	if err := dbTx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save card")
		return
	}

	card, err := h.getCard(ctx, claims.UserID, cardID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load card")
		return
	}
	writeJSON(w, http.StatusOK, card)
}

func (h *Handler) UpdateCreditCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req cardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	current, err := h.getCard(r.Context(), claims.UserID, r.PathValue("id"))
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update card")
		return
	}

	f := cardFields{
		name:       current.Name,
		brand:      current.Brand,
		last4:      current.Last4,
		limitCents: current.CreditLimitCents,
		closingDay: int(current.ClosingDay),
		dueDay:     int(current.DueDay),
	}
	if err := f.apply(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	_, err = h.db.Exec(r.Context(), `
		UPDATE credit_cards
		SET name = $3, brand = $4, last4 = $5, credit_limit_cents = $6,
		    closing_day = $7, due_day = $8, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND is_active`,
		current.ID, claims.UserID, f.name, f.brand, f.last4, f.limitCents, f.closingDay, f.dueDay)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update card")
		return
	}

	card, err := h.getCard(r.Context(), claims.UserID, current.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load card")
		return
	}
	writeJSON(w, http.StatusOK, card)
}

func (h *Handler) DeleteCreditCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tag, err := h.db.Exec(r.Context(), `
		UPDATE credit_cards SET is_active = FALSE, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND is_active`,
		r.PathValue("id"), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete card")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type invoicePaymentRequest struct {
	Amount        float64 `json:"amount"`
	Date          string  `json:"date"`
	FromAccountID string  `json:"fromAccountId"`
}

// PayAccountCard atende POST /api/v1/accounts/{id}/card/payments: registra o
// pagamento da fatura do cartão da conta {id}. O dinheiro sai da conta
// fromAccountId (padrão: a própria conta) e o valor volta como limite do cartão.
func (h *Handler) PayAccountCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req invoicePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
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

	ctx := r.Context()
	dbTx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record payment")
		return
	}
	defer dbTx.Rollback(ctx)
	qtx := h.queries.WithTx(dbTx)

	cardAccountID := r.PathValue("id")
	fromAccountID := cardAccountID
	if req.FromAccountID != "" {
		fromAccountID = req.FromAccountID
	}
	if !ownedAccount(ctx, qtx, claims.UserID, cardAccountID) || !ownedAccount(ctx, qtx, claims.UserID, fromAccountID) {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	var cardID, cardName string
	err = dbTx.QueryRow(ctx, `
		SELECT c.id, a.name FROM credit_cards c JOIN accounts a ON a.id = c.account_id
		WHERE c.account_id = $1 AND c.user_id = $2 AND c.is_active`,
		cardAccountID, claims.UserID).Scan(&cardID, &cardName)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "esta conta ainda não tem cartão de crédito")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record payment")
		return
	}

	row, err := qtx.CreateLedgerTransaction(ctx, database.CreateLedgerTransactionParams{
		UserID:           claims.UserID,
		Type:             "EXPENSE",
		Kind:             "EXPENSE",
		Status:           "COMPLETED",
		AmountCents:      amountCents,
		Date:             dayTimestamp(day),
		Description:      "Pagamento da fatura · " + cardName,
		AccountID:        &fromAccountID,
		CardID:           &cardID,
		IsInvoicePayment: true,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record payment")
		return
	}
	if err := dbTx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record payment")
		return
	}
	writeJSON(w, http.StatusCreated, toLedgerTransaction(database.ListLedgerTransactionsRow(row)))
}
