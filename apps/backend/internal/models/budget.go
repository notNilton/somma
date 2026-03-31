package models

import "time"

type Budget struct {
	ID          string
	UserID      string
	CategoryID  *string
	AmountCents int64
	Month       int
	Year        int
	Notes       *string
	IsActive    bool
	DeletedAt   *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type BudgetStatus struct {
	Budget
	CategoryName   *string
	CategoryColor  *string
	SpentCents     int64
	RemainingCents int64
	PercentUsed    float64
	IsOverBudget   bool
}
