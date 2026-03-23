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
import { getBrandIcon } from '../../lib/vehicle-brands';
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
  liters?: number;
  fuelType?: string;
  refuelingLog?: { vehicleId: string; odometer: number; fuelLiters: number; fuelType: string };
}

type TransactionModalTab = 'expense' | 'income' | 'bill_payment';
type ExpenseKind = 'CREDIT' | 'DEBIT' | 'PIX' | 'BANK' | 'CASH';
type BaseClassification = 'COMMON' | 'FUEL' | 'MAINTENANCE';
type Classification = BaseClassification | 'TRANSFER';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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
    queryFn: () => api.get<Transaction>(`/transactions/${transactionId}`),
    enabled: !!transactionId,
    staleTime: 0,
  });

  // Fetch supporting data
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  // ─── Form state ────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<TransactionModalTab>(() => {
    if (initialData?.classification === 'TRANSFER') return 'bill_payment';
    if (initialData?.type === 'INCOME') return 'income';
    return 'expense';
  });

  const [expenseKind, setExpenseKind] = useState<ExpenseKind>(() => {
    const ch = initialData?.channel;
    if (ch === 'CARD_CREDIT') return 'CREDIT';
    if (ch === 'CARD_DEBIT') return 'DEBIT';
    if (ch === 'PIX') return 'PIX';
    return 'BANK';
  });

  const [date, setDate] = useState(() => {
    if (initialData?.date) return new Date(initialData.date).toISOString().split('T')[0];
    const t = new Date();
    return [
      t.getFullYear(),
      String(t.getMonth() + 1).padStart(2, '0'),
      String(t.getDate()).padStart(2, '0'),
    ].join('-');
  });

  const [description, setDescription] = useState(initialData?.description ?? '');
  const [amount, setAmount] = useState(
    initialData ? Math.floor(Math.abs(Number(initialData.amount)) * 100).toString() : '0',
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '');
  const [accountId, setAccountId] = useState(initialData?.accountId ?? '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring ?? false);
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [hasPaidInstallments, setHasPaidInstallments] = useState(false);
  const [paidInstallments, setPaidInstallments] = useState(1);
  const [classification, setClassification] = useState<Classification>(
    (initialData?.classification as Classification | undefined) ?? 'COMMON',
  );
  const [vehicleId, setVehicleId] = useState(
    initialData?.refuelingLog?.vehicleId ?? initialData?.vehicleId ?? '',
  );
  const [currentKm, setCurrentKm] = useState(
    initialData?.refuelingLog?.odometer
      ? Math.floor(Number(initialData.refuelingLog.odometer)).toString()
      : initialData?.currentKm
        ? Math.floor(Number(initialData.currentKm)).toString()
        : '0',
  );
  const [liters, setLiters] = useState(
    initialData?.refuelingLog?.fuelLiters
      ? Math.floor(Number(initialData.refuelingLog.fuelLiters) * 1000).toString()
      : initialData?.liters
        ? Math.floor(Number(initialData.liters) * 1000).toString()
        : '0',
  );
  const [fuelType, setFuelType] = useState(
    initialData?.refuelingLog?.fuelType ?? initialData?.fuelType ?? 'GASOLINA_COMUM',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setVehicleId(initialData.refuelingLog?.vehicleId ?? initialData.vehicleId ?? '');

    if (initialData.refuelingLog) {
      setCurrentKm(Math.floor(Number(initialData.refuelingLog.odometer)).toString());
      setLiters(Math.floor(Number(initialData.refuelingLog.fuelLiters) * 1000).toString());
      setFuelType(initialData.refuelingLog.fuelType);
    } else if (initialData.currentKm) {
      setCurrentKm(Math.floor(Number(initialData.currentKm)).toString());
    }
  }, [initialData]);

  // ─── Tab change side-effects ───────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'bill_payment') {
      setIsRecurring(false);
      setTotalInstallments(1);
      setHasPaidInstallments(false);
      setPaidInstallments(1);
      setCategoryId('');
      setClassification('TRANSFER');
      setDescription((prev) => (prev.trim().length ? prev : 'Pagamento de fatura'));
      return;
    }
    setTotalInstallments(1);
    setIsRecurring(false);
    setHasPaidInstallments(false);
    setPaidInstallments(1);
    setClassification((prev) => (prev === 'TRANSFER' ? 'COMMON' : prev));
  }, [activeTab]);

  useEffect(() => {
    if (totalInstallments > 1) setIsRecurring(false);
  }, [totalInstallments]);

  useEffect(() => {
    if (totalInstallments <= 1) {
      setHasPaidInstallments(false);
      setPaidInstallments(1);
      return;
    }
    setPaidInstallments((prev) => Math.min(prev, totalInstallments));
  }, [totalInstallments]);

  useEffect(() => {
    if (!hasPaidInstallments) setPaidInstallments(1);
  }, [hasPaidInstallments]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const isExpense = activeTab === 'expense';
  const isFuel = classification === 'FUEL';
  const isMaintenance = classification === 'MAINTENANCE';

  const filteredCategories = allCategories.filter(
    (c) => c.type === (isExpense ? 'EXPENSE' : 'INCOME'),
  );

  const vehicleFuelCategoryId =
    filteredCategories.find((c) => normalize(c.name) === 'veiculo-combustivel')?.id ?? null;

  const isVehicleCategory = React.useMemo(() => {
    const c = filteredCategories.find((cat) => cat.id === categoryId);
    if (!c) return false;
    const n = normalize(c.name);
    return n === 'veiculo' || n === 'mobilidade';
  }, [filteredCategories, categoryId]);

  const amountValue = Number(amount) / 100;
  const installmentValue = totalInstallments > 1 ? amountValue / totalInstallments : amountValue;

  const fmt = (cents: string) =>
    (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtVal = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtKm = Number(currentKm).toLocaleString('pt-BR');
  const fmtLiters = (Number(liters) / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  // ─── Navigation & submit ───────────────────────────────────────────────────

  const goBack = () => void navigate({ to: '/transactions' });

  const isSubmitDisabled = Number(amount) <= 0 || !date || !accountId;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const actualAmount = Number(amount) / 100;
      const actualLiters = Number(liters) / 1000;
      const channel = expenseKindToChannel(expenseKind);
      const forcedCategoryId =
        classification === 'FUEL' ? (vehicleFuelCategoryId ?? categoryId) : categoryId;

      const payload = {
        description:
          classification === 'FUEL'
            ? 'Abastecimento'
            : classification === 'MAINTENANCE'
              ? 'Manutenção veicular'
              : description,
        amount: actualAmount,
        date,
        type: activeTab === 'income' ? 'INCOME' : 'EXPENSE',
        isRecurring: classification === 'FUEL' || totalInstallments > 1 ? false : isRecurring,
        categoryId: forcedCategoryId || undefined,
        accountId,
        channel: activeTab === 'bill_payment' ? 'BANK' : channel,
        classification,
        ...(!isEditing && totalInstallments > 1 && { totalInstallments }),
        ...(!isEditing && totalInstallments > 1 && hasPaidInstallments && { paidInstallments }),
        ...(classification === 'FUEL' && {
          vehicleId,
          currentKm: Number(currentKm),
          liters: actualLiters,
          pricePerLiter: actualLiters > 0 ? actualAmount / actualLiters : 0,
          fuelType,
        }),
        ...(classification === 'MAINTENANCE' && {
          vehicleId,
          currentKm: Number(currentKm),
          maintenanceType: 'OTHER',
        }),
      };

      if (isEditing && transactionId) {
        await api.patch(`/transactions/${transactionId}`, payload);
      } else {
        await api.post('/transactions', payload);
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
      <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="p-1.5 rounded-lg hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold">
                {isEditing ? 'Editar Transação' : 'Nova Transação'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? 'Atualize os dados do lançamento.'
                  : 'Preencha os dados do novo lançamento.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || isSubmitDisabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition-smooth ${tabColor}`}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isEditing
                ? 'Salvar'
                : activeTab === 'bill_payment'
                  ? 'Confirmar Pagamento'
                  : `Confirmar ${isExpense ? 'Despesa' : 'Receita'}`}
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
          {isEditing && (
            <div className="absolute -top-5 right-0 flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <Lock className="w-3 h-3" /> Bloqueado
            </div>
          )}
          {[
            {
              key: 'expense' as const,
              label: 'Despesa',
              Icon: ArrowDownLeft,
              color: 'bg-rose-500 shadow-rose-500/20',
            },
            {
              key: 'income' as const,
              label: 'Receita',
              Icon: ArrowUpRight,
              color: 'bg-emerald-500 shadow-emerald-500/20',
            },
            {
              key: 'bill_payment' as const,
              label: 'Fatura',
              Icon: Receipt,
              color: 'bg-amber-500 shadow-amber-500/20',
            },
          ].map(({ key, label, Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => !isEditing && setActiveTab(key)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-smooth ${activeTab === key ? `${color} text-white shadow-lg` : 'text-muted-foreground hover:bg-muted/60'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Bill payment layout */}
        {activeTab === 'bill_payment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-premium p-5 flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Valores
              </p>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                Registra a saída de dinheiro da sua conta para pagar uma fatura.
              </div>
              <div>
                <label className={labelCls}>Valor</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={fmt(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-bold text-amber-500`}
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Destino
              </p>
              <div>
                <label className={labelCls}>Conta debitada</label>
                <CustomSelect
                  value={accountId}
                  onChange={setAccountId}
                  placeholder="Selecione a conta que paga"
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
              <div>
                <label className={labelCls}>Observações</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Fatura Nubank março"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* Expense / Income layout */}
        {activeTab !== 'bill_payment' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Identificação */}
            <div className="card-premium p-5 flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Identificação
              </p>
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
              <div>
                <label className={labelCls}>Descrição</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Supermercado, salário..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              {!isFuel && !isMaintenance && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    disabled={totalInstallments > 1}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-muted-foreground">Recorrente?</span>
                </label>
              )}
            </div>

            {/* Card 2: Valores */}
            <div className="card-premium p-5 flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Valores
              </p>
              <div>
                <label className={labelCls}>Valor</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={fmt(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-bold ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}
                />
              </div>
              {isExpense && (
                <div>
                  <label className={labelCls}>Tipo de Pagamento</label>
                  <CustomSelect
                    value={expenseKind}
                    onChange={(v) => setExpenseKind(v as ExpenseKind)}
                    disabled={isEditing}
                    placeholder="Tipo"
                    options={[
                      { value: 'CREDIT', label: 'Crédito' },
                      { value: 'DEBIT', label: 'Débito' },
                      { value: 'PIX', label: 'Pix' },
                      { value: 'BANK', label: 'Bancária' },
                      { value: 'CASH', label: 'Dinheiro' },
                    ]}
                  />
                </div>
              )}
              {isExpense && expenseKind === 'CREDIT' && (
                <div className="bg-muted/30 border border-border rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className={labelCls}>Parcelas</label>
                      <CustomSelect
                        value={String(totalInstallments)}
                        onChange={(v) => setTotalInstallments(Number(v))}
                        disabled={isEditing}
                        placeholder="Selecione"
                        options={Array.from({ length: 21 }, (_, i) => i + 1).map((n) => ({
                          value: String(n),
                          label: n === 1 ? 'À vista (1x)' : `${n}x`,
                        }))}
                      />
                    </div>
                    {!isEditing && totalInstallments > 1 && (
                      <label className="flex items-center gap-1.5 pb-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={hasPaidInstallments}
                          onChange={(e) => setHasPaidInstallments(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-border text-primary"
                        />
                        <span className="text-xs font-bold text-muted-foreground">Já pagou?</span>
                      </label>
                    )}
                  </div>
                  {totalInstallments > 1 && (
                    <p className="text-[10px] font-bold text-muted-foreground">
                      {fmtVal(installmentValue)}/parcela
                      {hasPaidInstallments &&
                        ` · ${paidInstallments} já ${paidInstallments === 1 ? 'paga' : 'pagas'}`}
                    </p>
                  )}
                  {!isEditing && totalInstallments > 1 && hasPaidInstallments && (
                    <CustomSelect
                      value={String(paidInstallments)}
                      onChange={(v) => setPaidInstallments(Number(v))}
                      placeholder="Selecione"
                      options={Array.from({ length: totalInstallments }, (_, i) => i + 1).map(
                        (n) => ({
                          value: String(n),
                          label: `${n} de ${totalInstallments} pagas`,
                        }),
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Card 3: Destino */}
            <div className="card-premium p-5 flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Destino
              </p>
              <div>
                <label className={labelCls}>Conta</label>
                <CustomSelect
                  value={accountId}
                  onChange={setAccountId}
                  placeholder="Selecione uma conta"
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
              <div>
                <label className={labelCls}>Categoria</label>
                <CustomSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Sem categoria"
                  options={filteredCategories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                    description: cat.description,
                    color: cat.color || 'var(--muted-foreground)',
                  }))}
                />
              </div>
              {isVehicleCategory && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={classification === 'FUEL'}
                    onChange={(e) => setClassification(e.target.checked ? 'FUEL' : 'COMMON')}
                    className="w-3.5 h-3.5 rounded border-border text-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-smooth uppercase tracking-widest">
                    Abastecimento?
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Vehicle section */}
        {(isFuel || isMaintenance) && (
          <div className="card-premium p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Veículo
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Veículo</label>
                <CustomSelect
                  value={vehicleId}
                  onChange={setVehicleId}
                  placeholder="Selecione"
                  options={vehicles.map((v) => ({
                    value: v.id,
                    label: v.name,
                    icon: (
                      <img
                        src={getBrandIcon(v.brand)}
                        className="w-4 h-4 grayscale opacity-70"
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ),
                  }))}
                />
              </div>
              {isFuel && (
                <div>
                  <label className={labelCls}>Combustível</label>
                  <CustomSelect
                    value={fuelType}
                    onChange={setFuelType}
                    options={[
                      { value: 'GASOLINA_COMUM', label: 'Gasolina Comum' },
                      { value: 'GASOLINA_ADITIVADA', label: 'Gasolina Aditivada' },
                      { value: 'ETANOL', label: 'Etanol' },
                      { value: 'DIESEL', label: 'Diesel' },
                      { value: 'GNV', label: 'GNV' },
                    ]}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Odômetro (km)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtKm}
                  onChange={(e) => setCurrentKm(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 160.148"
                  className={inputCls}
                />
              </div>
              {isFuel && (
                <div>
                  <label className={labelCls}>Litros</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={fmtLiters}
                      onChange={(e) => setLiters(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 45,234"
                      className={inputCls}
                    />
                    {Number(liters) > 0 && Number(amount) > 0 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">
                        {fmtVal(Number(amount) / 100 / (Number(liters) / 1000))}/L
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
