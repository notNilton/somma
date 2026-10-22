package models

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type AccountSummary struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	BalanceCents int64  `json:"balanceCents"`
}

type InvoiceSummary struct {
	ID               string `json:"id"`
	Month            int    `json:"month"`
	Year             int    `json:"year"`
	ClosingDate      string `json:"closingDate"`
	DueDate          string `json:"dueDate"`
	TotalAmountCents int64  `json:"totalAmountCents"`
	Status           string `json:"status"` // 'open' | 'closed' | 'paid' | 'overdue'
}

type CardSummary struct {
	ID                  string         `json:"id"`
	Name                string         `json:"name"`
	TotalLimitCents     int64          `json:"totalLimitCents"`
	AvailableLimitCents int64          `json:"availableLimitCents"`
	CurrentInvoice      InvoiceSummary `json:"currentInvoice"`
}

type DashboardResponse struct {
	Accounts []AccountSummary `json:"accounts"`
	Cards    []CardSummary    `json:"cards"`
}

// CreateAccountRequest segue o contrato do web (valores em reais).
// HolderDocument aceita CPF ou CNPJ, com ou sem pontuação.
type CreateAccountRequest struct {
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	InitialBalance float64 `json:"initialBalance"`
	// DepositDate (YYYY-MM-DD) é a data do lançamento do depósito; vazio = hoje.
	DepositDate    string `json:"depositDate"`
	BankCode       string `json:"bankCode"`
	BankName       string `json:"bankName"`
	HolderName     string `json:"holderName"`
	HolderDocument string `json:"holderDocument"`
}

// UpdateAccountRequest: campos nil ficam como estão; string vazia limpa o campo.
type UpdateAccountRequest struct {
	Name           *string  `json:"name"`
	Type           *string  `json:"type"`
	InitialBalance *float64 `json:"initialBalance"`
	BankCode       *string  `json:"bankCode"`
	BankName       *string  `json:"bankName"`
	HolderName     *string  `json:"holderName"`
	HolderDocument *string  `json:"holderDocument"`
}

type AccountResponse struct {
	ID                  string  `json:"id"`
	UserID              string  `json:"userId"`
	Name                string  `json:"name"`
	Type                string  `json:"type"`
	CurrencyCode        string  `json:"currencyCode"`
	InitialBalance      float64 `json:"initialBalance"`
	InitialBalanceCents int64   `json:"initialBalanceCents"`
	Balance             float64 `json:"balance"`
	BalanceCents        int64   `json:"balanceCents"`
	BankCode            *string `json:"bankCode"`
	BankName            *string `json:"bankName"`
	HolderName          *string `json:"holderName"`
	HolderDocumentType  *string `json:"holderDocumentType"`
	HolderDocument      *string `json:"holderDocument"`
	IsActive            bool    `json:"isActive"`
	CreatedAt           string  `json:"createdAt"`
	UpdatedAt           string  `json:"updatedAt"`
}

type CreateTransactionRequest struct {
	AccountID   string `json:"accountId"`
	AmountCents int64  `json:"amountCents"`
	Type        string `json:"type"` // pix_in, pix_out, debit, invoice_payment, transfer
	Description string `json:"description"`
}

type CreateCardRequest struct {
	Name            string `json:"name"`
	TotalLimitCents int64  `json:"totalLimitCents"`
	ClosingDay      int    `json:"closingDay"`
	DueDay          int    `json:"dueDay"`
}

type CreatePurchaseRequest struct {
	Description       string `json:"description"`
	TotalAmountCents  int64  `json:"totalAmountCents"`
	InstallmentsCount int    `json:"installmentsCount"`
	PurchaseDate      string `json:"purchaseDate,omitempty"` // YYYY-MM-DD ou RFC3339
}

type PayInvoiceRequest struct {
	AccountID string `json:"accountId"`
}

type InstallmentResponse struct {
	ID                  string `json:"id"`
	PurchaseID          string `json:"purchaseId"`
	InstallmentNumber   int    `json:"installmentNumber"`
	AmountCents         int64  `json:"amountCents"`
	PurchaseDescription string `json:"purchaseDescription"`
	InstallmentsCount   int    `json:"installmentsCount"`
	PurchaseDate        string `json:"purchaseDate"`
}

type InvoiceDetailResponse struct {
	ID               string                `json:"id"`
	CreditCardID     string                `json:"creditCardId"`
	Month            int                   `json:"month"`
	Year             int                   `json:"year"`
	ClosingDate      string                `json:"closingDate"`
	DueDate          string                `json:"dueDate"`
	Status           string                `json:"status"`
	PaidAt           *string               `json:"paidAt,omitempty"`
	TotalAmountCents int64                 `json:"totalAmountCents"`
	Installments     []InstallmentResponse `json:"installments,omitempty"`
}
