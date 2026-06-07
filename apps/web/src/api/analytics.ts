import { req } from './client'

export interface MonthlyPoint {
  month: string
  income: number
  expenses: number
  net: number
  incomeCents: number
  expenseCents: number
}

export interface CategoryBreakdownItem {
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  type: string
  total: number
  totalCents: number
  count: number
}

export interface DashboardData {
  userName: string
  month: string
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  safeToSpend: number
  recentTransactions: Array<{
    id: string
    description: string
    amount: number
    type: string
    date: string
    category: { name?: string; color?: string }
  }>
  cashFlow: Array<{ day: string; value: number }>
}

export const analyticsApi = {
  getDashboard: (month?: string) =>
    req<DashboardData>(`/api/v1/dashboard${month ? `?month=${month}` : ''}`),

  getMonthlyEvolution: () =>
    req<MonthlyPoint[]>('/api/v1/dashboard/monthly-evolution'),

  getCategoryBreakdown: (month: string, type: 'INCOME' | 'EXPENSE' = 'EXPENSE') =>
    req<{ month: string; type: string; items: CategoryBreakdownItem[] }>(
      `/api/v1/dashboard/category-breakdown?month=${month}&type=${type}`,
    ),
}
