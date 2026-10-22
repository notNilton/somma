package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/backend/internal/database"
)

type PaymentService struct {
	pool    *pgxpool.Pool
	queries *database.Queries
}

func NewPaymentService(pool *pgxpool.Pool, queries *database.Queries) *PaymentService {
	return &PaymentService{
		pool:    pool,
		queries: queries,
	}
}

func (s *PaymentService) PayInvoice(ctx context.Context, tx pgx.Tx, userID string, invoiceID string, accountID string) error {
	var userUUID pgtype.UUID
	if err := userUUID.Scan(userID); err != nil {
		return fmt.Errorf("invalid user id: %w", err)
	}

	var invoiceUUID pgtype.UUID
	if err := invoiceUUID.Scan(invoiceID); err != nil {
		return fmt.Errorf("invalid invoice id: %w", err)
	}

	if accountID == "" {
		return fmt.Errorf("invalid account id")
	}

	qtx := s.queries.WithTx(tx)

	// 1. Obter e bloquear a fatura para atualização
	invoice, err := qtx.GetInvoiceForUpdate(ctx, invoiceUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("invoice not found")
		}
		return fmt.Errorf("failed to load invoice: %w", err)
	}

	if invoice.Status == database.InvoiceStatusPaid {
		return errors.New("invoice already paid")
	}

	// Verificar se o cartão da fatura pertence ao usuário
	card, err := qtx.GetCardByID(ctx, invoice.CreditCardID)
	if err != nil {
		return fmt.Errorf("failed to verify card: %w", err)
	}
	if card.UserID != userUUID {
		return errors.New("unauthorized: card does not belong to user")
	}

	// 2. Calcular o total devido na fatura
	totalCents, err := qtx.GetInvoiceTotal(ctx, invoiceUUID)
	if err != nil {
		return fmt.Errorf("failed to calculate invoice total: %w", err)
	}
	if totalCents <= 0 {
		return errors.New("cannot pay an invoice with non-positive amount")
	}

	// 3. Obter e bloquear a conta corrente pagadora
	account, err := qtx.GetAccountForUpdate(ctx, accountID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("account not found")
		}
		return fmt.Errorf("failed to load account: %w", err)
	}
	if account.UserID != userUUID {
		return errors.New("unauthorized: account does not belong to user")
	}

	// 4. Verificar se accounts.balance_cents possui saldo suficiente
	if account.BalanceCents < totalCents {
		return errors.New("insufficient account balance to pay invoice")
	}

	// 5. Deduzir o montante de accounts.balance_cents
	_, err = qtx.DeductAccountBalance(ctx, database.DeductAccountBalanceParams{
		ID:           accountID,
		BalanceCents: totalCents,
	})
	if err != nil {
		return fmt.Errorf("failed to deduct account balance: %w", err)
	}

	// 6. Inserir uma linha em account_transactions com tipo 'invoice_payment' e a chave invoice_id
	description := fmt.Sprintf("Pagamento fatura %s (%02d/%04d)", card.Name, invoice.ReferenceMonth, invoice.ReferenceYear)
	_, err = qtx.CreateAccountTransaction(ctx, database.CreateAccountTransactionParams{
		UserID:      userUUID,
		AccountID:   accountID,
		AmountCents: totalCents,
		Type:        database.TransactionTypeInvoicePayment,
		Description: description,
		InvoiceID:   invoiceUUID,
		OccurredAt:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return fmt.Errorf("failed to record account transaction: %w", err)
	}

	// 7. Atualizar credit_card_invoices definindo status = 'paid' e paid_at = NOW()
	_, err = qtx.MarkInvoicePaid(ctx, invoiceUUID)
	if err != nil {
		return fmt.Errorf("failed to mark invoice as paid: %w", err)
	}

	return nil
}
