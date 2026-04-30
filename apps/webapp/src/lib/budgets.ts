import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface BudgetItem {
  id: string;
  budgetId: string;
  categoryId?: string | null;
  name: string;
  amount: number;
  amountCents: number;
  spent: number;
  spentCents: number;
  remaining: number;
  remainingCents: number;
  progress: number;
  sortOrder: number;
}

export interface BudgetPlan {
  id: string;
  userId: string;
  name: string;
  targetDate: string;
  notes?: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  total: number;
  totalCents: number;
  spent: number;
  spentCents: number;
  remaining: number;
  remainingCents: number;
  progress: number;
  items: BudgetItem[];
}

export function useBudgetPlans() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: () => api.getBudgets<BudgetPlan[]>(),
    staleTime: 1000 * 30,
  });
}

export function useBudgetTransactions(budgetId?: string) {
  return useQuery({
    queryKey: ["budgets", budgetId, "transactions"],
    queryFn: () =>
      api.get<any[]>(`/api/v1/transactions?budgetId=${budgetId}&limit=1000`),
    enabled: !!budgetId,
    staleTime: 1000 * 30,
  });
}
