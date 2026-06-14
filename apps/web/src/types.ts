export type TxType = 'INCOME' | 'EXPENSE'
export type TxKind = 'INCOME' | 'EXPENSE' | 'SAVING' | 'CREDIT' | 'BUDGET'
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
  budgetId?: string
  categoryId?: string
  category?: { name?: string; color?: string }
  isRecurring?: boolean
  recurrenceFreq?: string
  recurringOriginId?: string
}

export interface Category {
  id: string
  name: string
  type: string
  color?: string
  children?: Category[]
}

export interface Budget {
  id: string
  name: string
  allocatedAmount: number
  spent: number
  remaining: number
  progress: number
  notes?: string
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
  budgetId?: string
  notes?: string
  isRecurring?: boolean
  recurrenceFreq?: string
  recurrenceEnd?: string
}

export interface ImportRow {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  potentialDuplicate?: boolean
}

export interface ImportPreview {
  rows: ImportRow[]
  errors: string[]
}

export interface CreateBudgetInput {
  name: string
  allocatedAmount: number
  notes?: string
}

export type UpdateBudgetInput = Partial<CreateBudgetInput>

export interface UpdateInput {
  amount?: number
  description?: string
  categoryId?: string
  budgetId?: string
  notes?: string
}
