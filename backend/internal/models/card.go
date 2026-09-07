package models

import "time"

type CreditCard struct {
	ID               string
	UserID           string
	Name             string
	Brand            *string
	Last4            *string
	CreditLimitCents int64
	ClosingDay       int16
	DueDay           int16
	IsActive         bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type CardInvoicePayment struct {
	ID             string
	UserID         string
	CardID         string
	ReferenceMonth time.Time
	AmountCents    int64
	PaidAt         time.Time
	TransactionID  *string
}

const (
	InvoiceStatusOpen   = "OPEN"
	InvoiceStatusClosed = "CLOSED"
	InvoiceStatusPaid   = "PAID"
)
