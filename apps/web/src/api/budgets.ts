import { req } from './client'
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '../types'

export const budgetsApi = {
  list: () => req<Budget[]>('/api/v1/budgets'),
  create: (input: CreateBudgetInput) =>
    req<Budget>('/api/v1/budgets', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: UpdateBudgetInput) =>
    req<Budget>(`/api/v1/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) =>
    req<void>(`/api/v1/budgets/${id}`, { method: 'DELETE' }),
}
