package models

import "time"

type Budget struct {
	ID                   string
	UserID               string
	Name                 string
	AllocatedAmountCents int64
	Notes                *string
	IsActive             bool
	DeletedAt            *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
