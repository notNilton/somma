package models

const (
	TransactionTypeINCOME  = "INCOME"
	TransactionTypeEXPENSE = "EXPENSE"

	TransactionKindINCOME  = "INCOME"
	TransactionKindEXPENSE = "EXPENSE"
	TransactionKindSAVING  = "SAVING"
	TransactionKindBUDGET  = "BUDGET"
	TransactionKindCREDIT  = "CREDIT"

	TransactionStatusPENDING   = "PENDING"
	TransactionStatusCOMPLETED = "COMPLETED"
	TransactionStatusCANCELED  = "CANCELED"
)

var ValidTransactionTypes = map[string]bool{
	TransactionTypeINCOME: true,
	TransactionTypeEXPENSE: true,
}

var ValidTransactionKinds = map[string]bool{
	TransactionKindINCOME: true,
	TransactionKindEXPENSE: true,
	TransactionKindSAVING: true,
	TransactionKindBUDGET: true,
	TransactionKindCREDIT: true,
}

var ValidTransactionStatuses = map[string]bool{
	TransactionStatusPENDING: true, TransactionStatusCOMPLETED: true, TransactionStatusCANCELED: true,
}
