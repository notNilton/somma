package models

import "time"

type Account struct {
	ID                string
	UserID            string
	Name              string
	Type              string
	Ownership         string
	BankName          *string
	BankCode          *string
	BankAgency        *string
	BankAccountNumber *string
	Cpf               *string
	Cnpj              *string
	Color             *string
	Icon              *string
	CurrencyCode      string
	BalanceCents      int64
	CreditLimitCents  *int64
	HasDebit          bool
	HasPix            bool
	HasCredit         bool
	IncludeInTotal    bool
	ClosingDay        *int
	DueDay            *int
	IsActive          bool
	DeletedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}
