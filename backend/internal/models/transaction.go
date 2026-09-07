package models

import "time"

type Transaction struct {
	ID                string
	UserID            string
	CategoryID        *string
	BudgetID          *string
	Type              string
	Kind              string
	Status            string
	AmountCents       int64
	Date              time.Time
	Description       string
	Notes             *string
	CurrencyCode      string
	IsActive          bool
	DeletedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	IsRecurring       bool
	RecurrenceFreq    *string
	RecurrenceEndDate *time.Time
	RecurringOriginID *string
	GoalID            *string
	CardID            *string
	AccountID         *string
	InstallmentGroupID *string
	InstallmentNumber   *int16
	TotalInstallments   *int16
	IsInvoicePayment    bool
	TransferID          *string
	IsTransfer          bool
	OriginalAmountCents *int64
	ExchangeRate        *float64
	IofAmountCents      int64
}

type TransactionWithCategory struct {
	Transaction
	CategoryName  *string
	CategoryColor *string
}
