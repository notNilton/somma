package models

import "time"

type Transaction struct {
	ID           string
	UserID       string
	CategoryID   *string
	BudgetID     *string
	Type         string
	Kind         string
	Status       string
	AmountCents  int64
	Date         time.Time
	Description  string
	Notes        *string
	CurrencyCode string
	IsActive     bool
	DeletedAt    *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type TransactionWithCategory struct {
	Transaction
	CategoryName  *string
	CategoryColor *string
}
