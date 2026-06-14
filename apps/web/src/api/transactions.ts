import { req } from './client'
import type { Transaction, CreateInput } from '../types'

export const transactionsApi = {
  list: (from: string, to: string) =>
    req<{ items: Transaction[] }>(`/api/v1/transactions?from=${from}&to=${to}&limit=500`).then(r => r.items),

  listByBudget: (budgetId: string) =>
    req<{ items: Transaction[] }>(`/api/v1/transactions?budgetId=${budgetId}&limit=500`).then(r => r.items),

  create: (input: CreateInput) =>
    req<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<CreateInput>) =>
    req<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    req<void>(`/api/v1/transactions/${id}`, { method: 'DELETE' }),

  restore: (id: string) =>
    req<void>(`/api/v1/transactions/${id}/restore`, { method: 'PATCH' }),
}
