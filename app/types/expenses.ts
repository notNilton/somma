export type TxType = 'INCOME' | 'EXPENSE';
export type TxKind = 'INCOME' | 'EXPENSE' | 'CREDIT';
export type TxStatus = 'COMPLETED' | 'PENDING' | 'CANCELED';

export interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
  children?: Category[];
}

export interface Transaction {
  id: string;
  type: TxType;
  kind: TxKind;
  status: TxStatus;
  amount: number;
  amountCents?: number;
  description: string;
  date: string;
  notes?: string;
  categoryId?: string;
  category?: { name?: string; color?: string };
}

export interface CreateTransactionPayload {
  type: TxType;
  kind?: TxKind;
  amount: number;
  description: string;
  date: string;
  status?: TxStatus;
  categoryId?: string;
  notes?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  limitCents: number;
  spentCents: number;
  percentage: number;
  month: string;
}

export interface DashboardSummary {
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}
