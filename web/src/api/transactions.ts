import { req } from './client'
import type { Transaction, CreateInput } from '../types'

export const transactionsApi = {
  list: (from: string, to: string) =>
    req<{ items: Transaction[] }>(`/api/v1/transactions?from=${from}&to=${to}&limit=500`).then(r => r.items),

  listFuture: () =>
    req<Transaction[]>('/api/v1/transactions/future'),

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

  /** Numa recorrência exclui esta ocorrência e as próximas. */
  remove: (tx: Pick<Transaction, 'id' | 'isRecurring'>) =>
    req<void>(`/api/v1/transactions/${tx.id}${tx.isRecurring ? '?scope=following' : ''}`, { method: 'DELETE' }),

  restore: (id: string) =>
    req<void>(`/api/v1/transactions/${id}/restore`, { method: 'PATCH' }),
}
