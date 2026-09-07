import { req } from './client'
import type { Budget, CreateBudgetInput, Goal, CreateGoalInput } from '../types'

export const budgetsApi = {
  list: () => req<Budget[]>('/api/v1/budgets'),
  create: (input: CreateBudgetInput) =>
    req<Budget>('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Partial<CreateBudgetInput>) =>
    req<Budget>(`/api/v1/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    req<void>(`/api/v1/budgets/${id}`, {
      method: 'DELETE',
    }),
}

export const goalsApi = {
  list: () => req<Goal[]>('/api/v1/goals'),
  create: (input: CreateGoalInput) =>
    req<Goal>('/api/v1/goals', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Partial<CreateGoalInput>) =>
    req<Goal>(`/api/v1/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    req<void>(`/api/v1/goals/${id}`, {
      method: 'DELETE',
    }),
}
