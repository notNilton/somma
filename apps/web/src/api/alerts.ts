import { req } from './client'

export interface Alert {
  id: string
  budgetId: string
  budgetName: string
  thresholdPct: number
  percentUsed: number
  allocated: number
  spent: number
  isRead: boolean
  createdAt: string
}

export const alertsApi = {
  list: () =>
    req<{ items: Alert[] }>('/api/v1/alerts').then(r => r.items),

  markRead: (id: string) =>
    req<void>(`/api/v1/alerts/${id}/read`, { method: 'PATCH' }),

  clearRead: () =>
    req<void>('/api/v1/alerts', { method: 'DELETE' }),
}
