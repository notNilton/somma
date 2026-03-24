package models

const (
	AccountTypeCHECKING   = "CHECKING"
	AccountTypeSAVINGS    = "SAVINGS"
	AccountTypeCASH       = "CASH"
	AccountTypeWALLET     = "WALLET"
	AccountTypeINVESTMENT = "INVESTMENT"

	AccountOwnershipPERSONAL = "PERSONAL"
	AccountOwnershipBUSINESS = "BUSINESS"

	CardTypeCREDIT = "CREDIT"
	CardTypeDEBIT  = "DEBIT"

	AccessRoleEDITOR = "EDITOR"
	AccessRoleVIEWER = "VIEWER"

	TransactionTypeINCOME     = "INCOME"
	TransactionTypeEXPENSE    = "EXPENSE"
	TransactionTypeTRANSFER   = "TRANSFER"
	TransactionTypeADJUSTMENT = "ADJUSTMENT"

	TransactionStatusPENDING   = "PENDING"
	TransactionStatusCOMPLETED = "COMPLETED"
	TransactionStatusCANCELED  = "CANCELED"

	TransactionClassificationCOMMON      = "COMMON"
	TransactionClassificationFUEL        = "FUEL"
	TransactionClassificationMAINTENANCE = "MAINTENANCE"
	TransactionClassificationTRANSFER    = "TRANSFER"

	PaymentMethodDEBIT  = "DEBIT"
	PaymentMethodCREDIT = "CREDIT"

	ChannelCARD_CREDIT = "CARD_CREDIT"
	ChannelCARD_DEBIT  = "CARD_DEBIT"
	ChannelPIX         = "PIX"
	ChannelBANK        = "BANK"

	MaintenanceTypeOIL_CHANGE       = "OIL_CHANGE"
	MaintenanceTypeTIRE_CHANGE      = "TIRE_CHANGE"
	MaintenanceTypePREVENTIVE       = "PREVENTIVE"
	MaintenanceTypeREPAIR           = "REPAIR"
	MaintenanceTypePART_REPLACEMENT = "PART_REPLACEMENT"
	MaintenanceTypeOTHER            = "OTHER"

	FuelTypeGASOLINA_COMUM     = "GASOLINA_COMUM"
	FuelTypeGASOLINA_ADITIVADA = "GASOLINA_ADITIVADA"
	FuelTypeETANOL             = "ETANOL"
	FuelTypeDIESEL             = "DIESEL"
	FuelTypeGNV                = "GNV"
)

var ValidAccountTypes = map[string]bool{
	AccountTypeCHECKING: true, AccountTypeSAVINGS: true,
	AccountTypeCASH: true, AccountTypeWALLET: true, AccountTypeINVESTMENT: true,
}

var ValidTransactionTypes = map[string]bool{
	TransactionTypeINCOME: true, TransactionTypeEXPENSE: true,
	TransactionTypeTRANSFER: true, TransactionTypeADJUSTMENT: true,
}

var ValidTransactionStatuses = map[string]bool{
	TransactionStatusPENDING: true, TransactionStatusCOMPLETED: true, TransactionStatusCANCELED: true,
}

var ValidCardTypes = map[string]bool{
	CardTypeCREDIT: true, CardTypeDEBIT: true,
}

var ValidFuelTypes = map[string]bool{
	FuelTypeGASOLINA_COMUM: true, FuelTypeGASOLINA_ADITIVADA: true,
	FuelTypeETANOL: true, FuelTypeDIESEL: true, FuelTypeGNV: true,
}

var ValidMaintenanceTypes = map[string]bool{
	MaintenanceTypeOIL_CHANGE: true, MaintenanceTypeTIRE_CHANGE: true,
	MaintenanceTypePREVENTIVE: true, MaintenanceTypeREPAIR: true,
	MaintenanceTypePART_REPLACEMENT: true, MaintenanceTypeOTHER: true,
}
