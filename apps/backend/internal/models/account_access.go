package models

import "time"

type AccountAccess struct {
	ID        string
	AccountID string
	UserID    string
	Role      string
	CreatedAt time.Time
}

type AccountAccessWithUser struct {
	AccountAccess
	UserName  *string
	UserEmail string
}
