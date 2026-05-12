import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { readSyncQueue } from '../../lib/offline-sync';

export interface TxCategory {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
}

export interface TxCard {
  id: string;
  name: string;
  type: 'CREDIT' | 'DEBIT';
  color?: string | null;
}

export interface Tx {
  id: string;
  description: string;
  amount: number | string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  status?: 'PENDING' | 'COMPLETED' | 'CANCELED';
  classification?: string;
  channel?: 'CARD_CREDIT' | 'CARD_DEBIT' | 'PIX' | 'BANK' | string;
  isRecurring?: boolean;
  isVirtual?: boolean;
  sourceTransactionId?: string;
  installmentNum?: number;
  totalInstallments?: number;
  categoryId?: string;
  cardId?: string | null;
  vehicleId?: string;
  category?: TxCategory;
  card?: TxCard | null;
  syncStatus?: 'pending' | 'synced' | 'error';
  syncError?: string;
}

export function startOfMonthLocal(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfPreviousMonthLocal(): Date {
  const d = startOfMonthLocal();
  d.setMonth(d.getMonth() - 1);
  return d;
}

export function startOfDayLocal(input = new Date()): Date {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildTxParams(opts: {
  search: string;
  filterType: 'all' | 'INCOME' | 'EXPENSE';
  selectedCategory: string;
  selectedStatus?: string;
  selectedClassification?: string;
  extra?: Record<string, string>;
}): string {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.filterType !== 'all') params.set('type', opts.filterType);
  if (opts.selectedCategory !== 'all') params.set('categoryId', opts.selectedCategory);
  if (opts.selectedStatus && opts.selectedStatus !== 'all') {
    params.set('status', opts.selectedStatus);
  }
  if (opts.selectedClassification && opts.selectedClassification !== 'all') {
    params.set('classification', opts.selectedClassification);
  }
  params.set('page', '1');
  params.set('limit', '5000');
  if (opts.extra) {
    Object.entries(opts.extra).forEach(([k, v]) => params.set(k, v));
  }
  return params.toString();
}

export function sumExpenses(list: Tx[]): number {
  return list
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function sumDebitExpenses(list: Tx[]): number {
  return list
    .filter((t) => t.type === 'EXPENSE' && t.channel !== 'CARD_CREDIT')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function sumCreditExpenses(list: Tx[]): number {
  return list
    .filter((t) => t.type === 'EXPENSE' && t.channel === 'CARD_CREDIT')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function sumIncome(list: Tx[]): number {
  return list
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export { currentMonthKey, monthKey, formatMonthLabelPtBr } from '../../lib/formatters';

export function splitByToday(list: Tx[]): { current: Tx[]; future: Tx[]; today: Date } {
  const today = startOfDayLocal();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    today,
    current: list.filter((t) => t.date.slice(0, 10) <= todayStr),
    future: list.filter((t) => t.date.slice(0, 10) > todayStr),
  };
}

function queueItemToTransaction(item: ReturnType<typeof readSyncQueue>[number]): Tx {
  const payload = item.payload;
  return {
    id: item.entityId,
    description: String(payload?.description ?? 'Lançamento'),
    amount: Number(payload?.amount ?? 0),
    date: String(payload?.date ?? new Date().toISOString()),
    type: payload?.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    classification: typeof payload?.classification === 'string' ? payload?.classification : 'COMMON',
    channel: typeof payload?.channel === 'string' ? payload?.channel : 'BANK',
    isRecurring: Boolean(payload?.isRecurring),
    categoryId: typeof payload?.categoryId === 'string' ? payload?.categoryId : undefined,
    vehicleId: typeof payload?.vehicleId === 'string' ? payload?.vehicleId : undefined,
    syncStatus: 'pending',
  };
}

function matchesQueuedTransaction(
  tx: Tx,
  opts: {
    search: string;
    filterType: 'all' | 'INCOME' | 'EXPENSE';
    selectedCategory: string;
    selectedStatus?: string;
    selectedClassification?: string;
    from?: string;
    to?: string;
  },
) {
  if (opts.filterType !== 'all' && tx.type !== opts.filterType) return false;
  if (opts.selectedCategory !== 'all' && tx.categoryId !== opts.selectedCategory) return false;
  if (opts.selectedStatus && opts.selectedStatus !== 'all' && tx.status !== opts.selectedStatus) {
    return false;
  }
  if (
    opts.selectedClassification &&
    opts.selectedClassification !== 'all' &&
    tx.classification !== opts.selectedClassification
  ) {
    return false;
  }
  if (opts.from && tx.date < opts.from) return false;
  if (opts.to && tx.date > opts.to) return false;

  if (opts.search) {
    const search = opts.search.toLowerCase();
    const description = tx.description.toLowerCase();
    const categoryName = tx.category?.name?.toLowerCase() ?? '';
    const categoryDescription = tx.category?.description?.toLowerCase() ?? '';
    if (
      !description.includes(search) &&
      !categoryName.includes(search) &&
      !categoryDescription.includes(search)
    ) {
      return false;
    }
  }

  return true;
}

export function mergeQueuedTransactions(
  list: Tx[],
  opts: {
    search: string;
    filterType: 'all' | 'INCOME' | 'EXPENSE';
    selectedCategory: string;
    selectedStatus?: string;
    selectedClassification?: string;
    from?: string;
    to?: string;
  },
) {
  const queueTransactions = readSyncQueue()
    .filter((item) => item.kind === 'transaction.create')
    .map(queueItemToTransaction)
    .filter((tx) => matchesQueuedTransaction(tx, opts));

  const byId = new Map<string, Tx>();
  [...queueTransactions, ...list].forEach((tx) => {
    byId.set(tx.id, tx);
  });

  return Array.from(byId.values());
}

export function useTransactionsList(opts: {
  search: string;
  filterType: 'all' | 'INCOME' | 'EXPENSE';
  selectedCategory: string;
  selectedStatus?: string;
  selectedClassification?: string;
}) {
  return useQuery({
    queryKey: [
      'transactions',
      opts.search,
      opts.filterType,
      opts.selectedCategory,
      opts.selectedStatus,
      opts.selectedClassification,
    ],
    queryFn: async () => {
      const data = await api.get<Tx[]>(`/api/v1/transactions?${buildTxParams({ ...opts })}`);
      return mergeQueuedTransactions(data, opts);
    },
    staleTime: 1000 * 30,
  });
}

export function useMonthExpenses() {
  const from = startOfMonthLocal().toISOString();
  const to = new Date().toISOString();
  return useQuery({
    queryKey: ['transactions-month-expenses', from],
    queryFn: () =>
      api.get<Tx[]>(
        `/api/v1/transactions?${buildTxParams({
          search: '',
          filterType: 'EXPENSE',
          selectedCategory: 'all',
          extra: { from, to },
        })}`,
      ).then((data) =>
        mergeQueuedTransactions(
          data,
          {
            search: '',
            filterType: 'EXPENSE',
            selectedCategory: 'all',
            from,
            to,
          },
        ),
      ),
    staleTime: 1000 * 30,
  });
}

export function useFutureTransactions(opts: {
  enabled: boolean;
  search: string;
  filterType: 'all' | 'INCOME' | 'EXPENSE';
  selectedCategory: string;
}) {
  const today = startOfDayLocal();
  const from = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate()).toISOString();

  return useQuery({
    queryKey: ['transactions-future', opts.search, opts.filterType, opts.selectedCategory],
    queryFn: () =>
      api.get<Tx[]>(
        `/api/v1/transactions/future?${buildTxParams({
          search: opts.search,
          filterType: opts.filterType,
          selectedCategory: opts.selectedCategory,
          extra: { from, to },
        })}`,
      ).then((data) =>
        mergeQueuedTransactions(data, {
          search: opts.search,
          filterType: opts.filterType,
          selectedCategory: opts.selectedCategory,
          from,
          to,
        }),
      ),
    staleTime: 1000 * 30,
    enabled: opts.enabled,
  });
}
