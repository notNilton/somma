import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Loader2,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import PlanningShell from '../../../components/PlanningShell';
import { api, unwrapData, type ApiDataResponse } from '../../../lib/api';
import PrivacyAmount from '../../../components/PrivacyAmount';
import { MonthSelector } from '../../../components/MonthSelector';
import { SectionLoadingState } from '../../../components/SectionFeedback';
import SectionPageHeader from '../../../components/SectionPageHeader';
import { currentMonthKey, formatMonthLabelPtBr } from '../../../lib/formatters';

export const Route = createFileRoute('/planning/reports/')({
  component: ReportsPage,
});

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  safeToSpend: number;
}

interface CategoryBreakdownItem {
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  total?: number;
  totalCents?: number;
  count?: number;
}

interface CategoryBreakdownResponse {
  items?: CategoryBreakdownItem[];
}

interface MonthlyEvolutionPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

function ReportsPage() {
  const [month, setMonth] = useState(currentMonthKey());

  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard', 'reports', month],
    queryFn: () => api.getDashboard<DashboardData>(month),
    staleTime: 1000 * 60,
  });

  const { data: breakdown = [], isLoading: isLoadingBreakdown } = useQuery({
    queryKey: ['reports', 'breakdown', month],
    queryFn: async () => {
      const res = await api.getCategoryBreakdown<
        CategoryBreakdownResponse | ApiDataResponse<CategoryBreakdownItem[]> | CategoryBreakdownItem[]
      >(month, 'EXPENSE');
      const raw = unwrapData(res, [] as CategoryBreakdownItem[] | CategoryBreakdownResponse);
      return Array.isArray(raw) ? raw : raw.items ?? [];
    },
    staleTime: 1000 * 60,
  });

  const { data: evolution = [], isLoading: isLoadingEvolution } = useQuery({
    queryKey: ['reports', 'evolution'],
    queryFn: () => api.getMonthlyEvolution<MonthlyEvolutionPoint[]>(),
    staleTime: 1000 * 60,
  });

  const loading = isLoadingDashboard || isLoadingBreakdown || isLoadingEvolution;
  const topCategoryTotal = Math.max(...breakdown.map((item) => Number(item.total ?? 0)), 1);

  return (
    <PlanningShell>
      <SectionPageHeader
        title="Relatorios"
        description="Analise por categoria e evolucao recente do saldo."
        actions={<MonthSelector value={month} onChange={setMonth} />}
      />

      {loading ? (
        <SectionLoadingState message="Carregando indicadores..." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Patrimônio
              </p>
              <PrivacyAmount value={Number(dashboard?.totalBalance ?? 0)} className="mt-2 text-xl font-bold font-display" />
            </div>
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Receitas
              </p>
              <PrivacyAmount value={Number(dashboard?.monthlyIncome ?? 0)} className="mt-2 text-xl font-bold font-display text-emerald-500" />
            </div>
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" />
                Gastos
              </p>
              <PrivacyAmount value={Number(dashboard?.monthlyExpenses ?? 0)} className="mt-2 text-xl font-bold font-display text-rose-500" />
            </div>
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Saldo Livre
              </p>
              <PrivacyAmount value={Number(dashboard?.safeToSpend ?? 0)} className="mt-2 text-xl font-bold font-display text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-premium overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5" />
                  Gastos por Categoria
                </h2>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {formatMonthLabelPtBr(month)}
                </span>
              </div>
              {breakdown.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">
                  Nenhum gasto categorizado neste mês.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {breakdown.map((item) => {
                    const total = Number(item.total ?? 0);
                    const width = `${Math.max((total / topCategoryTotal) * 100, 6)}%`;
                    return (
                      <div key={item.categoryId ?? item.categoryName} className="px-4 py-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {item.categoryName ?? 'Sem categoria'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.count ?? 0} lançamento(s)
                            </p>
                          </div>
                          <PrivacyAmount value={total} className="text-sm font-bold text-rose-500 shrink-0" />
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width,
                              backgroundColor: item.categoryColor ?? '#6366f1',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card-premium overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Evolução dos Últimos Meses
                </h2>
              </div>
              <div className="divide-y divide-border">
                {evolution.map((point) => (
                  <div key={point.month} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{formatMonthLabelPtBr(point.month)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Receitas <span className="text-emerald-500">{point.income.toFixed(2)}</span> · Gastos <span className="text-rose-500">{point.expenses.toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Saldo
                      </p>
                      <PrivacyAmount
                        value={Number(point.net ?? 0)}
                        className={`text-sm font-bold ${Number(point.net ?? 0) >= 0 ? `text-emerald-500` : `text-rose-500`}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </PlanningShell>
  );
}
