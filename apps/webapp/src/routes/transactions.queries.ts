import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface TxCategory {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
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
  classification?: string;
  channel?: 'CARD_CREDIT' | 'CARD_DEBIT' | 'PIX' | 'BANK' | string;
  isRecurring?: boolean;
  isVirtual?: boolean;
  sourceTransactionId?: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string | null;
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
  extra?: Record<string, string>;
}): string {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.filterType !== 'all') params.set('type', opts.filterType);
  if (opts.selectedCategory !== 'all') params.set('categoryId', opts.selectedCategory);
  params.set('page', '1');
  params.set('limit', '5000');
  if (opts.extra) {
    Object.entries(opts.extra).forEach(([k, v]) => params.set(k, v));
  }
  return params.toString();
}

export function sumExpenses(list: Tx[]): number {
  return list
    .filter((t) => t.type === 'EXPENSE' && t.classification !== 'TRANSFER')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function sumDebitExpenses(list: Tx[]): number {
  return list
    .filter(
      (t) => t.type === 'EXPENSE' && t.classification !== 'TRANSFER' && t.channel !== 'CARD_CREDIT',
    )
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function sumCreditExpenses(list: Tx[]): number {
  return list
    .filter(
      (t) => t.type === 'EXPENSE' && t.classification !== 'TRANSFER' && t.channel === 'CARD_CREDIT',
    )
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function sumIncome(list: Tx[]): number {
  return list
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function sumBillPayments(list: Tx[]): number {
  return list
    .filter((t) => t.type === 'EXPENSE' && t.classification === 'TRANSFER')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKey(dateLike: string | Date): string {
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function formatMonthLabelPtBr(key: string): string {
  const [y, m] = key.split('-').map((v) => Number(v));
  const d = new Date(y, (m ?? 1) - 1, 1);
  const label = d.toLocaleString('pt-BR', { month: 'long' });
  return `${label} ${y}`;
}

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
}) {
  return useQuery({
    queryKey: ['transactions', opts.search, opts.filterType, opts.selectedCategory],
    queryFn: () => api.get<Tx[]>(`/transactions?${buildTxParams({ ...opts })}`),
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
        `/transactions?${buildTxParams({
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
  // horizonte no backend é tratado, mas mandamos um "to" simples
  const to = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate()).toISOString();

  return useQuery({
    queryKey: ['transactions-future', opts.search, opts.filterType, opts.selectedCategory],
    queryFn: () =>
      api.get<Tx[]>(
        `/transactions/future?${buildTxParams({
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
