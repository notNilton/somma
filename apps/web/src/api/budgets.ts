import { req } from './client'
import type { Budget } from '../types'

export const budgetsApi = {
  list: () => req<Budget[]>('/api/v1/budgets'),
}
