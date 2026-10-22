export type TxType = 'INCOME' | 'EXPENSE'
export type TxKind = 'INCOME' | 'EXPENSE' | 'CREDIT' | 'SAVING' | 'BUDGET'
export type TxStatus = 'COMPLETED' | 'PENDING' | 'CANCELED'

export interface Transaction {
  id: string
  type: TxType
  kind: TxKind
  status: TxStatus
  amount: number
  description: string
  date: string
  notes?: string
  categoryId?: string
  category?: { name?: string; color?: string }
  cardId?: string
  accountId?: string
  transferId?: string
  isTransfer?: boolean
  installmentGroupId?: string
  installmentNumber?: number
  totalInstallments?: number
  isInvoicePayment?: boolean
  /** Ocorrência de uma saída/entrada mensal recorrente. */
  isRecurring?: boolean
  recurringOriginId?: string
}

export interface Category {
  id: string
  name: string
  type: string
  color?: string
  children?: Category[]
}

export interface FlatCategory {
  id: string
  name: string
  indent: boolean
}

export interface CreateInput {
  type: TxType
  kind?: TxKind
  amount: number
  description: string
  date: string
  status?: TxStatus
  categoryId?: string
  notes?: string
  cardId?: string
  accountId?: string
  totalInstallments?: number
  /** Repete todo mês; sem recurrenceEndDate gera 12 meses. */
  isRecurring?: boolean
  recurrenceEndDate?: string
}

export interface UpdateInput {
  type?: TxType
  kind?: TxKind
  amount?: number
  description?: string
  date?: string
  status?: TxStatus
  categoryId?: string
  notes?: string
  cardId?: string
  accountId?: string
}

export type AccountType = 'CHECKING' | 'WALLET' | 'EMERGENCY' | 'INVESTMENT'

export interface Account {
  id: string
  userId: string
  name: string
  type: AccountType
  currencyCode: string
  initialBalance: number
  initialBalanceCents: number
  balance: number
  balanceCents: number
  bankCode: string | null
  bankName: string | null
  holderName: string | null
  holderDocumentType: 'CPF' | 'CNPJ' | null
  holderDocument: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAccountInput {
  name: string
  type?: AccountType
  currencyCode?: string
  initialBalance?: number
  /** Data (YYYY-MM-DD) do lançamento do depósito inicial; padrão: hoje. */
  depositDate?: string
  bankCode?: string
  bankName?: string
  holderName?: string
  /** CPF ou CNPJ, com ou sem pontuação. */
  holderDocument?: string
}

export interface UpdateAccountInput {
  name?: string
  type?: AccountType
  currencyCode?: string
  initialBalance?: number
  bankCode?: string
  bankName?: string
  holderName?: string
  holderDocument?: string
}

export interface TransferInput {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description?: string
}

export interface TransferResponse {
  transferId: string
  amount: number
  amountCents: number
  date: string
  fromAccountId: string
  toAccountId: string
  outTransaction: Transaction
  inTransaction: Transaction
}

export interface CreditCard {
  id: string
  userId: string
  name: string
  /** Conta bancária dona do cartão (cada conta tem no máximo um). */
  accountId: string | null
  brand?: string
  last4?: string
  creditLimit: number
  creditLimitCents: number
  availableLimit: number
  availableLimitCents: number
  closingDay: number
  dueDay: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCardInput {
  name: string
  brand?: string
  last4?: string
  creditLimit: number
  closingDay: number
  dueDay: number
}

export interface AccountCardInput {
  creditLimit?: number
  closingDay?: number
  dueDay?: number
}

export interface UpdateCardInput {
  name?: string
  brand?: string
  last4?: string
  creditLimit?: number
  closingDay?: number
  dueDay?: number
}

export type InvoiceStatus = 'OPEN' | 'CLOSED' | 'PAID'

export interface CardInvoice {
  referenceMonth: string // YYYY-MM
  closingDate: string    // YYYY-MM-DD
  dueDate: string        // YYYY-MM-DD
  status: InvoiceStatus
  total: number
  totalCents: number
  transactionCount: number
}

export interface PayInvoiceInput {
  accountId?: string
}

export interface PayInvoiceResponse {
  ok: boolean
  paymentId: string
  cardId: string
  referenceMonth: string
  totalPaid: number
  paidAt: string
  transactionId?: string
}

export type BudgetClass = 'ESSENTIAL' | 'LIFESTYLE' | 'FINANCIAL'

export interface Budget {
  id: string
  userId: string
  name: string
  allocatedAmount: number
  allocatedAmountCents: number
  spent: number
  spentCents: number
  remaining: number
  remainingCents: number
  progress: number
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateBudgetInput {
  name: string
  allocatedAmount: number
  notes?: string
}

export interface Goal {
  id: string
  userId: string
  name: string
  description?: string
  targetAmount: number
  savedAmount: number
  remaining: number
  progress: number
  color: string
  targetDate?: string
  isAchieved: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateGoalInput {
  name: string
  targetAmount: number
  description?: string
  color?: string
  targetDate?: string
}
