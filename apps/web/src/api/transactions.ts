import { req } from './client'
import type { Transaction, CreateInput } from '../types'

export const transactionsApi = {
  list: (from: string, to: string) =>
    req<Transaction[]>(`/api/v1/transactions?from=${from}&to=${to}&limit=500`),

  create: (input: CreateInput) =>
    req<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    req<void>(`/api/v1/transactions/${id}`, { method: 'DELETE' }),
}
