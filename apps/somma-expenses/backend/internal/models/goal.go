package models

import "time"

type Goal struct {
	ID                 string
	UserID             string
	Name               string
	Description        *string
	TargetAmountCents  int64
	Color              string
	TargetDate         *time.Time
	IsAchieved         bool
	IsActive           bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
