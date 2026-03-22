import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PrivacyAmount from '../components/PrivacyAmount';
import { TransactionModal } from '../components/TransactionModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ImportModal } from '../components/ImportModal';
import { api } from '../lib/api';
import {
  Plus,
  FileUp,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Tag,
  CreditCard,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Ban,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  type Tx,
  type TxCategory,
  formatMonthLabelPtBr,
  currentMonthKey,
  sumExpenses,
  sumDebitExpenses,
  sumCreditExpenses,
  sumIncome,
  useTransactionsList,
} from './transactions.queries';

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
});

function TransactionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthKey());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTransaction, setEditingTransaction] = useState<Tx | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, true>>({});
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [cancelRecurringTarget, setCancelRecurringTarget] = useState<Tx | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'description' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: transactions = [], isLoading } = useTransactionsList({
    search,
    filterType,
    selectedCategory,
    selectedAccount,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<TxCategory[]>('/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () =>
      api.get<
        Array<{
          id: string;
          name: string;
          cards?: Array<{ id: string; accountId: string; name: string; type: 'CREDIT' | 'DEBIT' }>;
        }>
      >('/accounts'),
    staleTime: 1000 * 60 * 5,
  });

  const handleImported = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/transactions/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/transactions/${id}`, { status: 'COMPLETED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const stopRecurringMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/transactions/${id}`, { isRecurring: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const handleCreate = () => {
    setModalMode('create');
    setEditingTransaction(null);
    setIsModalOpen(true);
  };
  const handleEdit = (t: Tx) => {
    setModalMode('edit');
    setEditingTransaction(t);
    setIsModalOpen(true);
  };
  const handleDelete = (t: Tx) => {
    if (t.isRecurring) {
      setCancelRecurringTarget(t);
    } else {
      setConfirmDeleteId(t.id);
      setConfirmDeleteOpen(true);
    }
  };
  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handleToggleSort = (key: 'date' | 'description' | 'amount') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const availableMonths = Array.from(
    new Set([currentMonthKey(), ...transactions.map((t) => t.date.slice(0, 7))]),
  )
    .sort()
    .reverse();

  const activeMonth = availableMonths.includes(selectedMonth)
    ? selectedMonth
    : (availableMonths[0] ?? currentMonthKey());

  const activeIndex = availableMonths.indexOf(activeMonth);
  const canGoPrev = activeIndex < availableMonths.length - 1;
  const canGoNext = activeIndex > 0;

  const tableTransactions = transactions.filter((t) => t.date.slice(0, 7) === activeMonth);

  const summaryExpenses = sumExpenses(tableTransactions);
  const summaryDebit = sumDebitExpenses(tableTransactions);
  const summaryCredit = sumCreditExpenses(tableTransactions);
  const summaryIncome = sumIncome(tableTransactions);

  const truncate = (s: string, max: number) => {
    const str = (s ?? '').trim();
    return str.length <= max ? str : str.slice(0, max - 1).trimEnd() + '…';
  };

  const isAnyFilterActive =
    search !== '' ||
    filterType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedAccount !== 'all';

  const sortedTransactions = [...tableTransactions].sort((a, b) => {
    const cmp =
      sortKey === 'date'
        ? a.date.localeCompare(b.date)
        : sortKey === 'description'
          ? (a.description ?? '').localeCompare(b.description ?? '')
          : Math.abs(Number(a.amount)) - Math.abs(Number(b.amount));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const dayKeys: string[] = [];
  const groupedByDay: Record<string, Tx[]> = {};
  for (const t of sortedTransactions) {
    const day = t.date.slice(0, 10);
    if (!groupedByDay[day]) {
      groupedByDay[day] = [];
      dayKeys.push(day);
    }
    groupedByDay[day]!.push(t);
  }

  const selectedList = Object.keys(selectedIds);
  const selectedDeletable = tableTransactions.filter((t) => selectedIds[t.id]);
  const allDeletableIds = tableTransactions.map((t) => t.id);
  const isAllSelected =
    allDeletableIds.length > 0 && allDeletableIds.every((id) => selectedIds[id]);
  const isSomeSelected = allDeletableIds.some((id) => selectedIds[id]);

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Excluir transação"
        description="Esta ação não pode ser desfeita. Se for parcelada, as parcelas futuras também podem ser removidas."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeleteOpen(false);
          setConfirmDeleteId(null);
        }}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          await deleteMutation.mutateAsync(confirmDeleteId);
          setConfirmDeleteOpen(false);
          setConfirmDeleteId(null);
        }}
      />
      <ConfirmDialog
        isOpen={confirmBulkDeleteOpen}
        title={`Excluir ${selectedDeletable.length} transação(ões)`}
        description="Esta ação não pode ser desfeita."
        confirmText="Excluir selecionadas"
        cancelText="Cancelar"
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
        onCancel={() => {
          if (bulkDeleteMutation.isPending) return;
          setConfirmBulkDeleteOpen(false);
        }}
        onConfirm={async () => {
          const ids = selectedDeletable.map((t) => t.id);
          if (ids.length === 0) {
            setConfirmBulkDeleteOpen(false);
            return;
          }
          await bulkDeleteMutation.mutateAsync(ids);
          setSelectedIds({});
          setConfirmBulkDeleteOpen(false);
        }}
      />

      {/* Dialog: cancelar recorrência */}
      {cancelRecurringTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 text-amber-500">
              <RefreshCw className="w-4 h-4" />
              <p className="font-bold text-sm">Transação recorrente</p>
            </div>
            <p className="text-sm text-muted-foreground">
              "{cancelRecurringTarget.description}" é recorrente. O que deseja fazer?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await deleteMutation.mutateAsync(cancelRecurringTarget.id);
                  setCancelRecurringTarget(null);
                }}
                disabled={deleteMutation.isPending || stopRecurringMutation.isPending}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth disabled:opacity-50"
              >
                Excluir só esta ocorrência
              </button>
              <button
                onClick={async () => {
                  await stopRecurringMutation.mutateAsync(cancelRecurringTarget.id);
                  setCancelRecurringTarget(null);
                }}
                disabled={deleteMutation.isPending || stopRecurringMutation.isPending}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-smooth disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                Parar todas as futuras
              </button>
              <button
                onClick={() => setCancelRecurringTarget(null)}
                disabled={deleteMutation.isPending || stopRecurringMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-smooth"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        accounts={accounts}
        onImported={handleImported}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Transações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Histórico completo e importação de extratos.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth"
          >
            <FileUp className="w-3.5 h-3.5" />
            Importar
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Resumo + seletor de mês */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Déb / Pix
            </p>
            <PrivacyAmount
              value={-summaryDebit}
              className="text-2xl font-bold font-display tracking-tight block text-rose-500"
            />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Crédito
            </p>
            <PrivacyAmount
              value={-summaryCredit}
              className="text-2xl font-bold font-display tracking-tight block text-purple-500"
            />
          </div>
          <div className="pl-6 border-l border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Total Gastos
            </p>
            <PrivacyAmount
              value={-summaryExpenses}
              className="text-2xl font-bold font-display tracking-tight block text-rose-500"
            />
          </div>
          <div className="pl-6 border-l border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Receitas
            </p>
            <PrivacyAmount
              value={summaryIncome}
              className="text-2xl font-bold font-display tracking-tight block text-emerald-500"
            />
          </div>
        </div>

        {/* Seletor de mês */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => setSelectedMonth(availableMonths[activeIndex + 1] ?? activeMonth)}
            className="p-1.5 rounded-lg hover:bg-muted transition-smooth disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={activeMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
          >
            {availableMonths.map((key) => (
              <option key={key} value={key}>
                {formatMonthLabelPtBr(key)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setSelectedMonth(availableMonths[activeIndex - 1] ?? activeMonth)}
            className="p-1.5 rounded-lg hover:bg-muted transition-smooth disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none w-[200px]"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'INCOME' | 'EXPENSE')}
            className="px-3 py-2 bg-card border border-border rounded-lg text-xs font-medium hover:bg-muted transition-smooth outline-none cursor-pointer"
          >
            <option value="all">Todos os tipos</option>
            <option value="INCOME">Entradas</option>
            <option value="EXPENSE">Saídas</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-xs font-medium hover:bg-muted transition-smooth outline-none cursor-pointer"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.description ?? cat.name}
              </option>
            ))}
          </select>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-xs font-medium hover:bg-muted transition-smooth outline-none cursor-pointer"
          >
            <option value="all">Todas as contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterType('all');
                setSelectedCategory('all');
                setSelectedAccount('all');
              }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Limpar filtros
            </button>
          )}
          {selectedList.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds({})}
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Limpar seleção
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmBulkDeleteOpen(true)}
            disabled={selectedDeletable.length === 0 || bulkDeleteMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-smooth disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir ({selectedDeletable.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2.5 w-[36px]">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !isAllSelected && isSomeSelected;
                  }}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setSelectedIds({});
                      return;
                    }
                    const next: Record<string, true> = {};
                    for (const id of allDeletableIds) next[id] = true;
                    setSelectedIds(next);
                  }}
                  className="h-3.5 w-3.5 accent-primary cursor-pointer"
                />
              </th>
              {(
                [
                  { label: 'Data', key: 'date' as const },
                  { label: 'Descrição', key: 'description' as const },
                  { label: 'Categoria', key: null },
                  { label: 'Conta', key: null },
                  { label: 'Valor', key: 'amount' as const },
                ] as const
              ).map(({ label, key }) => (
                <th
                  key={label}
                  onClick={key ? () => handleToggleSort(key) : undefined}
                  className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${label === 'Valor' ? 'text-right' : ''} ${key ? 'cursor-pointer select-none hover:text-foreground transition-smooth' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {key &&
                      (sortKey === key ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Carregando...</p>
                  </div>
                </td>
              </tr>
            ) : tableTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <p className="text-xs text-muted-foreground">Nenhuma transação neste mês.</p>
                  <button
                    onClick={handleCreate}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    + Adicionar transação
                  </button>
                </td>
              </tr>
            ) : (
              dayKeys.map((day) => {
                const dayTxs = groupedByDay[day] ?? [];
                const dayDate = new Date(day + 'T12:00:00Z');
                const dayLabel = dayDate.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  timeZone: 'UTC',
                });
                return (
                  <>
                    <tr key={`day-${day}`} className="bg-muted/30 border-b border-border">
                      <td colSpan={6} className="px-4 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {dayLabel}
                        </span>
                      </td>
                    </tr>
                    {dayTxs.map((t) => {
                      const isIncome = t.type === 'INCOME';
                      const value = Math.abs(Number(t.amount));
                      return (
                        <tr
                          key={t.id}
                          onClick={() => handleEdit(t)}
                          className="hover:bg-muted/20 transition-smooth group cursor-pointer"
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={!!selectedIds[t.id]}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = { ...prev };
                                  if (e.target.checked) next[t.id] = true;
                                  else delete next[t.id];
                                  return next;
                                });
                              }}
                              className="h-3.5 w-3.5 accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              timeZone: 'UTC',
                            })}
                          </td>
                          <td className="px-3 py-2.5" title={t.description}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium">
                                {truncate(t.description ?? '', 38)}
                              </span>
                              {t.isRecurring && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  recorrente
                                </span>
                              )}
                              {t.installmentNum != null && t.totalInstallments != null && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-violet-500/10 text-violet-500 border border-violet-500/20">
                                  {t.installmentNum}/{t.totalInstallments}
                                </span>
                              )}
                              {t.status === 'PENDING' && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  pendente
                                </span>
                              )}
                              {t.status === 'CANCELED' && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                                  cancelada
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {t.category ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10">
                                <Tag className="w-2.5 h-2.5" />
                                {t.category.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CreditCard className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[100px]">
                                {t.account?.name ?? '—'}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {t.card ? (
                                <span
                                  className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
                                  style={{
                                    backgroundColor: `${t.card.color ?? '#64748B'}15`,
                                    borderColor: `${t.card.color ?? '#64748B'}35`,
                                    color: t.card.color ?? '#64748B',
                                  }}
                                >
                                  {t.card.type === 'CREDIT' ? 'crédito' : 'débito'}
                                </span>
                              ) : (
                                <>
                                  <span
                                    className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
                                    style={{
                                      backgroundColor: '#64748B15',
                                      borderColor: '#64748B35',
                                      color: '#64748B',
                                    }}
                                  >
                                    {t.channel === 'PIX'
                                      ? 'pix'
                                      : t.channel === 'CARD_DEBIT'
                                        ? 'débito'
                                        : t.channel === 'CARD_CREDIT'
                                          ? 'crédito'
                                          : 'bancária'}
                                  </span>
                                  {t.classification === 'TRANSFER' && (
                                    <span
                                      className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
                                      style={{
                                        backgroundColor: '#F59E0B15',
                                        borderColor: '#F59E0B35',
                                        color: '#F59E0B',
                                      }}
                                    >
                                      fatura
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right font-bold text-sm ${isIncome ? 'text-emerald-500' : 'text-foreground'}`}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-smooth">
                                {t.status === 'PENDING' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markPaidMutation.mutate(t.id);
                                    }}
                                    disabled={markPaidMutation.isPending}
                                    title="Marcar como pago"
                                    className="p-1 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-smooth disabled:opacity-40"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(t);
                                  }}
                                  className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-smooth"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(t);
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-smooth disabled:opacity-40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center">
                                {isIncome ? (
                                  <ArrowUpRight className="inline w-3 h-3 mr-0.5" />
                                ) : (
                                  <ArrowDownLeft className="inline w-3 h-3 mr-0.5" />
                                )}
                                <PrivacyAmount value={value} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TransactionModal
        key={editingTransaction?.id ?? 'new'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        mode={modalMode}
        initialData={
          editingTransaction
            ? { ...editingTransaction, cardId: editingTransaction.cardId ?? undefined }
            : null
        }
      />
    </div>
  );
}
