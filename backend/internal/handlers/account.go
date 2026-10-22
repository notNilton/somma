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
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
	"github.com/nilbyte/somma/backend/internal/money"
)

var bankCodePattern = regexp.MustCompile(`^[0-9]{3}$`)

// accountFields são os campos editáveis já validados e normalizados.
type accountFields struct {
	name, accountType                  string
	bankCode, bankName, holderName     *string
	holderDocumentType, holderDocument *string
}

// optional converte string vazia em NULL.
func optional(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func (f *accountFields) setBank(code, name string) error {
	f.bankCode, f.bankName = optional(code), optional(name)
	if f.bankCode != nil && !bankCodePattern.MatchString(*f.bankCode) {
		return errors.New("código do banco deve ter 3 dígitos")
	}
	return nil
}

func (f *accountFields) setDocument(raw string) error {
	if strings.TrimSpace(raw) == "" {
		f.holderDocument, f.holderDocumentType = nil, nil
		return nil
	}
	digits, docType, err := models.NormalizeDocument(raw)
	if err != nil {
		return err
	}
	f.holderDocument, f.holderDocumentType = &digits, &docType
	return nil
}

func (f *accountFields) validate() error {
	f.name = strings.TrimSpace(f.name)
	if f.name == "" {
		return errors.New("nome é obrigatório")
	}
	if len(f.name) > 80 {
		return errors.New("nome deve ter até 80 caracteres")
	}
	if f.accountType == "" {
		f.accountType = "CHECKING"
	}
	if !models.ValidAccountTypes[f.accountType] {
		return errors.New("tipo de conta inválido")
	}
	return nil
}

// accountBalances devolve o saldo calculado (base + lançamentos até agora) de cada conta do usuário.
func (h *Handler) accountBalances(ctx context.Context, userUUID pgtype.UUID) (map[string]int64, error) {
	rows, err := h.queries.ListAccountBalances(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	balances := make(map[string]int64, len(rows))
	for _, r := range rows {
		balances[r.ID] = r.BalanceCents
	}
	return balances, nil
}

// respondAccount escreve a conta com o saldo calculado.
func (h *Handler) respondAccount(w http.ResponseWriter, r *http.Request, status int, a database.Account) {
	balances, err := h.accountBalances(r.Context(), a.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load account balance")
		return
	}
	writeJSON(w, status, toAccountResponse(a, balances[a.ID]))
}

func toAccountResponse(a database.Account, balanceCents int64) models.AccountResponse {
	return models.AccountResponse{
		ID:                  a.ID,
		UserID:              uuidToString(a.UserID),
		Name:                a.Name,
		Type:                a.Type,
		CurrencyCode:        a.CurrencyCode,
		InitialBalance:      money.ToReais(a.InitialBalanceCents),
		InitialBalanceCents: a.InitialBalanceCents,
		Balance:             money.ToReais(balanceCents),
		BalanceCents:        balanceCents,
		BankCode:            a.BankCode,
		BankName:            a.BankName,
		HolderName:          a.HolderName,
		HolderDocumentType:  a.HolderDocumentType,
		HolderDocument:      a.HolderDocument,
		IsActive:            a.IsActive,
		CreatedAt:           a.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:           a.UpdatedAt.Time.Format(time.RFC3339),
	}
}

func (h *Handler) CreateAccount(w http.ResponseWriter, r *http.Request) {
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

	var req models.CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	f := accountFields{name: req.Name, accountType: req.Type, holderName: optional(req.HolderName)}
	for _, err := range []error{f.validate(), f.setBank(req.BankCode, req.BankName), f.setDocument(req.HolderDocument)} {
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	depositCents := money.ToCents(req.InitialBalance)
	if depositCents < 0 {
		writeError(w, http.StatusBadRequest, "depósito inicial não pode ser negativo")
		return
	}
	depositDay := time.Now().In(brt)
	if req.DepositDate != "" {
		if depositDay, err = parseDay(req.DepositDate); err != nil {
			writeError(w, http.StatusBadRequest, "data do depósito deve ser YYYY-MM-DD")
			return
		}
	}

	// Conta e lançamento do depósito entram juntos ou nenhum dos dois.
	dbTx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create account")
		return
	}
	defer dbTx.Rollback(r.Context())
	qtx := h.queries.WithTx(dbTx)

	account, err := qtx.CreateAccount(r.Context(), database.CreateAccountParams{
		UserID:              userUUID,
		Name:                f.name,
		Type:                f.accountType,
		BankCode:            f.bankCode,
		BankName:            f.bankName,
		HolderName:          f.holderName,
		HolderDocumentType:  f.holderDocumentType,
		HolderDocument:      f.holderDocument,
		InitialBalanceCents: 0, // o depósito entra como lançamento abaixo
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create account")
		return
	}

	if depositCents > 0 {
		_, err = qtx.CreateAccountDeposit(r.Context(), database.CreateAccountDepositParams{
			UserID:      claims.UserID,
			AccountID:   &account.ID,
			AmountCents: depositCents,
			Date:        dayTimestamp(depositDay),
			Description: "Depósito inicial · " + account.Name,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to record deposit")
			return
		}
	}

	if err := dbTx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create account")
		return
	}

	h.respondAccount(w, r, http.StatusCreated, account)
}

func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
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

	accounts, err := h.queries.ListAccountsByUserID(r.Context(), userUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list accounts")
		return
	}

	balances, err := h.accountBalances(r.Context(), userUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list accounts")
		return
	}

	resp := make([]models.AccountResponse, len(accounts))
	for i, a := range accounts {
		resp[i] = toAccountResponse(a, balances[a.ID])
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) UpdateAccount(w http.ResponseWriter, r *http.Request) {
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
	accountID := r.PathValue("id")

	var req models.UpdateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	current, err := h.queries.GetAccountByID(r.Context(), accountID)
	if err != nil || current.UserID != userUUID || !current.IsActive {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	f := accountFields{
		name:               current.Name,
		accountType:        current.Type,
		bankCode:           current.BankCode,
		bankName:           current.BankName,
		holderName:         current.HolderName,
		holderDocumentType: current.HolderDocumentType,
		holderDocument:     current.HolderDocument,
	}
	if req.Name != nil {
		f.name = *req.Name
	}
	if req.Type != nil {
		f.accountType = *req.Type
	}
	if req.HolderName != nil {
		f.holderName = optional(*req.HolderName)
	}
	errs := []error{f.validate()}
	if req.BankCode != nil || req.BankName != nil {
		code, name := deref(current.BankCode), deref(current.BankName)
		if req.BankCode != nil {
			code = *req.BankCode
		}
		if req.BankName != nil {
			name = *req.BankName
		}
		errs = append(errs, f.setBank(code, name))
	}
	if req.HolderDocument != nil {
		errs = append(errs, f.setDocument(*req.HolderDocument))
	}
	for _, err := range errs {
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	// A base (initialBalance) desloca o saldo calculado pela mesma diferença;
	// é assim que a reconciliação do web ajusta o saldo. balance_cents fica
	// espelhando a base, só para o código legado que ainda o lê.
	initial := current.InitialBalanceCents
	if req.InitialBalance != nil {
		initial = money.ToCents(*req.InitialBalance)
	}
	balance := current.BalanceCents + initial - current.InitialBalanceCents

	account, err := h.queries.UpdateAccount(r.Context(), database.UpdateAccountParams{
		ID:                  accountID,
		UserID:              userUUID,
		Name:                f.name,
		Type:                f.accountType,
		BankCode:            f.bankCode,
		BankName:            f.bankName,
		HolderName:          f.holderName,
		HolderDocumentType:  f.holderDocumentType,
		HolderDocument:      f.holderDocument,
		InitialBalanceCents: initial,
		BalanceCents:        balance,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update account")
		return
	}

	h.respondAccount(w, r, http.StatusOK, account)
}

func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
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
	accountID := r.PathValue("id")

	rows, err := h.queries.DeactivateAccount(r.Context(), database.DeactivateAccountParams{
		ID:     accountID,
		UserID: userUUID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete account")
		return
	}
	if rows == 0 {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
