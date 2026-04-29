import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface TxCategory {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
}

export interface TxAccount {
  id: string;
  name: string;
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
  accountId?: string;
  cardId?: string | null;
  vehicleId?: string;
  category?: TxCategory;
  account?: TxAccount;
  card?: TxCard | null;
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
  selectedAccount?: string;
  selectedStatus?: string;
  selectedClassification?: string;
  extra?: Record<string, string>;
}): string {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.filterType !== 'all') params.set('type', opts.filterType);
  if (opts.selectedCategory !== 'all') params.set('categoryId', opts.selectedCategory);
  if (opts.selectedAccount && opts.selectedAccount !== 'all') {
    params.set('accountId', opts.selectedAccount);
  }
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

export function useTransactionsList(opts: {
  search: string;
  filterType: 'all' | 'INCOME' | 'EXPENSE';
  selectedCategory: string;
  selectedAccount?: string;
  selectedStatus?: string;
  selectedClassification?: string;
}) {
  return useQuery({
    queryKey: [
      'transactions',
      opts.search,
      opts.filterType,
      opts.selectedCategory,
      opts.selectedAccount,
      opts.selectedStatus,
      opts.selectedClassification,
    ],
    queryFn: async () => {
      const data = await api.get<Tx[]>(`/api/v1/transactions?${buildTxParams({ ...opts })}`);
      return data;
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
      ),
    staleTime: 1000 * 30,
    enabled: opts.enabled,
  });
}
