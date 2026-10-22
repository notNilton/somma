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

type PurchaseInput struct {
	UserID       string
	CardID       string
	Description  string
	TotalCents   int64
	Installments int
	PurchaseDate time.Time
	ClosingDay   int
	DueDay       int
}

type CardService struct {
	pool    *pgxpool.Pool
	queries *database.Queries
}

func NewCardService(pool *pgxpool.Pool, queries *database.Queries) *CardService {
	return &CardService{
		pool:    pool,
		queries: queries,
	}
}

func (s *CardService) RegisterPurchase(ctx context.Context, tx pgx.Tx, in PurchaseInput) (string, error) {
	if in.TotalCents <= 0 {
		return "", errors.New("total amount must be greater than zero")
	}
	if in.Installments < 1 {
		return "", errors.New("installments count must be at least 1")
	}
	if in.ClosingDay < 1 || in.ClosingDay > 31 {
		return "", errors.New("invalid closing day")
	}
	if in.DueDay < 1 || in.DueDay > 31 {
		return "", errors.New("invalid due day")
	}

	var userUUID pgtype.UUID
	if err := userUUID.Scan(in.UserID); err != nil {
		return "", fmt.Errorf("invalid user id: %w", err)
	}

	var cardUUID pgtype.UUID
	if err := cardUUID.Scan(in.CardID); err != nil {
		return "", fmt.Errorf("invalid card id: %w", err)
	}

	qtx := s.queries.WithTx(tx)

	// Regra de divisão sem perda de centavos
	baseAmount := in.TotalCents / int64(in.Installments)
	remainder := in.TotalCents % int64(in.Installments)

	purchase, err := qtx.CreatePurchase(ctx, database.CreatePurchaseParams{
		UserID:            userUUID,
		CreditCardID:      cardUUID,
		Description:       in.Description,
		TotalAmountCents:  in.TotalCents,
		InstallmentsCount: int32(in.Installments),
		PurchaseDate:      pgtype.Timestamptz{Time: in.PurchaseDate, Valid: true},
	})
	if err != nil {
		return "", fmt.Errorf("failed to create purchase: %w", err)
	}

	startMonth := in.PurchaseDate.Month()
	startYear := in.PurchaseDate.Year()
	if in.PurchaseDate.Day() > in.ClosingDay {
		startMonth++
		if startMonth > 12 {
			startMonth = 1
			startYear++
		}
	}

	for i := 1; i <= in.Installments; i++ {
		targetDate := time.Date(startYear, startMonth+time.Month(i-1), 1, 0, 0, 0, 0, time.UTC)
		closingDate := time.Date(targetDate.Year(), targetDate.Month(), in.ClosingDay, 23, 59, 59, 0, time.UTC)
		dueDate := time.Date(targetDate.Year(), targetDate.Month(), in.DueDay, 23, 59, 59, 0, time.UTC)

		invoice, err := qtx.UpsertInvoice(ctx, database.UpsertInvoiceParams{
			CreditCardID:   cardUUID,
			ReferenceMonth: int32(targetDate.Month()),
			ReferenceYear:  int32(targetDate.Year()),
			ClosingDate:    pgtype.Date{Time: closingDate, Valid: true},
			DueDate:        pgtype.Date{Time: dueDate, Valid: true},
		})
		if err != nil {
			return "", fmt.Errorf("failed to upsert invoice for installment %d: %w", i, err)
		}

		currentAmount := baseAmount
		if i == 1 {
			currentAmount += remainder
		}

		_, err = qtx.CreateInstallment(ctx, database.CreateInstallmentParams{
			PurchaseID:        purchase.ID,
			InvoiceID:         invoice.ID,
			InstallmentNumber: int32(i),
			AmountCents:       currentAmount,
		})
		if err != nil {
			return "", fmt.Errorf("failed to create installment %d: %w", i, err)
		}
	}

	var pID string
	if purchase.ID.Valid {
		src := purchase.ID.Bytes
		pID = fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
	}
	return pID, nil
}
