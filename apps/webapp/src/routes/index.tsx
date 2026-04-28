import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { z } from 'zod';
import {
  ArrowDownLeft,
  ArrowRight,
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
import type { Tx } from './activity/transactions/-queries';

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
    id: string;
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
    <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-lg border border-slate-200/80 bg-white/80 p-2 text-slate-500">
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
  const expenses = list.filter((t) => t.type === 'EXPENSE' && t.classification !== 'TRANSFER');
  const income = list.filter((t) => t.type === 'INCOME' && t.classification !== 'TRANSFER');

  const byAccount = new Map<string, number>();
  const byChannel = new Map<string, number>();
  const byCategory = new Map<string, { value: number; color?: string }>();

  for (const tx of expenses) {
    const amount = Math.abs(Number(tx.amount));
    const account = tx.account?.name ?? tx.accountId ?? 'Sem conta';
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

    byAccount.set(account, (byAccount.get(account) ?? 0) + amount);
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
    byAccount: toRows([...byAccount.entries()]),
    byChannel: toRows([...byChannel.entries()]),
    byCategory: [...byCategory.entries()]
      .map(([label, item]) => ({ label, value: item.value, color: item.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  };
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
        backgroundClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),transparent_35%),radial-gradient(circle_at_20%_12%,rgba(125,211,252,0.14),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(226,232,240,0.94))]"
        decorations={[]}
        contentClassName="wallet-starfield"
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
      backgroundClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),transparent_35%),radial-gradient(circle_at_20%_12%,rgba(125,211,252,0.14),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(226,232,240,0.94))]"
      decorations={[]}
      contentClassName="wallet-starfield"
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
            value={<PrivacyAmount value={charts.income} className="font-display text-emerald-600" />}
            icon={ArrowUpRight}
          />
          <StatCard
            title="Despesas"
            value={<PrivacyAmount value={charts.expenses} className="font-display text-slate-900" />}
            icon={ArrowDownLeft}
          />
          <StatCard
            title="Pode Gastar"
            value={
              <PrivacyAmount
                value={Math.max(data.totalBalance - charts.expenses, 0)}
                className="font-display text-emerald-600"
              />
            }
            icon={ShieldCheck}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Gasto por conta
                </p>
                <h2 className="text-sm font-bold text-slate-900">Onde o dinheiro saiu</h2>
              </div>
            </div>
            <div className="h-[260px] px-3 py-3">
              {charts.byAccount.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Sem dados neste período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.byAccount} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <RechartsTooltip formatter={(val: number) => moneyLabel(val)} />
                    <Bar dataKey="value" fill="#0f766e" radius={[0, 8, 8, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
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
                          fill={
                            entry.label === 'Pix'
                              ? '#0ea5e9'
                              : entry.label === 'Débito'
                                ? '#64748b'
                                : entry.label === 'Crédito'
                                  ? '#14b8a6'
                                  : '#94a3b8'
                          }
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => moneyLabel(val)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
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
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
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

        <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Atividade recente
                </p>
                <h2 className="text-sm font-bold text-slate-900">Últimos lançamentos</h2>
              </div>
              <button
                onClick={() => void navigate({ to: '/activity/transactions' })}
                className="wallet-sci-button px-3 py-2 text-[10px]"
              >
                Ver tudo
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-200/70">
              {data.recentTransactions.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Nenhuma transação recente.</p>
              ) : (
                data.recentTransactions.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/70 transition-smooth"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{t.description}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {t.category?.name ?? '—'} · {new Date(t.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <PrivacyAmount
                      value={t.type === 'INCOME' ? t.amount : -t.amount}
                      showSign
                      className={`shrink-0 text-sm font-bold ${
                        t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-sm overflow-hidden h-fit">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Contas
                </p>
                <h2 className="text-sm font-bold text-slate-900">Saldo consolidado</h2>
              </div>
              <button
                onClick={() => void navigate({ to: '/wallet/accounts' })}
                className="wallet-sci-button px-3 py-2 text-[10px]"
              >
                Gerenciar
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-200/70">
              {data.accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{acc.name}</p>
                  <PrivacyAmount value={acc.balance} className="shrink-0 text-sm font-bold text-slate-900" />
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200/80 bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Total</p>
                <PrivacyAmount value={data.totalBalance} className="text-sm font-bold text-slate-900" />
              </div>
            </div>
          </div>
        </section>

        <Fab
          label="Nova transação"
          onClick={() =>
            void navigate({
              to: '/activity/transactions/crud-transactions',
              search: { transactionId: undefined },
            })
          }
        />
      </div>
    </SectionShell>
  );
}
