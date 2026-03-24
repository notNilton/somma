package models

import "time"

type Card struct {
	ID               string
	AccountID        string
	UserID           string
	Name             string
	Brand            *string
	Last4            *string
	Type             string
	CreditLimitCents *int64
	Color            *string
	Icon             *string
	ClosingDay       *int
	DueDay           *int
	IsActive         bool
	DeletedAt        *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}
