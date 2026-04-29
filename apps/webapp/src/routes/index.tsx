import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import SectionShell from '../components/SectionShell';
import PrivacyAmount from '../components/PrivacyAmount';
import Fab from '../components/Fab';
import { TransactionModal, type TransactionCreateMode } from '../components/TransactionModal';
import { api } from '../lib/api';
import type { TxCategory } from './transactions/-queries';
import { currentMonthKey, formatMonthLabelPtBr, useTransactionsList } from './transactions/-queries';

export const Route = createFileRoute('/')({
  component: UserDashboard,
});

interface DashboardData {
  userName: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  safeToSpend: number;
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  COMMON: 'Comum',
  FUEL: 'Combustível',
  MAINTENANCE: 'Manutenção',
  TRANSFER: 'Transferência',
};

const CHANNEL_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CARD_DEBIT: 'Débito',
  CARD_CREDIT: 'Crédito',
  BANK: 'Banco',
  CASH: 'Dinheiro',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
};

function CompactStatCard({
  title,
  value,
  icon: Icon,
  tone,
  className = '',
}: {
  title: string;
  value: ReactNode;
  icon: typeof Wallet;
  tone?: 'neutral' | 'income' | 'expense';
  className?: string;
}) {
  const toneClass =
    tone === 'income'
      ? 'text-emerald-600'
      : tone === 'expense'
        ? 'text-rose-600'
        : 'text-slate-600';

  return (
    <div className={`dashboard-panel flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <div className="dashboard-stat-icon border border-slate-300/80 bg-white/85 p-2 text-slate-600 sm:p-3">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.34em] text-slate-500">
          {title}
        </span>
      </div>
      <div className={`text-xl font-bold font-display sm:text-2xl ${toneClass}`}>{value}</div>
    </div>
  );
}

function channelTone(channel?: string) {
  if (channel === 'CARD_CREDIT') return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
  if (channel === 'PIX') return 'border-sky-500/20 bg-sky-500/10 text-sky-700';
  if (channel === 'CARD_DEBIT') return 'border-orange-500/20 bg-orange-500/10 text-orange-700';
  return 'border-slate-300/80 bg-white/75 text-slate-600';
}

function statusTone(status?: string) {
  if (status === 'COMPLETED') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700';
  if (status === 'PENDING') return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
  if (status === 'CANCELED') return 'border-rose-500/20 bg-rose-500/10 text-rose-700';
  return 'border-slate-300/80 bg-white/75 text-slate-600';
}

function classificationTone(classification?: string) {
  if (classification === 'FUEL') return 'border-sky-500/20 bg-sky-500/10 text-sky-700';
  if (classification === 'MAINTENANCE') return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
  if (classification === 'TRANSFER') return 'border-violet-500/20 bg-violet-500/10 text-violet-700';
  return 'border-slate-300/80 bg-white/75 text-slate-600';
}

function formatTxDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(value));
}

function UserDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [showDesktopFilters, setShowDesktopFilters] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<TransactionCreateMode>('expense');

  const currentMonthValue = currentMonthKey();
  const dashboardMonthLabel = formatMonthLabelPtBr(currentMonthValue);

  const { data: dashboard, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard', currentMonthValue],
    queryFn: () => api.getDashboard<DashboardData>(currentMonthValue),
    staleTime: 1000 * 60,
  });

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isFetching: isTransactionsFetching,
  } = useTransactionsList({
    search,
    filterType,
    selectedCategory,
    selectedStatus,
    selectedClassification,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<TxCategory[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  const hasFilters =
    search !== '' ||
    filterType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedClassification !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedClassification('all');
    setShowMobileSearch(false);
    setShowMobileFilters(false);
  };

  if (isDashboardLoading && !dashboard) {
    return (
      <SectionShell
        backgroundClassName="transactions-bg-starfield"
        decorations={[]}
        contentClassName="dashboard-starfield"
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-sky-700" />
            <p className="text-xs text-slate-500">Carregando painel...</p>
          </div>
        </div>
      </SectionShell>
    );
  }

  if (!dashboard) return null;

  return (
    <SectionShell
      backgroundClassName="transactions-bg-starfield"
      decorations={[]}
      contentClassName="dashboard-starfield"
    >
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:gap-5 sm:p-6">
        <TransactionModal
          isOpen={isCreateOpen}
          mode={createMode}
          categories={categories}
          vehicles={vehicles}
          onClose={() => setIsCreateOpen(false)}
          onCreated={invalidate}
        />
        <Fab
          label="Nova transação"
          onClick={() => {
            setCreateMode('expense');
            setIsCreateOpen(true);
          }}
        />

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
          <div className="dashboard-panel flex flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Resumo financeiro
                </p>
                <p className="mt-1 text-xs text-slate-500">{dashboardMonthLabel}</p>
              </div>
              <Wallet className="h-4 w-4 text-slate-500" />
            </div>

            <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:grid-cols-2 xl:grid-cols-4">
              <CompactStatCard
                title="Saldo total"
                value={<PrivacyAmount value={dashboard.totalBalance} className="font-display" />}
                icon={Wallet}
                className="w-[220px] shrink-0 snap-start sm:w-auto"
              />
              <CompactStatCard
                title="Receitas"
                value={<PrivacyAmount value={dashboard.monthlyIncome} className="font-display text-emerald-600" />}
                icon={ArrowUpRight}
                tone="income"
                className="w-[220px] shrink-0 snap-start sm:w-auto"
              />
              <CompactStatCard
                title="Despesas"
                value={<PrivacyAmount value={dashboard.monthlyExpenses} className="font-display text-rose-600" />}
                icon={ArrowDownLeft}
                tone="expense"
                className="w-[220px] shrink-0 snap-start sm:w-auto"
              />
              <CompactStatCard
                title="Pode gastar"
                value={<PrivacyAmount value={dashboard.safeToSpend} className="font-display" />}
                icon={ShieldCheck}
                tone="income"
                className="w-[220px] shrink-0 snap-start sm:w-auto"
              />
            </div>
          </div>
        </section>

        <section className="dashboard-panel overflow-visible">
          <div className="flex flex-col gap-3 border-b border-slate-300/80 px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Transações
                </p>
                <h2 className="mt-1 hidden text-base font-bold text-slate-900 sm:block">
                  Filtros, busca e lista completa em um só lugar
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:mt-1">
                  {sortedTransactions.length} resultado(s)
                  {isTransactionsFetching ? ' atualizando...' : ''}
                </p>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode('expense');
                    setIsCreateOpen(true);
                  }}
                  className="transactions-primary inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                  aria-label="Nova transação"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileSearch((value) => !value)}
                  className="transactions-action inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                  aria-label={showMobileSearch ? 'Fechar busca' : 'Abrir busca'}
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">{showMobileSearch ? 'Fechar' : 'Buscar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDesktopFilters((value) => !value)}
                  className="transactions-action inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                  aria-label={showDesktopFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {showDesktopFilters ? 'Ocultar' : 'Mostrar'}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showDesktopFilters ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="transactions-action hidden items-center justify-center gap-2 px-3 py-2 text-xs font-semibold sm:inline-flex"
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-b border-slate-300/70 px-3 py-3 sm:px-4 sm:py-4">
            {showDesktopFilters ? (
              <label className="hidden md:block">
                <span className="mb-1 hidden text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 sm:block">
                  Busca
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Procure por descrição, valor ou categoria"
                    className="transactions-input w-full border border-slate-300/80 bg-white px-10 py-2.5 text-sm outline-none"
                  />
                </div>
              </label>
            ) : null}

            <div className={`${showMobileSearch ? 'block' : 'hidden'} md:hidden`}>
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Busca
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Procure por descrição, valor ou categoria"
                    className="transactions-input w-full border border-slate-300/80 bg-white px-10 py-2.5 text-sm outline-none"
                  />
                </div>
              </label>
            </div>

            {showDesktopFilters ? (
              <div className="hidden gap-3 md:grid md:grid-cols-4">
                <label>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    Tipo
                  </span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'INCOME' | 'EXPENSE')}
                    className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    Categoria
                  </span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="all">Todas</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.description ?? category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    Status
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="PENDING">Pendente</option>
                    <option value="COMPLETED">Concluída</option>
                    <option value="CANCELED">Cancelada</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    Classificação
                  </span>
                  <select
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value)}
                    className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="all">Todas</option>
                    <option value="COMMON">Comum</option>
                    <option value="FUEL">Combustível</option>
                    <option value="MAINTENANCE">Manutenção</option>
                    <option value="TRANSFER">Transferência</option>
                  </select>
                </label>
              </div>
            ) : null}

            <div className={`${showMobileFilters ? 'grid' : 'hidden'} gap-3 md:hidden md:grid-cols-4`}>
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Tipo
                </span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'INCOME' | 'EXPENSE')}
                  className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="INCOME">Receitas</option>
                  <option value="EXPENSE">Despesas</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Categoria
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.description ?? category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Status
                </span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="PENDING">Pendente</option>
                  <option value="COMPLETED">Concluída</option>
                  <option value="CANCELED">Cancelada</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Classificação
                </span>
                <select
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value)}
                  className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  <option value="all">Todas</option>
                  <option value="COMMON">Comum</option>
                  <option value="FUEL">Combustível</option>
                  <option value="MAINTENANCE">Manutenção</option>
                  <option value="TRANSFER">Transferência</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-visible">
            {isTransactionsLoading && sortedTransactions.length === 0 ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-700" />
                  Carregando transações...
                </div>
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <div className="dashboard-stat-icon border border-slate-300/80 bg-white/90 p-3 text-slate-600">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">Nenhuma transação encontrada</h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Ajuste os filtros ou crie uma nova transação para começar a preencher a tabela.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode('expense');
                    setIsCreateOpen(true);
                  }}
                  className="transactions-primary mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  Nova transação
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3 md:hidden">
                  {sortedTransactions.map((transaction) => {
                    const amount = Number(transaction.amount);
                    const signedAmount =
                      transaction.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);

                    return (
                      <article
                        key={transaction.id}
                        className="transactions-row border border-slate-300/70 bg-white/80 p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
                              {formatTxDate(transaction.date)}
                            </p>
                            <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">
                              {transaction.description}
                            </h3>
                          </div>
                          <PrivacyAmount
                            value={signedAmount}
                            showSign
                            className={`shrink-0 text-sm font-bold ${
                              transaction.type === 'INCOME'
                                ? 'semantic-income-text'
                                : 'semantic-expense-text'
                            }`}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${classificationTone(transaction.classification)}`}
                          >
                            {CLASSIFICATION_LABEL[transaction.classification ?? 'COMMON'] ?? 'Comum'}
                          </span>
                          <span
                            className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${channelTone(transaction.channel)}`}
                          >
                            {CHANNEL_LABEL[transaction.channel ?? 'BANK'] ?? 'Outro'}
                          </span>
                          <span
                            className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${statusTone(transaction.status)}`}
                          >
                            {STATUS_LABEL[transaction.status ?? 'COMPLETED'] ?? 'Concluída'}
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-600">
                          {transaction.category?.description ?? transaction.category?.name ?? 'Sem categoria'}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <table className="hidden w-full border-separate border-spacing-0 md:table">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.95))] text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    <th className="border-b border-slate-300/70 px-4 py-3">Data</th>
                    <th className="border-b border-slate-300/70 px-4 py-3">Descrição</th>
                    <th className="border-b border-slate-300/70 px-4 py-3">Categoria</th>
                    <th className="border-b border-slate-300/70 px-4 py-3">Canal</th>
                    <th className="border-b border-slate-300/70 px-4 py-3">Status</th>
                    <th className="border-b border-slate-300/70 px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((transaction) => {
                    const amount = Number(transaction.amount);
                    const signedAmount = transaction.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);
                    return (
                      <tr key={transaction.id} className="transactions-row border-b border-slate-200/70">
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                          {formatTxDate(transaction.date)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-slate-900">
                            {transaction.description}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${classificationTone(transaction.classification)}`}>
                              {CLASSIFICATION_LABEL[transaction.classification ?? 'COMMON'] ?? 'Comum'}
                            </span>
                            {transaction.isRecurring ? (
                              <span className="inline-flex items-center border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-700">
                                Recorrente
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {transaction.category?.description ?? transaction.category?.name ?? 'Sem categoria'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${channelTone(transaction.channel)}`}>
                            {CHANNEL_LABEL[transaction.channel ?? 'BANK'] ?? 'Outro'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${statusTone(transaction.status)}`}>
                            {STATUS_LABEL[transaction.status ?? 'COMPLETED'] ?? 'Concluída'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <PrivacyAmount
                            value={signedAmount}
                            showSign
                            className={`text-sm font-bold ${
                              transaction.type === 'INCOME'
                                ? 'semantic-income-text'
                                : 'semantic-expense-text'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </section>
      </div>
    </SectionShell>
  );
}
