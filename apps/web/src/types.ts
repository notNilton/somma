export type TxType = 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'CREDIT' | 'RETURN'
export type TxStatus = 'COMPLETED' | 'PENDING' | 'CANCELED'
export type TxChannel = 'PIX' | 'BANK' | 'CARD_DEBIT' | 'CARD_CREDIT'

export interface Transaction {
  id: string
  type: TxType
  status: TxStatus
  channel: TxChannel
  paymentMethod: 'DEBIT' | 'CREDIT'
  amount: number
  description: string
  date: string
  isRecurring: boolean
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
  type: string
  amount: number
  description: string
  date: string
  status: string
  paymentMethod: string
  channel: string
  categoryId?: string
}
