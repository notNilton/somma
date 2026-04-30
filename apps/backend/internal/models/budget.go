package models

import "time"

type Budget struct {
	ID         string
	UserID     string
	Name       string
	TargetDate time.Time
	Notes      *string
	IsActive   bool
	DeletedAt  *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type BudgetItem struct {
	ID          string
	BudgetID    string
	CategoryID  *string
	Name        string
	SortOrder   int
	IsActive    bool
	DeletedAt   *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
