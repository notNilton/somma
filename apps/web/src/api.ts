import type { Transaction, Category, CreateInput } from './types'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  login: (email: string, password: string) =>
    req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () =>
    req('/api/auth/logout', { method: 'POST' }),

  listTransactions: (from: string, to: string) =>
    req<Transaction[]>(`/api/v1/transactions?from=${from}&to=${to}&limit=500`),

  createTransaction: (input: CreateInput) =>
    req<Transaction>('/api/v1/transactions', { method: 'POST', body: JSON.stringify(input) }),

  deleteTransaction: (id: string) =>
    req<void>(`/api/v1/transactions/${id}`, { method: 'DELETE' }),

  listCategories: () =>
    req<Category[]>('/api/v1/categories'),
}
