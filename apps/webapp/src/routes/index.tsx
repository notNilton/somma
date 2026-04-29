import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { z } from 'zod';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import SectionShell from '../components/SectionShell';
import PrivacyAmount from '../components/PrivacyAmount';
import Fab from '../components/Fab';
import { api } from '../lib/api';
import type { Tx } from './transactions/-queries';

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
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    category: { name: string; color: string } | null;
  }>;
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: typeof Wallet;
}) {
  return (
    <div className="dashboard-stat border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,245,249,0.86))] px-4 py-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="dashboard-stat-icon border border-slate-300/80 bg-white/80 p-2 text-slate-600">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
          {title}
        </span>
      </div>
      <div className="mt-3 text-lg font-bold font-display text-slate-900">{value}</div>
    </div>
  );
}

function moneyLabel(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLocal(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function yearToDateRange(monthValue: string) {
  const [yearStr, monthStr] = monthValue.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const from = new Date(year, 0, 1);
  const to = new Date(year, month + 1, 0);
  return { from: formatDateLocal(from), to: formatDateLocal(to) };
}

function aggregateTransactions(list: Tx[]) {
  const expenses = list.filter((t) => t.type === 'EXPENSE');
  const income = list.filter((t) => t.type === 'INCOME');

  const byChannel = new Map<string, number>();
  const byCategory = new Map<string, { value: number; color?: string }>();

  for (const tx of expenses) {
    const amount = Math.abs(Number(tx.amount));
    const channel =
      tx.channel === 'CARD_CREDIT'
        ? 'Crédito'
        : tx.channel === 'CARD_DEBIT'
          ? 'Débito'
          : tx.channel === 'PIX'
            ? 'Pix'
            : tx.channel === 'BANK'
              ? 'Bancária'
      : 'Outro';
    const category = tx.category?.name ?? 'Sem categoria';

    byChannel.set(channel, (byChannel.get(channel) ?? 0) + amount);
    byCategory.set(category, {
      value: (byCategory.get(category)?.value ?? 0) + amount,
      color: tx.category?.color ?? byCategory.get(category)?.color,
    });
  }

  const toRows = (entries: [string, number][]) =>
    entries
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

  return {
    income: income.reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0),
    expenses: expenses.reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0),
    byChannel: toRows([...byChannel.entries()]),
    byCategory: [...byCategory.entries()]
      .map(([label, item]) => ({ label, value: item.value, color: item.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  };
}

function channelFill(label: string) {
  if (label === 'Pix') return '#0ea5e9';
  if (label === 'Débito') return '#f97316';
  if (label === 'Crédito') return '#f59e0b';
  return '#94a3b8';
}

function UserDashboard() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const currentMonthValue =
    search.month ||
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', currentMonthValue],
    queryFn: () => api.getDashboard<DashboardData>(currentMonthValue),
    staleTime: 1000 * 60,
  });

  const { from, to } = yearToDateRange(currentMonthValue);

  const { data: periodTransactions = [] } = useQuery({
    queryKey: ['dashboard', 'charts', currentMonthValue, from, to],
    queryFn: () =>
      api.get<Tx[]>(
        `/api/v1/transactions?${new URLSearchParams({
          from,
          to,
          page: '1',
          limit: '5000',
        }).toString()}`,
      ),
    staleTime: 1000 * 60,
  });

  const charts = useMemo(() => aggregateTransactions(periodTransactions), [periodTransactions]);

  if (isLoading) {
    return (
      <SectionShell
        backgroundClassName="transactions-bg-starfield"
        decorations={[]}
        contentClassName="dashboard-starfield"
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-sky-700" />
            <p className="text-xs text-slate-500">Carregando...</p>
          </div>
        </div>
      </SectionShell>
    );
  }

  if (!data) return null;

  return (
    <SectionShell
      backgroundClassName="transactions-bg-starfield"
      decorations={[]}
      contentClassName="dashboard-starfield"
    >
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard
            title="Saldo Total"
            value={<PrivacyAmount value={data.totalBalance} className="font-display" />}
            icon={Wallet}
          />
          <StatCard
            title="Receitas"
            value={<PrivacyAmount value={charts.income} className="font-display semantic-income-text" />}
            icon={ArrowUpRight}
          />
          <StatCard
            title="Despesas"
            value={<PrivacyAmount value={charts.expenses} className="font-display semantic-expense-text" />}
            icon={ArrowDownLeft}
          />
          <StatCard
            title="Pode Gastar"
            value={
              <PrivacyAmount
                value={Math.max(data.totalBalance - charts.expenses, 0)}
                className="font-display semantic-income-text"
              />
            }
            icon={ShieldCheck}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="dashboard-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-300/80 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Débito, crédito e pix
                </p>
                <h2 className="text-sm font-bold text-slate-900">Por canal</h2>
              </div>
            </div>
            <div className="h-[260px] px-3 py-3">
              {charts.byChannel.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Sem dados neste período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.byChannel} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={82} paddingAngle={2}>
                      {charts.byChannel.map((entry) => (
                        <Cell
                          key={entry.label}
                          fill={channelFill(entry.label)}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => moneyLabel(val)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="dashboard-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-300/80 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Gasto por categoria
                </p>
                <h2 className="text-sm font-bold text-slate-900">Onde foi consumido</h2>
              </div>
            </div>
            <div className="h-[260px] px-3 py-3">
              {charts.byCategory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Sem dados neste período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.byCategory} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <RechartsTooltip formatter={(val: number) => moneyLabel(val)} />
                    <Bar dataKey="value" radius={0} barSize={18}>
                      {charts.byCategory.map((entry) => (
                        <Cell key={entry.label} fill={entry.color ?? '#0f766e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <Fab
          label="Nova transação"
          onClick={() =>
            void navigate({
              to: '/transactions/crud-transactions',
              search: { transactionId: undefined },
            })
          }
        />
      </div>
    </SectionShell>
  );
}
