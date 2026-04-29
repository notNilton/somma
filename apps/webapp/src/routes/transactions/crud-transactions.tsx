import React, { useEffect, useState, useId } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Save,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, cleanNumeric, formatKm } from '../../lib/formatters';
import CustomSelect from '../../components/ui/CustomSelect';

export const Route = createFileRoute('/transactions/crud-transactions')({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search.transactionId === 'string' ? search.transactionId : undefined,
    vehicleId: typeof search.vehicleId === 'string' ? search.vehicleId : undefined,
    mode:
      search.mode === 'expense' ||
      search.mode === 'income' ||
      search.mode === 'fuel'
        ? search.mode
        : undefined,
  }),
  component: CrudTransactionsPage,
});

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number | string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  classification?: string;
  channel?: string;
  isRecurring?: boolean;
  categoryId?: string;
  accountId?: string;
  vehicleId?: string;
  currentKm?: number;
}

type TransactionModalTab = 'expense' | 'income';
type ExpenseKind = 'CREDIT' | 'DEBIT' | 'PIX' | 'BANK' | 'CASH';
type Classification = 'COMMON' | 'MAINTENANCE';

function expenseKindToChannel(kind: ExpenseKind) {
  if (kind === 'CREDIT') return 'CARD_CREDIT';
  if (kind === 'DEBIT') return 'CARD_DEBIT';
  if (kind === 'PIX') return 'PIX';
  return 'BANK';
}

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

function CrudTransactionsPage() {
  const { transactionId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!transactionId;

  const amountId = useId();
  const dateId = useId();
  const categoryId_uid = useId();
  const descriptionId = useId();
  const vehicleId_uid = useId();
  const kmId = useId();

  const { data: initialData, isLoading: isLoadingTx } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => api.get<Transaction>(`/api/v1/transactions/${transactionId}`),
    enabled: !!transactionId,
    staleTime: 0,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  const [activeTab, setActiveTab] = useState<TransactionModalTab>('expense');
  const [expenseKind, setExpenseKind] = useState<ExpenseKind>('DEBIT');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [classification, setClassification] = useState<Classification>('COMMON');
  const [vehicleId, setVehicleId] = useState('');
  const [currentKm, setCurrentKm] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    if (initialData.type === 'INCOME') setActiveTab('income');
    else setActiveTab('expense');

    const ch = initialData.channel;
    if (ch === 'CARD_CREDIT') setExpenseKind('CREDIT');
    else if (ch === 'CARD_DEBIT') setExpenseKind('DEBIT');
    else if (ch === 'PIX') setExpenseKind('PIX');
    else setExpenseKind('BANK');

    setDate(new Date(initialData.date).toISOString().split('T')[0]);
    setDescription(initialData.description ?? '');
    setAmount(Math.floor(Math.abs(Number(initialData.amount)) * 100).toString());
    setCategoryId(initialData.categoryId ?? '');
    setIsRecurring(initialData.isRecurring ?? false);
    setClassification((initialData.classification as Classification | undefined) ?? 'COMMON');
    setVehicleId(initialData.vehicleId ?? '');
    setCurrentKm(initialData.currentKm ? Math.floor(Number(initialData.currentKm)).toString() : '0');
  }, [initialData]);

  useEffect(() => {
    setClassification('COMMON');
  }, [activeTab]);

  const isExpense = activeTab === 'expense';
  const filteredCategories = allCategories.filter(
    (c) => c.type === (isExpense ? 'EXPENSE' : 'INCOME'),
  );

  const goBack = () => void navigate({ to: '/transactions' });

  const isSubmitDisabled = Number(amount) <= 0 || !date;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const actualAmount = Number(amount) / 100;
      const channel = expenseKindToChannel(expenseKind);

      const payload = {
        description:
          classification === 'MAINTENANCE'
            ? (description.trim() || 'Manutenção veicular')
            : description,
        amount: actualAmount,
        date,
        type: activeTab === 'income' ? 'INCOME' : 'EXPENSE',
        isRecurring,
        categoryId: categoryId || undefined,
        channel,
        classification,
        ...(classification === 'MAINTENANCE' && {
          vehicleId,
          currentKm: Number(currentKm),
          maintenanceType: 'OTHER',
        }),
      };

      if (isEditing && transactionId) {
        await api.patch(`/api/v1/transactions/${transactionId}`, payload);
      } else {
        await api.post('/api/v1/transactions', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar transação.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && isLoadingTx) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-bold tracking-tight">Carregando detalhes...</p>
      </div>
    );
  }

  const tabColor =
    isExpense
      ? 'semantic-expense-solid'
      : 'semantic-income-solid';

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="p-2.5 rounded-lg hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold">
                {isEditing ? 'Editar Registro' : 'Novo Registro'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || isSubmitDisabled}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-smooth ${tabColor}`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <div
          className={`card-premium p-1 grid grid-cols-2 gap-1 relative ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {[
            { key: 'expense' as const, label: 'Despesa', Icon: ArrowDownLeft, color: 'semantic-expense-solid' },
            { key: 'income' as const, label: 'Receita', Icon: ArrowUpRight, color: 'semantic-income-solid' },
          ].map(({ key, label, Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => !isEditing && setActiveTab(key)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold uppercase transition-smooth ${activeTab === key ? `${color} text-white shadow-lg` : 'text-muted-foreground hover:bg-muted/60'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-premium p-6 flex flex-col gap-5">
            <div>
              <label className={labelCls} htmlFor={amountId}>Valor do Lançamento</label>
              <input
                id={amountId}
                required
                type="text"
                inputMode="numeric"
                value={formatCurrency(amount)}
                onChange={(e) => setAmount(cleanNumeric(e.target.value))}
                className={`${inputCls} text-lg font-black font-display ${activeTab === 'income' ? 'semantic-income-text' : 'semantic-expense-text'}`}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor={dateId}>Data</label>
              <input
                id={dateId}
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="card-premium p-6 flex flex-col gap-5">
            <div>
              <label className={labelCls} htmlFor={categoryId_uid}>Categoria</label>
              <CustomSelect
                id={categoryId_uid}
                value={categoryId}
                onChange={setCategoryId}
                options={filteredCategories.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
              />
            </div>
          </div>
        </div>

        <div className="card-premium p-6 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor={descriptionId}>Observações / Descrição</label>
            <textarea
              id={descriptionId}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
              placeholder="Ex: Almoço restaurante, Venda de produto, etc..."
            />
          </div>
        </div>

        {classification === 'MAINTENANCE' && (
          <div className="card-premium p-6 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
            <div className="col-span-1">
              <label className={labelCls} htmlFor={vehicleId_uid}>Veículo</label>
              <CustomSelect
                id={vehicleId_uid}
                value={vehicleId}
                onChange={setVehicleId}
                options={vehicles.map((v) => ({ value: v.id, label: v.name }))}
              />
            </div>
            <div className="col-span-1">
              <label className={labelCls} htmlFor={kmId}>Hodômetro Atual (km)</label>
              <input
                id={kmId}
                type="text"
                inputMode="numeric"
                value={formatKm(currentKm)}
                onChange={(e) => setCurrentKm(cleanNumeric(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
