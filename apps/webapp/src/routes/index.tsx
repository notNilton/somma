import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import PrivacyAmount from '../components/PrivacyAmount';
import Fab from '../components/Fab';
import { api } from '../lib/api';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  ShieldCheck,
  Wallet,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

export const Route = createFileRoute('/')({
  component: UserDashboard,
});

interface DashboardData {
  userName: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  safeToSpend: number;
  accounts: Array<{
    label: string;
    val: number;
    color: string;
    icon: string;
  }>;
  recentTransactions: Array<{
    label: string;
    cat: string;
    val: number;
    date: string;
    icon: string;
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

function UserDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
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

  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
  const maxFlow = Math.max(...data.cashFlow.map((d) => d.value), 1);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">Olá, {data.userName} 👋</h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Aqui está o seu painel financeiro de hoje.
          </p>
        </div>
        {/* Botão visível apenas no desktop — mobile usa FAB */}
        <button
          onClick={() => void navigate({ to: '/transactions/crud-transactions' })}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Transação
        </button>
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
                data.recentTransactions.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 min-h-[52px] hover:bg-muted/20 transition-smooth cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium leading-tight">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.cat} · {t.date}
                      </p>
                    </div>
                    <PrivacyAmount
                      value={t.val}
                      showSign
                      className={`text-sm font-bold ${t.val > 0 ? 'text-emerald-500' : 'text-foreground'}`}
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
                <p className="text-sm font-medium">{acc.label}</p>
                <PrivacyAmount value={acc.val} className="text-sm font-bold" />
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
        onClick={() => void navigate({ to: '/transactions/crud-transactions' })}
      />
    </div>
  );
}
