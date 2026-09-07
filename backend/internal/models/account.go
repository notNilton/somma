package models

import "time"

type Account struct {
	ID                  string
	UserID              string
	Name                string
	Type                string
	CurrencyCode        string
	InitialBalanceCents int64
	IsActive            bool
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

const (
	AccountTypeChecking   = "CHECKING"
	AccountTypeWallet     = "WALLET"
	AccountTypeEmergency  = "EMERGENCY"
	AccountTypeInvestment = "INVESTMENT"
)

var ValidAccountTypes = map[string]bool{
	AccountTypeChecking:   true,
	AccountTypeWallet:     true,
	AccountTypeEmergency:  true,
	AccountTypeInvestment: true,
}
