import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import PrivacyAmount from '../components/PrivacyAmount';
import Fab from '../components/Fab';
import { api } from '../lib/api';
import { MonthSelector } from '../components/MonthSelector';
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  ShieldCheck,
  Wallet,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  type LucideIcon,
} from 'lucide-react';

const dashboardSearchSchema = z.object({
  month: z.string().optional(),
});

export const Route = createFileRoute('/')({
  component: UserDashboard,
  validateSearch: dashboardSearchSchema,
});

interface DashboardData {
  userName: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  safeToSpend: number;
  accounts: Array<{
    name: string;
    balance: number;
  }>;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    category: { name: string; color: string } | null;
  }>;
  cashFlow: Array<{
    day: string;
    value: number;
  }>;
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  detail: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="card-premium p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
      <div className="flex items-center justify-between">
        <div className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/50">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {detail}
        </span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <div className={`text-lg sm:text-xl font-bold font-display mt-0.5 ${accent ?? ''}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

const formatBrl = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

function UserDashboard() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [breakdownType, setBreakdownType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const currentMonthValue = search.month || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', currentMonthValue],
    queryFn: () => api.getDashboard<DashboardData>(currentMonthValue),
    staleTime: 1000 * 60,
  });

  const { data: evolutionData = [] } = useQuery({
    queryKey: ['dashboard', 'monthly-evolution'],
    queryFn: async () => {
      const res = await api.getMonthlyEvolution<any>();
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
    staleTime: 1000 * 60,
  });

  const { data: breakdownData = [] } = useQuery({
    queryKey: ['dashboard', 'category-breakdown', currentMonthValue, breakdownType],
    queryFn: async () => {
      const res = await api.getCategoryBreakdown<any>(currentMonthValue, breakdownType);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
    staleTime: 1000 * 60,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!data) return null;

  const [yearStr, monthStr] = currentMonthValue.split('-');
  const currentMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1).toLocaleString('pt-BR', { month: 'long' });
  const maxFlow = Math.max(...data.cashFlow.map((d) => d.value), 1);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">Olá, {data.userName} 👋</h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Aqui está o seu painel financeiro para {currentMonth}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector
            value={currentMonthValue}
            onChange={(m) => navigate({ to: '/', search: { month: m } })}
          />
          {/* Botão visível apenas no desktop — mobile usa FAB */}
          <button
            onClick={() => void navigate({ to: '/transactions/crud-transactions', search: { transactionId: undefined } })}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard
          title="Saldo Total"
          value={<PrivacyAmount value={data.totalBalance} className="font-display" />}
          detail={`${data.accounts.length} conta${data.accounts.length !== 1 ? 's' : ''}`}
          icon={Wallet}
        />
        <MetricCard
          title={`Receitas — ${currentMonth}`}
          value={<PrivacyAmount value={data.monthlyIncome} className="font-display" />}
          detail="Este mês"
          icon={ArrowUpRight}
          accent="text-emerald-500"
        />
        <MetricCard
          title={`Despesas — ${currentMonth}`}
          value={<PrivacyAmount value={data.monthlyExpenses} className="font-display" />}
          detail="Este mês"
          icon={ArrowDownLeft}
        />
        <MetricCard
          title="Pode Gastar"
          value={<PrivacyAmount value={data.safeToSpend} className="font-display" />}
          detail="Safe-to-Spend"
          icon={ShieldCheck}
          accent={data.safeToSpend >= 0 ? 'text-emerald-500' : 'text-rose-500'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Esquerda: Gráfico + Transações recentes */}
        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
          {/* Cash Flow */}
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Fluxo de Caixa — 7 dias
              </h2>
            </div>
            <div className="h-[100px] sm:h-[140px] flex items-end gap-2 px-1">
              {data.cashFlow.map((day, i) => {
                const height = (day.value / maxFlow) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col gap-1 items-center group">
                    <div className="w-full bg-muted/30 rounded-t h-[70px] sm:h-[110px] flex flex-col justify-end overflow-hidden">
                      <div
                        className="w-full bg-primary/40 group-hover:bg-primary/70 transition-smooth"
                        style={{ height: `${height === 0 ? 4 : height}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase">
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Evolution */}
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Evolução (6 meses)
              </h2>
            </div>
            <div className="h-[250px] w-full text-xs">
              {evolutionData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Sem dados para evolução.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolutionData}>
                    <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(val: number) => formatBrl(val)} />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} name="Receita" />
                    <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} name="Despesa" />
                    <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="Líquido" dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card-premium p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Despesas por Categoria
                </h2>
              </div>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                <button
                  onClick={() => setBreakdownType('EXPENSE')}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-smooth ${breakdownType === 'EXPENSE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  DESPESAS
                </button>
                <button
                  onClick={() => setBreakdownType('INCOME')}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-smooth ${breakdownType === 'INCOME' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  RECEITAS
                </button>
              </div>
            </div>
            <div className="h-[250px] w-full flex items-center justify-center text-xs">
              {breakdownData.length === 0 ? (
                <p className="text-muted-foreground">Sem dados neste período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {(breakdownData as { color?: string }[]).map((entry, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => formatBrl(val)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Transações recentes */}
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Atividade Recente
              </h2>
              <button
                onClick={() => void navigate({ to: '/transactions' })}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Ver tudo →
              </button>
            </div>
            <div className="divide-y divide-border">
              {data.recentTransactions.length === 0 ? (
                <p className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma transação recente.
                </p>
              ) : (
                data.recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3 min-h-[52px] hover:bg-muted/20 transition-smooth cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium leading-tight">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.category?.name ?? '—'} · {new Date(t.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <PrivacyAmount
                      value={t.type === 'INCOME' ? t.amount : -t.amount}
                      showSign
                      className={`text-sm font-bold ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Direita: Contas */}
        <div className="card-premium overflow-hidden h-fit">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Suas Contas
            </h2>
            <button
              onClick={() => void navigate({ to: '/accounts' })}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Gerenciar →
            </button>
          </div>
          <div className="divide-y divide-border">
            {data.accounts.map((acc, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 min-h-[52px] hover:bg-muted/20 transition-smooth cursor-pointer"
              >
                <p className="text-sm font-medium">{acc.name}</p>
                <PrivacyAmount value={acc.balance} className="text-sm font-bold" />
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Total
              </p>
              <PrivacyAmount value={data.totalBalance} className="text-sm font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* FAB mobile — Nova Transação */}
      <Fab
        label="Nova transação"
        onClick={() => void navigate({ to: '/transactions/crud-transactions', search: { transactionId: undefined } })}
      />
    </div>
  );
}
