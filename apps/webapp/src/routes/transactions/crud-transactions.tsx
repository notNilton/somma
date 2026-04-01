import React, { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  Lock,
  Receipt,
  Save,
} from 'lucide-react';
import { api } from '../../lib/api';

export const Route = createFileRoute('/transactions/crud-transactions')({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search.transactionId === 'string' ? search.transactionId : undefined,
  }),
  component: CrudTransactionsPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Account {
  id: string;
  name: string;
  creditLimit?: number | string | null;
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

type TransactionModalTab = 'expense' | 'income' | 'bill_payment';
type ExpenseKind = 'CREDIT' | 'DEBIT' | 'PIX' | 'BANK' | 'CASH';
type BaseClassification = 'COMMON' | 'MAINTENANCE';
type Classification = BaseClassification | 'TRANSFER';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function expenseKindToChannel(kind: ExpenseKind) {
  if (kind === 'CREDIT') return 'CARD_CREDIT';
  if (kind === 'DEBIT') return 'CARD_DEBIT';
  if (kind === 'PIX') return 'PIX';
  return 'BANK';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
  icon?: React.ReactNode;
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate flex-1 font-medium">
          {selected?.icon && <div className="shrink-0">{selected.icon}</div>}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl shadow-primary/10 max-h-60 overflow-y-auto p-1 ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-smooth group"
            >
              <div className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-smooth">
                {placeholder}
              </div>
            </button>
            {options.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-smooth group ${value === opt.value ? 'bg-primary/5' : ''}`}
              >
                {opt.color && (
                  <div
                    className="w-2.5 h-2.5 shrink-0 rounded-full mt-1 shadow-sm border border-black/10"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.icon && <div className="mt-0.5 shrink-0">{opt.icon}</div>}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-bold transition-smooth truncate ${value === opt.value ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}
                  >
                    {opt.label}
                  </div>
                  {opt.description && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                      {opt.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CrudTransactionsPage() {
  const { transactionId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!transactionId;

  // Fetch transaction when editing
  const { data: initialData, isLoading: isLoadingTx } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => api.get<Transaction>(`/api/v1/transactions/${transactionId}`),
    enabled: !!transactionId,
    staleTime: 0,
  });

  // Fetch supporting data
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/api/v1/accounts'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  // ─── Form state ────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<TransactionModalTab>('expense');
  const [expenseKind, setExpenseKind] = useState<ExpenseKind>('DEBIT');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [classification, setClassification] = useState<Classification>('COMMON');
  const [vehicleId, setVehicleId] = useState('');
  const [currentKm, setCurrentKm] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalInstallments] = useState(1);
  const [hasPaidInstallments] = useState(false);
  const [paidInstallments] = useState(1);

  // ─── Populate from fetched data ────────────────────────────────────────────

  useEffect(() => {
    if (!initialData) return;
    if (initialData.classification === 'TRANSFER') setActiveTab('bill_payment');
    else if (initialData.type === 'INCOME') setActiveTab('income');
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
    setAccountId(initialData.accountId ?? '');
    setIsRecurring(initialData.isRecurring ?? false);
    setClassification((initialData.classification as Classification | undefined) ?? 'COMMON');
    setVehicleId(initialData.vehicleId ?? '');
    setCurrentKm(initialData.currentKm ? Math.floor(Number(initialData.currentKm)).toString() : '0');
  }, [initialData]);

  // ─── Tab change side-effects ───────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'bill_payment') {
      setIsRecurring(false);
      setCategoryId('');
      setClassification('TRANSFER');
      setDescription((prev) => (prev.trim().length ? prev : 'Pagamento de fatura'));
      return;
    }
    setIsRecurring(false);
    setClassification((prev) => (prev === 'TRANSFER' ? 'COMMON' : prev));
  }, [activeTab]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const isExpense = activeTab === 'expense';
  const isMaintenance = classification === 'MAINTENANCE';

  const filteredCategories = allCategories.filter(
    (c) => c.type === (isExpense ? 'EXPENSE' : 'INCOME'),
  );

  const fmt = (cents: string) =>
    (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtVal = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtKm = Number(currentKm).toLocaleString('pt-BR');

  // ─── Navigation & submit ───────────────────────────────────────────────────

  const goBack = () => void navigate({ to: '/transactions' });

  const isSubmitDisabled = Number(amount) <= 0 || !date || !accountId;

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
              ? 'Manutenção veicular'
              : description,
        amount: actualAmount,
        date,
        type: activeTab === 'income' ? 'INCOME' : 'EXPENSE',
        isRecurring: totalInstallments > 1 ? false : isRecurring,
        categoryId: categoryId || undefined,
        accountId,
        channel: activeTab === 'bill_payment' ? 'BANK' : channel,
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

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isEditing && isLoadingTx) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const tabColor =
    activeTab === 'bill_payment'
      ? 'bg-amber-500 shadow-amber-500/20'
      : isExpense
        ? 'bg-rose-500 shadow-rose-500/20'
        : 'bg-emerald-500 shadow-emerald-500/20';

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="p-2.5 rounded-lg hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold">
                {isEditing ? 'Editar Transação' : 'Nova Transação'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || isSubmitDisabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition-smooth ${tabColor}`}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
            {error}
          </div>
        )}

        {/* Tab selector */}
        <div
          className={`card-premium p-1 grid grid-cols-3 gap-1 relative ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {[
            { key: 'expense' as const, label: 'Despesa', Icon: ArrowDownLeft, color: 'bg-rose-500' },
            { key: 'income' as const, label: 'Receita', Icon: ArrowUpRight, color: 'bg-emerald-500' },
            { key: 'bill_payment' as const, label: 'Fatura', Icon: Receipt, color: 'bg-amber-500' },
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

        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-premium p-5 flex flex-col gap-4">
             <div>
                <label className={labelCls}>Valor</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={fmt(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-bold ${activeTab === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}
                />
              </div>
              <div>
                <label className={labelCls}>Data</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </div>
          </div>

          <div className="card-premium p-5 flex flex-col gap-4">
             <div>
                <label className={labelCls}>Conta</label>
                <CustomSelect
                  value={accountId}
                  onChange={setAccountId}
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
              {activeTab !== 'bill_payment' && (
                <div>
                  <label className={labelCls}>Categoria</label>
                  <CustomSelect
                    value={categoryId}
                    onChange={setCategoryId}
                    options={filteredCategories.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
                  />
                </div>
              )}
          </div>
        </div>

        {/* Description field */}
        <div className="card-premium p-5 flex flex-col gap-4">
           <div>
              <label className={labelCls}>Observações / Descrição</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
                placeholder="Detalhes da transação..."
              />
           </div>
        </div>

        {/* Maintenance fields if classification is MAINTENANCE */}
        {classification === 'MAINTENANCE' && (
          <div className="card-premium p-5 grid grid-cols-2 gap-4">
             <div className="col-span-1">
                <label className={labelCls}>Veículo</label>
                <CustomSelect
                  value={vehicleId}
                  onChange={setVehicleId}
                  options={vehicles.map(v => ({ value: v.id, label: v.name }))}
                />
             </div>
             <div className="col-span-1">
                <label className={labelCls}>Hodômetro (km)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtKm}
                  onChange={(e) => setCurrentKm(e.target.value.replace(/\D/g, ''))}
                  className={inputCls}
                />
             </div>
          </div>
        )}

      </div>
    </form>
  );
}
