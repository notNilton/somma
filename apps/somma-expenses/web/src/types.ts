export type TxType = 'INCOME' | 'EXPENSE'
export type TxKind = 'INCOME' | 'EXPENSE' | 'CREDIT'
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
}

export interface UpdateInput {
  amount?: number
  description?: string
  categoryId?: string
  notes?: string
}
