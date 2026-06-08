import { req } from './client'

export interface Goal {
  id: string
  name: string
  description?: string
  targetAmount: number
  savedAmount: number
  remaining: number
  progress: number
  color: string
  targetDate?: string
  isAchieved: boolean
}

export interface GoalInput {
  name: string
  description?: string
  targetAmount: number
  color?: string
  targetDate?: string
}

export const goalsApi = {
  list: () => req<Goal[]>('/api/v1/goals'),

  create: (input: GoalInput) =>
    req<Goal>('/api/v1/goals', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: GoalInput) =>
    req<Goal>(`/api/v1/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    req<void>(`/api/v1/goals/${id}`, { method: 'DELETE' }),
}
