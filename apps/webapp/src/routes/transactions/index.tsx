import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SectionShell from '../../components/SectionShell';
import { TransactionModal, type TransactionCreateMode } from '../../components/TransactionModal';
import PrivacyAmount from '../../components/PrivacyAmount';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { api } from '../../lib/api';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Ban,
  SlidersHorizontal,
  X,
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
} from './-queries';

interface Vehicle {
  id: string;
  name: string;
}

export const Route = createFileRoute('/transactions/')({
  component: TransactionsPage,
});

const CLASSIFICATION_LABEL: Record<string, string> = {
  COMMON: 'Comum',
  FUEL: 'Abastecimento',
  MAINTENANCE: 'Manutenção',
};

const CHANNEL_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CARD_DEBIT: 'Débito',
  CARD_CREDIT: 'Crédito',
  BANK: 'Bancária',
  CASH: 'Dinheiro',
};

function channelTone(channel?: string) {
  if (channel === 'CARD_CREDIT') return 'semantic-credit';
  if (channel === 'PIX') return 'semantic-pix';
  return 'semantic-debit';
}

function TransactionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/transactions/' });

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthKey());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, true>>({});
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [cancelRecurringTarget, setCancelRecurringTarget] = useState<Tx | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<TransactionCreateMode>('expense');

  const { data: transactions = [], isLoading } = useTransactionsList({
    search,
    filterType,
    selectedCategory,
    selectedClassification,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<TxCategory[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/transactions/${id}`),
    onSuccess: invalidate,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/api/v1/transactions/${id}`)));
    },
    onSuccess: () => {
      invalidate();
      setSelectedIds({});
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/transactions/${id}`, { status: 'COMPLETED' }),
    onSuccess: invalidate,
  });

  const stopRecurringMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/transactions/${id}`, { isRecurring: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const openCreate = (mode: TransactionCreateMode) => {
    setCreateMode(mode);
    setIsCreateOpen(true);
  };

  const handleCreate = () => openCreate('expense');

  const handleEdit = (t: Tx) => {
    if (t.classification === 'FUEL') {
      void navigate({
        to: '/transactions/crud-fueling',
        search: { transactionId: t.id, vehicleId: t.vehicleId ?? undefined },
      });
    } else {
      void navigate({
        to: '/transactions/crud-transactions',
        search: { transactionId: t.id },
      });
    }
  };

  const handleDelete = (t: Tx) => {
    if (t.isRecurring) {
      setCancelRecurringTarget(t);
    } else {
      setConfirmDeleteId(t.id);
      setConfirmDeleteOpen(true);
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

  const summaryDebit = sumDebitExpenses(tableTransactions);
  const summaryCredit = sumCreditExpenses(tableTransactions);
  const summaryExpenses = sumExpenses(tableTransactions);
  const summaryIncome = sumIncome(tableTransactions);

  const sorted = [...tableTransactions].sort((a, b) => b.date.localeCompare(a.date));
  const dayKeys: string[] = [];
  const groupedByDay: Record<string, Tx[]> = {};
  for (const t of sorted) {
    const day = t.date.slice(0, 10);
    if (!groupedByDay[day]) {
      groupedByDay[day] = [];
      dayKeys.push(day);
    }
    groupedByDay[day]!.push(t);
  }

  const selectedDeletable = tableTransactions.filter((t) => selectedIds[t.id]);
  const allIds = tableTransactions.map((t) => t.id);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds[id]);
  const isSomeSelected = allIds.some((id) => selectedIds[id]);
  const selectedCount = Object.keys(selectedIds).length;

  const isAnyFilterActive =
    search !== '' ||
    filterType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedClassification !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setSelectedCategory('all');
    setSelectedClassification('all');
  };

  return (
    <SectionShell
      backgroundClassName="transactions-bg-starfield"
      decorations={[]}
      contentClassName="transactions-starfield"
    >
      <div className="flex w-full flex-col gap-4 sm:gap-6">
        <TransactionModal
          isOpen={isCreateOpen}
          mode={createMode}
          categories={categories}
          vehicles={vehicles}
          onClose={() => setIsCreateOpen(false)}
          onCreated={invalidate}
        />
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
            if (!ids.length) {
              setConfirmBulkDeleteOpen(false);
              return;
            }
            await bulkDeleteMutation.mutateAsync(ids);
            setConfirmBulkDeleteOpen(false);
          }}
        />

      {cancelRecurringTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 semantic-credit">
              <RefreshCw className="w-4 h-4" />
              <p className="font-bold text-sm">Transação recorrente</p>
            </div>
            <p className="text-sm text-muted-foreground">
              &quot;{cancelRecurringTarget.description}&quot; é recorrente. O que deseja fazer?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await deleteMutation.mutateAsync(cancelRecurringTarget.id);
                  setCancelRecurringTarget(null);
                }}
                disabled={deleteMutation.isPending || stopRecurringMutation.isPending}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth disabled:opacity-50"
              >
                Excluir só esta ocorrência
              </button>
              <button
                onClick={async () => {
                  await stopRecurringMutation.mutateAsync(cancelRecurringTarget.id);
                  setCancelRecurringTarget(null);
                }}
                disabled={deleteMutation.isPending || stopRecurringMutation.isPending}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl semantic-expense hover:bg-rose-500/10 transition-smooth disabled:opacity-50"
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

      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Transações</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreate}
            className="transactions-primary flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Transação
          </button>
        </div>
      </div>

      <div className="card-premium transactions-surface p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => setSelectedMonth(availableMonths[activeIndex + 1] ?? activeMonth)}
            className="p-2 rounded-lg hover:bg-muted transition-smooth disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={activeMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="transactions-input bg-transparent border-none text-sm font-bold outline-none cursor-pointer text-center"
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
            className="p-2 rounded-lg hover:bg-muted transition-smooth disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border pt-3">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Déb / Pix
            </p>
            <PrivacyAmount
              value={-summaryDebit}
              className="text-sm sm:text-base font-bold font-display semantic-debit-text block"
            />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Crédito
            </p>
            <PrivacyAmount
              value={-summaryCredit}
              className="text-sm sm:text-base font-bold font-display semantic-credit-text block"
            />
          </div>
          <div className="text-center sm:border-l sm:border-border sm:pl-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Gastos
            </p>
            <PrivacyAmount
              value={-summaryExpenses}
              className="text-sm sm:text-base font-bold font-display semantic-expense-text block"
            />
          </div>
          <div className="text-center sm:border-l sm:border-border sm:pl-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Receitas
            </p>
            <PrivacyAmount
              value={summaryIncome}
              className="text-sm sm:text-base font-bold font-display semantic-income-text block"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar transação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="transactions-input w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`p-2.5 rounded-xl border transition-smooth ${showFilters || isAnyFilterActive ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            title="Filtros"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="card-premium transactions-surface p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'INCOME' | 'EXPENSE')}
                className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">Todos os tipos</option>
                <option value="INCOME">Entradas</option>
                <option value="EXPENSE">Saídas</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.description ?? cat.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">Todas as classificações</option>
                <option value="COMMON">Comuns</option>
                <option value="FUEL">Abastecimentos</option>
                <option value="MAINTENANCE">Manutenções</option>
              </select>
            </div>
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-primary hover:underline"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="transactions-surface flex items-center justify-between px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-3">
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
                for (const id of allIds) next[id] = true;
                setSelectedIds(next);
              }}
              className="h-4 w-4 accent-primary cursor-pointer"
            />
            <span className="text-xs font-bold text-primary">
              {selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds({})}
              className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setConfirmBulkDeleteOpen(true)}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-smooth disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </div>
      )}

      <div className="card-premium transactions-surface overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Carregando...</p>
          </div>
        ) : tableTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-xs text-muted-foreground">Nenhuma transação neste mês.</p>
            <button
              onClick={handleCreate}
              className="text-xs font-bold text-primary hover:underline"
            >
              + Adicionar transação
            </button>
          </div>
        ) : (
          dayKeys.map((day) => {
            const dayTxs = groupedByDay[day] ?? [];
            const dayDate = new Date(day + 'T12:00:00Z');
            const dayLabel = dayDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'short',
              timeZone: 'UTC',
            });

            return (
              <div key={day}>
                <div className="transactions-divider flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground capitalize">
                     {dayLabel}
                  </span>
                </div>

                {dayTxs.map((t) => {
                  const isIncome = t.type === 'INCOME';
                  const value = Math.abs(Number(t.amount));
                  const channelLabel = CHANNEL_LABEL[t.channel ?? ''] ?? t.channel ?? '';
                  const classificationLabel = CLASSIFICATION_LABEL[t.classification ?? ''];

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleEdit(t)}
                      className="transactions-row flex items-center gap-3 px-4 py-3.5 min-h-[60px] border-b border-border last:border-b-0 hover:bg-muted/20 active:bg-muted/30 transition-smooth cursor-pointer group"
                    >
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
                        className="h-4 w-4 accent-primary cursor-pointer shrink-0"
                      />

                      <div
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                          isIncome ? 'semantic-income' : channelTone(t.channel)
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium truncate leading-tight">
                            {t.description ?? '—'}
                          </span>
                          {t.isRecurring && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold semantic-pix shrink-0">
                              <RefreshCw className="w-2.5 h-2.5" />
                              rec
                            </span>
                          )}
                          {t.installmentNum != null && t.totalInstallments != null && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold semantic-credit shrink-0">
                              {t.installmentNum}/{t.totalInstallments}
                            </span>
                          )}
                          {t.status === 'PENDING' && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold semantic-credit shrink-0">
                              pendente
                            </span>
                          )}
                          {classificationLabel && t.classification !== 'COMMON' && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold semantic-debit shrink-0">
                              {classificationLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {[t.account?.name, t.category?.name, channelLabel]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-smooth">
                          {t.status === 'PENDING' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markPaidMutation.mutate(t.id);
                              }}
                              disabled={markPaidMutation.isPending}
                              title="Marcar como pago"
                              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-smooth disabled:opacity-40"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(t);
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-smooth disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(t);
                            }}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-smooth"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div
                          className={`text-right ${isIncome ? 'semantic-income-text' : 'semantic-expense-text'}`}
                        >
                          <PrivacyAmount value={value} className="text-sm font-bold block" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      </div>
    </SectionShell>
  );
}
