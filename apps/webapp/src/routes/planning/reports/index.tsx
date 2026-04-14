import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  count?: number;
}

interface CategoryBreakdownResponse {
  items?: CategoryBreakdownItem[];
}

interface AnnualPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface AnnualEvolutionResponse {
  year: number;
  data: AnnualPoint[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBrl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function shortMonth(monthKey: string) {
  const [year, m] = monthKey.split('-');
  const d = new Date(Number(year), Number(m) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short' });
}

// ─── Custom tooltip para o recharts ──────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {fmtBrl(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function ReportsPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [year, setYear] = useState(new Date().getFullYear());

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
      return Array.isArray(raw) ? raw : (raw.items ?? []);
    },
    staleTime: 1000 * 60,
  });

  const { data: annual, isLoading: isLoadingAnnual } = useQuery({
    queryKey: ['reports', 'annual', year],
    queryFn: () => api.getAnnualEvolution<AnnualEvolutionResponse>(year),
    staleTime: 1000 * 60 * 5,
  });

  const annualData = (annual?.data ?? []).map((p) => ({
    ...p,
    label: shortMonth(p.month),
  }));

  const loading = isLoadingDashboard || isLoadingBreakdown || isLoadingAnnual;
  const topCategoryTotal = Math.max(...breakdown.map((i) => Number(i.total ?? 0)), 1);

  return (
    <PlanningShell>
      <SectionPageHeader
        title="Relatorios"
        description="Analise de categorias e evolucao anual do saldo."
        actions={<MonthSelector value={month} onChange={setMonth} />}
      />

      {loading ? (
        <SectionLoadingState message="Carregando indicadores..." />
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── KPIs do mês ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> Patrimônio
              </p>
              <PrivacyAmount
                value={Number(dashboard?.totalBalance ?? 0)}
                className="mt-2 text-xl font-bold font-display"
              />
            </div>
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Receitas
              </p>
              <PrivacyAmount
                value={Number(dashboard?.monthlyIncome ?? 0)}
                className="mt-2 text-xl font-bold font-display text-emerald-500"
              />
            </div>
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Gastos
              </p>
              <PrivacyAmount
                value={Number(dashboard?.monthlyExpenses ?? 0)}
                className="mt-2 text-xl font-bold font-display text-rose-500"
              />
            </div>
            <div className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Saldo Livre
              </p>
              <PrivacyAmount
                value={Number(dashboard?.safeToSpend ?? 0)}
                className="mt-2 text-xl font-bold font-display text-primary"
              />
            </div>
          </div>

          {/* ── Comparativo anual (recharts) ── */}
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Comparativo Anual
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setYear((y) => y - 1)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                  aria-label="Ano anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold tabular-nums w-10 text-center">{year}</span>
                <button
                  onClick={() => setYear((y) => Math.min(y + 1, new Date().getFullYear()))}
                  className="rounded-md p-1 hover:bg-muted transition-colors disabled:opacity-40"
                  disabled={year >= new Date().getFullYear()}
                  aria-label="Próximo ano"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-2 py-4" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData} barCategoryGap="30%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Legend
                    formatter={(v) => (
                      <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                        {v === 'income' ? 'Receitas' : 'Gastos'}
                      </span>
                    )}
                  />
                  <Bar dataKey="income" name="income" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Top categorias do mês ── */}
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5" /> Top Categorias — {formatMonthLabelPtBr(month)}
              </h2>
            </div>
            {breakdown.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">
                Nenhum gasto categorizado neste mês.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {breakdown.map((item, idx) => {
                  const total = Number(item.total ?? 0);
                  const pct = Math.max((total / topCategoryTotal) * 100, 4);
                  return (
                    <div
                      key={item.categoryId ?? item.categoryName ?? idx}
                      className="px-4 py-3 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.categoryColor ?? '#6366f1' }}
                          />
                          <p className="text-sm font-semibold truncate">
                            {item.categoryName ?? 'Sem categoria'}
                          </p>
                          <p className="text-[10px] text-muted-foreground shrink-0">
                            {item.count ?? 0} lanç.
                          </p>
                        </div>
                        <PrivacyAmount value={total} className="text-sm font-bold text-rose-500 shrink-0" />
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: item.categoryColor ?? '#6366f1' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </PlanningShell>
  );
}
