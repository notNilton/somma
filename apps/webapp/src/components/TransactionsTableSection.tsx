import { ChevronDown, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import DashboardPanel from './DashboardPanel';
import DashboardSectionHeader from './DashboardSectionHeader';
import PrivacyAmount from './PrivacyAmount';
import type { Tx, TxCategory } from '../routes/transactions/-queries';

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

const SYNC_LABEL: Record<string, string> = {
  pending: 'Pendente local',
  synced: 'Sincronizado',
  error: 'Erro de sync',
};

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

function syncTone(syncStatus?: string) {
  if (syncStatus === 'pending') return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
  if (syncStatus === 'error') return 'border-rose-500/20 bg-rose-500/10 text-rose-700';
  if (syncStatus === 'synced') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700';
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

function SectionButton({
  children,
  className = '',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      {...props}
      className={`transactions-action inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export default function TransactionsTableSection({
  transactions,
  categories,
  countLabel,
  isLoading,
  search,
  setSearch,
  filterType,
  setFilterType,
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
  selectedClassification,
  setSelectedClassification,
  showDesktopFilters,
  setShowDesktopFilters,
  showMobileSearch,
  setShowMobileSearch,
  showMobileFilters,
  setShowMobileFilters,
  hasFilters,
  onClearFilters,
  onCreateNew,
}: {
  transactions: Tx[];
  categories: TxCategory[];
  countLabel: ReactNode;
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  filterType: 'all' | 'INCOME' | 'EXPENSE';
  setFilterType: (value: 'all' | 'INCOME' | 'EXPENSE') => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedClassification: string;
  setSelectedClassification: (value: string) => void;
  showDesktopFilters: boolean;
  setShowDesktopFilters: (value: boolean | ((value: boolean) => boolean)) => void;
  showMobileSearch: boolean;
  setShowMobileSearch: (value: boolean | ((value: boolean) => boolean)) => void;
  showMobileFilters: boolean;
  setShowMobileFilters: (value: boolean | ((value: boolean) => boolean)) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateNew: () => void;
}) {
  return (
    <DashboardPanel>
      <DashboardSectionHeader
        eyebrow="Transações"
        title="Filtros, busca e lista completa em um só lugar"
        count={countLabel}
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <SectionButton onClick={onCreateNew} className="transactions-primary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova</span>
            </SectionButton>
            <SectionButton
              onClick={() => setShowMobileSearch((value) => !value)}
              aria-label={showMobileSearch ? 'Fechar busca' : 'Abrir busca'}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{showMobileSearch ? 'Fechar' : 'Buscar'}</span>
            </SectionButton>
            <SectionButton
              onClick={() => setShowDesktopFilters((value) => !value)}
              aria-label={showDesktopFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{showDesktopFilters ? 'Ocultar' : 'Mostrar'}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDesktopFilters ? 'rotate-180' : ''}`}
              />
            </SectionButton>
            {hasFilters ? (
              <SectionButton onClick={onClearFilters} className="hidden sm:inline-flex">
                Limpar filtros
              </SectionButton>
            ) : null}
          </div>
        }
      />

      <div className="flex items-center gap-2 border-b border-slate-300/70 px-3 pb-3 md:hidden">
        <SectionButton onClick={onCreateNew} className="transactions-primary">
          <Plus className="h-4 w-4" />
          Nova
        </SectionButton>
        <SectionButton
          onClick={() => setShowMobileSearch((value) => !value)}
          aria-label={showMobileSearch ? 'Fechar busca' : 'Abrir busca'}
        >
          <Search className="h-4 w-4" />
        </SectionButton>
        <SectionButton
          onClick={() => setShowMobileFilters((value) => !value)}
          aria-label={showMobileFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`}
          />
        </SectionButton>
        {hasFilters ? (
          <SectionButton onClick={onClearFilters}>
            Limpar
          </SectionButton>
        ) : null}
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
        {isLoading && transactions.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-sky-700" />
              Carregando transações...
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="border border-slate-300/80 bg-white/90 p-3 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">Nenhuma transação encontrada</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Ajuste os filtros ou crie uma nova transação para começar a preencher a tabela.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="transactions-primary mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Nova transação
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {transactions.map((transaction) => {
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
                      {transaction.syncStatus ? (
                        <span
                          className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${syncTone(transaction.syncStatus)}`}
                        >
                          {SYNC_LABEL[transaction.syncStatus] ?? 'Sync'}
                        </span>
                      ) : null}
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
                {transactions.map((transaction) => {
                  const amount = Number(transaction.amount);
                  const signedAmount =
                    transaction.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);
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
                          <span
                            className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${classificationTone(transaction.classification)}`}
                          >
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
                        <span
                          className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${channelTone(transaction.channel)}`}
                        >
                          {CHANNEL_LABEL[transaction.channel ?? 'BANK'] ?? 'Outro'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${statusTone(transaction.status)}`}
                        >
                          {STATUS_LABEL[transaction.status ?? 'COMPLETED'] ?? 'Concluída'}
                        </span>
                        {transaction.syncStatus ? (
                          <span
                            className={`ml-2 inline-flex items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${syncTone(transaction.syncStatus)}`}
                          >
                            {SYNC_LABEL[transaction.syncStatus] ?? 'Sync'}
                          </span>
                        ) : null}
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
    </DashboardPanel>
  );
}
