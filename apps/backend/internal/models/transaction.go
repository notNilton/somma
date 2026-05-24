package models

import "time"

type Transaction struct {
	ID                string
	UserID            string
	CategoryID        *string
	BudgetID          *string
	BudgetItemID      *string
	Type              string
	Classification    string
	PaymentMethod     string
	Channel           string
	Status            string
	IsRecurring       bool
	AmountCents       int64
	TotalInstallments *int
	PaidInstallments  *int
	Date              time.Time
	Description       string
	Notes             *string
	CurrencyCode      string
	AffectsAccount    bool
	IsActive          bool
	DeletedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type TransactionWithCategory struct {
	Transaction
	CategoryName  *string
	CategoryColor *string
}
