import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PrivacyAmount from '../../components/PrivacyAmount';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ImportModal } from '../../components/ImportModal';
import { api } from '../../lib/api';
import Fab from '../../components/Fab';
import {
  Plus,
  FileUp,
  FileDown,
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
  Fuel,
} from 'lucide-react';
import {
  type Tx,
  type TxCategory,
  formatMonthLabelPtBr,
  currentMonthKey,
  sumExpenses,
  sumDebitExpenses,
  sumCreditExpenses,
  sumBillPayments,
  sumIncome,
  useTransactionsList,
} from '../-transactions.queries';

export const Route = createFileRoute('/transactions/')({
  component: TransactionsPage,
});

const CLASSIFICATION_LABEL: Record<string, string> = {
  COMMON: 'Comum',
  FUEL: 'Abastecimento',
  MAINTENANCE: 'ManutenÃ§Ã£o',
  TRANSFER: 'Fatura paga',
};

const CHANNEL_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CARD_DEBIT: 'Débito',
  CARD_CREDIT: 'Crédito',
  BANK: 'Bancária',
  CASH: 'Dinheiro',
};

function TransactionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/transactions/' });

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthKey());
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, true>>({});
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [cancelRecurringTarget, setCancelRecurringTarget] = useState<Tx | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: transactions = [], isLoading } = useTransactionsList({
    search,
    filterType,
    selectedCategory,
    selectedAccount,
    selectedClassification,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<TxCategory[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/api/v1/accounts'),
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

  const handleCreate = () =>
    void navigate({
      to: '/transactions/crud-transactions',
      search: { transactionId: undefined },
    });

  const handleFuelCreate = () =>
    void navigate({
      to: '/transactions/crud-fueling',
      search: { transactionId: undefined, vehicleId: undefined },
    });

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
  const summaryBillPayments = sumBillPayments(tableTransactions);
  const summaryIncome = sumIncome(tableTransactions);

  // Sort desc by date
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
    selectedAccount !== 'all' ||
    selectedClassification !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedClassification('all');
  };

  const handleExport = async (mode: 'download' | 'share' = 'download') => {
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await api.exportTransactions({
        from: exportFrom,
        to: exportTo,
        search: search || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        accountId: selectedAccount !== 'all' ? selectedAccount : undefined,
        classification:
          selectedClassification !== 'all' ? selectedClassification : undefined,
      });
      const filename = `transacoes_${exportFrom}_${exportTo}.csv`;
      const shareCapable =
        mode === 'share' &&
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        'canShare' in navigator;

      if (shareCapable) {
        const file = new File([blob], filename, { type: 'text/csv;charset=utf-8' });
        const canShareFile = navigator.canShare?.({ files: [file] });
        if (canShareFile) {
          await navigator.share({
            title: 'Exportação de transações',
            text: `CSV gerado para o período de ${exportFrom} até ${exportTo}.`,
            files: [file],
          });
        } else {
          throw new Error('Compartilhamento de arquivos não suportado neste navegador.');
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      setIsExportOpen(false);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao exportar.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Dialogs */}
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
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-smooth disabled:opacity-50"
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
        onImported={() => invalidate()}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Transações</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-smooth"
            title="Importar extrato"
          >
            <FileUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-smooth"
            title="Exportar CSV"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={handleFuelCreate}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-smooth"
          >
            <Fuel className="w-3.5 h-3.5" />
            Abastecimento
          </button>
          <button
            onClick={handleCreate}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Export Modal */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold font-display">Exportar CSV</p>
              <button onClick={() => setIsExportOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {exportError && (
              <p className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {exportError}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">De</label>
                <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Até</label>
                <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setIsExportOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all">
                Cancelar
              </button>
              <button onClick={() => void handleExport()}
                disabled={isExporting}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Exportar
              </button>
            </div>
            {'share' in navigator && (
              <button
                onClick={() => void handleExport('share')}
                disabled={isExporting}
                className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-all"
              >
                Compartilhar CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resumo + seletor de mês */}
      <div className="card-premium p-3 sm:p-4 flex flex-col gap-3">
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
            className="bg-transparent border-none text-sm font-bold outline-none cursor-pointer text-center"
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

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-border pt-3">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Déb / Pix
            </p>
            <PrivacyAmount
              value={-summaryDebit}
              className="text-sm sm:text-base font-bold font-display text-rose-500 block"
            />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Crédito
            </p>
            <PrivacyAmount
              value={-summaryCredit}
              className="text-sm sm:text-base font-bold font-display text-purple-500 block"
            />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Fatura paga
            </p>
            <PrivacyAmount
              value={-summaryBillPayments}
              className="text-sm sm:text-base font-bold font-display text-amber-500 block"
            />
          </div>
          <div className="text-center sm:border-l sm:border-border sm:pl-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Gastos
            </p>
            <PrivacyAmount
              value={-summaryExpenses}
              className="text-sm sm:text-base font-bold font-display text-rose-500 block"
            />
          </div>
          <div className="text-center sm:border-l sm:border-border sm:pl-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Receitas
            </p>
            <PrivacyAmount
              value={summaryIncome}
              className="text-sm sm:text-base font-bold font-display text-emerald-500 block"
            />
          </div>
        </div>
      </div>

      {/* Barra de busca + filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar transação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
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

        {/* Painel de filtros expandível */}
        {showFilters && (
          <div className="card-premium p-3 flex flex-col gap-2">
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
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium outline-none cursor-pointer"
              >
                <option value="all">Todas as contas</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
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
                <option value="TRANSFER">Faturas pagas</option>
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

      {/* Barra de seleção em massa */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
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

      {/* Lista de transações */}
      <div className="card-premium overflow-hidden">
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
                {/* Separador de dia */}
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground capitalize">
                     {dayLabel}
                  </span>
                </div>

                {/* Transações do dia */}
                {dayTxs.map((t) => {
                  const isIncome = t.type === 'INCOME';
                  const value = Math.abs(Number(t.amount));
                  const channelLabel = CHANNEL_LABEL[t.channel ?? ''] ?? t.channel ?? '';
                  const classificationLabel = CLASSIFICATION_LABEL[t.classification ?? ''];

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleEdit(t)}
                      className="flex items-center gap-3 px-4 py-3.5 min-h-[60px] border-b border-border last:border-b-0 hover:bg-muted/20 active:bg-muted/30 transition-smooth cursor-pointer group"
                    >
                      {/* Checkbox */}
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

                      {/* Ícone de tipo */}
                      <div
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>

                      {/* Descrição + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium truncate leading-tight">
                            {t.description ?? '—'}
                          </span>
                          {t.isRecurring && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                              <RefreshCw className="w-2.5 h-2.5" />
                              rec
                            </span>
                          )}
                          {t.installmentNum != null && t.totalInstallments != null && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/10 text-violet-500 border border-violet-500/20 shrink-0">
                              {t.installmentNum}/{t.totalInstallments}
                            </span>
                          )}
                          {t.status === 'PENDING' && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                              pendente
                            </span>
                          )}
                          {classificationLabel && t.classification !== 'COMMON' && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
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

                      {/* Valor + ações */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Ações */}
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
                          className={`text-right ${isIncome ? 'text-emerald-500' : 'text-foreground'}`}
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

      {/* FAB mobile */}
      <Fab label="Nova transação" onClick={handleCreate} />
    </div>
  );
}
