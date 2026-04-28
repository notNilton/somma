import React, { useEffect, useId, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  Fuel,
  Loader2,
  Receipt,
  Save,
  Droplets,
  Gauge,
  Plus,
} from 'lucide-react';
import ActivityShell from '../../../components/ActivityShell';
import { SectionLoadingState } from '../../../components/SectionFeedback';
import SectionPageHeader from '../../../components/SectionPageHeader';
import { api } from '../../../lib/api';
import { cleanNumeric, formatCurrency } from '../../../lib/formatters';
import CustomSelect from '../../../components/ui/CustomSelect';

export const Route = createFileRoute('/activity/transactions/crud-transactions')({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search.transactionId === 'string' ? search.transactionId : undefined,
    vehicleId: typeof search.vehicleId === 'string' ? search.vehicleId : undefined,
    mode:
      search.mode === 'expense' ||
      search.mode === 'income' ||
      search.mode === 'bill' ||
      search.mode === 'fuel' ||
      search.mode === 'transfer'
        ? search.mode
        : undefined,
  }),
  component: CrudTransactionsPage,
});

type Mode = 'expense' | 'income' | 'bill' | 'fuel' | 'transfer';

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
  cardId?: string | null;
  vehicleId?: string;
  fuelType?: string;
  currentKm?: number | string;
  liters?: number | string;
  station?: string;
}

interface TransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}

const inputCls =
  'w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm outline-none transition-smooth focus:ring-2 focus:ring-primary/20';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block';

const modeMeta: Record<
  Mode,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; hint: string }
> = {
  expense: {
    label: 'Despesa',
    icon: ArrowDownLeft,
    color: 'bg-rose-500',
    hint: 'Saída comum, compra ou pagamento.',
  },
  income: {
    label: 'Receita',
    icon: ArrowUpRight,
    color: 'bg-emerald-500',
    hint: 'Entrada, repasse ou recebimento.',
  },
  bill: {
    label: 'Fatura',
    icon: Receipt,
    color: 'bg-amber-500',
    hint: 'Baixa de fatura ou pagamento consolidado.',
  },
  fuel: {
    label: 'Abastecimento',
    icon: Fuel,
    color: 'bg-sky-500',
    hint: 'Combustível, odômetro e litros.',
  },
  transfer: {
    label: 'Transferência',
    icon: ArrowLeftRight,
    color: 'bg-violet-500',
    hint: 'Movimentação entre duas contas.',
  },
};

const fuelTypes = [
  { value: 'GASOLINA_COMUM', label: 'Gasolina Comum' },
  { value: 'GASOLINA_ADITIVADA', label: 'Gasolina Aditivada' },
  { value: 'ETANOL', label: 'Etanol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'GNV', label: 'GNV' },
];

function getDefaultMode(tx?: Transaction, fallback: Mode = 'expense'): Mode {
  if (!tx) return fallback;
  if (tx.classification === 'FUEL') return 'fuel';
  if (tx.classification === 'TRANSFER') return 'bill';
  if (tx.type === 'INCOME') return 'income';
  return 'expense';
}

function formatDateInput(value?: string) {
  if (!value) return new Date().toISOString().split('T')[0];
  return new Date(value).toISOString().split('T')[0];
}

function parseMoney(cents: string) {
  return Number(cents || '0') / 100;
}

function CrudTransactionsPage() {
  const { transactionId, mode: searchMode, vehicleId: searchVehicleId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!transactionId;

  const amountId = useId();
  const dateId = useId();
  const accountIdUid = useId();
  const categoryIdUid = useId();
  const descriptionId = useId();
  const transferToId = useId();
  const vehicleIdUid = useId();
  const fuelTypeId = useId();
  const stationId = useId();
  const odometerId = useId();
  const litersId = useId();

  const { data: initialData, isLoading: isLoadingTx } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => api.get<Transaction>(`/api/v1/transactions/${transactionId}`),
    enabled: isEditing,
    staleTime: 0,
  });

  const { data: categories = [] } = useQuery({
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

  const [mode, setMode] = useState<Mode>(searchMode ?? 'expense');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [vehicleId, setVehicleId] = useState(searchVehicleId ?? '');
  const [fuelType, setFuelType] = useState('GASOLINA_COMUM');
  const [station, setStation] = useState('');
  const [odometer, setOdometer] = useState('0');
  const [liters, setLiters] = useState('0');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModeMeta = modeMeta[mode];
  const fuelCategory = useMemo(
    () =>
      categories.find(
        (c) =>
          c.type === 'EXPENSE' &&
          (c.name.toLowerCase().includes('combust') || c.description?.toLowerCase().includes('combust')),
      ),
    [categories],
  );

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === (mode === 'income' ? 'INCOME' : 'EXPENSE')),
    [categories, mode],
  );

  useEffect(() => {
    if (!initialData) return;
    const nextMode = getDefaultMode(initialData, searchMode ?? 'expense');
    setMode(nextMode);
    setDate(formatDateInput(initialData.date));
    setDescription(initialData.description ?? '');
    setAmount(Math.floor(Math.abs(Number(initialData.amount)) * 100).toString());
    setAccountId(initialData.accountId ?? '');
    setCategoryId(initialData.categoryId ?? '');
    setIsRecurring(initialData.isRecurring ?? false);
    setVehicleId(initialData.vehicleId ?? '');
    setFuelType(initialData.fuelType ?? 'GASOLINA_COMUM');
    setStation(initialData.station ?? '');
    setOdometer(
      initialData.currentKm != null ? Math.floor(Number(initialData.currentKm)).toString() : '0',
    );
    setLiters(
      initialData.liters != null ? Math.floor(Number(initialData.liters) * 1000).toString() : '0',
    );
  }, [initialData, searchMode]);

  useEffect(() => {
    if (mode === 'bill' && !description.trim()) {
      setDescription('Pagamento de fatura');
    }
    if (mode === 'fuel' && !description.trim()) {
      setDescription('Abastecimento');
    }
  }, [mode, description]);

  const amountValue = parseMoney(amount);
  const litersValue = Number(liters) / 1000;
  const monthLabel = useMemo(
    () =>
      new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [date],
  );

  const isTransferValid =
    accountId && transferToAccountId && accountId !== transferToAccountId && amountValue > 0 && !!date;
  const isFuelValid =
    vehicleId &&
    accountId &&
    amountValue > 0 &&
    !!date &&
    Number(odometer) > 0 &&
    litersValue > 0;
  const isStandardValid = accountId && amountValue > 0 && !!date && !!description.trim();

  const isSubmitDisabled =
    isSaving ||
    (mode === 'transfer'
      ? !isTransferValid
      : mode === 'fuel'
        ? !isFuelValid
        : !isStandardValid);

  const goBack = () => void navigate({ to: '/activity/transactions' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (mode === 'transfer') {
        const payload: TransferPayload = {
          fromAccountId: accountId,
          toAccountId: transferToAccountId,
          amount: amountValue,
          date,
          description: description.trim() || undefined,
        };
        await api.createTransfer(payload);
        if (isEditing && transactionId) {
          await api.delete(`/api/v1/transactions/${transactionId}`);
        }
        queryClient.invalidateQueries({ queryKey: ['transfers'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        goBack();
        return;
      }

      const payload = {
        accountId,
        categoryId: mode === 'fuel' ? (fuelCategory?.id ?? undefined) : categoryId || undefined,
        type: mode === 'income' ? 'INCOME' : 'EXPENSE',
        classification: mode === 'fuel' ? 'FUEL' : mode === 'bill' ? 'TRANSFER' : 'COMMON',
        isRecurring: mode === 'bill' ? false : isRecurring,
        amount: amountValue,
        date,
        description: description.trim() || (mode === 'fuel' ? 'Abastecimento' : undefined),
        channel: mode === 'income' ? 'PIX' : mode === 'bill' ? 'BANK' : 'BANK',
        paymentMethod: mode === 'income' ? 'DEBIT' : mode === 'bill' ? 'DEBIT' : 'DEBIT',
        vehicleId: mode === 'fuel' ? vehicleId : undefined,
        fuelType: mode === 'fuel' ? fuelType : undefined,
        currentKm: mode === 'fuel' ? Number(odometer) : undefined,
        liters: mode === 'fuel' ? litersValue : undefined,
        station: mode === 'fuel' ? (station.trim() || undefined) : undefined,
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
      setError(err instanceof Error ? err.message : 'Erro ao salvar lançamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const modeOptions = (['expense', 'income', 'bill', 'fuel', 'transfer'] as Mode[]).map((m) => {
    const meta = modeMeta[m];
    const Icon = meta.icon;
    return (
      <button
        key={m}
        type="button"
        onClick={() => setMode(m)}
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-smooth ${
          mode === m
            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
            : 'border-border hover:bg-muted/40'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-xl text-white ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{meta.label}</p>
            <p className="text-[10px] text-muted-foreground truncate">{meta.hint}</p>
          </div>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {mode === m ? 'Ativo' : 'Trocar'}
        </div>
      </button>
    );
  });

  if (isEditing && isLoadingTx) {
    return (
      <ActivityShell starfield contentClassName="flex-1 justify-center">
        <SectionLoadingState message="Carregando lançamento..." />
      </ActivityShell>
    );
  }

  const title = isEditing ? 'Editar lançamento' : 'Novo lançamento';
  const descriptionText =
    mode === 'transfer'
      ? 'Transforme este registro em uma movimentação entre contas.'
      : `Edição enxuta do lançamento. Modo atual: ${selectedModeMeta.label.toLowerCase()}.`;

  return (
    <ActivityShell starfield>
      <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SectionPageHeader
          title={title}
          description={descriptionText}
          backTo="/activity/transactions"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-smooth ${
                  selectedModeMeta.color
                }`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {mode === 'transfer' ? 'Converter' : isEditing ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          }
        />

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
          <div className="xl:col-span-2 card-premium p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tipo
                </p>
                <h2 className="text-sm font-bold">Escolha a natureza do lançamento</h2>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{modeOptions}</div>
          </div>

          <div className="xl:col-span-3 card-premium p-4 sm:p-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor={amountId}>
                  Valor
                </label>
                <div className="relative">
                  <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id={amountId}
                    required
                    type="text"
                    inputMode="numeric"
                    value={formatCurrency(amount)}
                    onChange={(e) => setAmount(cleanNumeric(e.target.value))}
                    className={`${inputCls} pl-10 text-lg font-black font-display ${
                      mode === 'income'
                        ? 'text-emerald-500'
                        : mode === 'bill'
                          ? 'text-amber-500'
                          : mode === 'fuel'
                            ? 'text-sky-500'
                            : mode === 'transfer'
                              ? 'text-violet-500'
                              : 'text-rose-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls} htmlFor={dateId}>
                  Data
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id={dateId}
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </div>
            </div>

            {mode === 'transfer' ? (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3">
                <div>
                  <label className={labelCls} htmlFor={accountIdUid}>
                    Conta de origem
                  </label>
                  <CustomSelect
                    id={accountIdUid}
                    value={accountId}
                    onChange={setAccountId}
                    options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                    placeholder="Selecione..."
                  />
                </div>
                <div className="hidden sm:flex items-center justify-center pt-6 text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div>
                  <label className={labelCls} htmlFor={transferToId}>
                    Conta de destino
                  </label>
                  <CustomSelect
                    id={transferToId}
                    value={transferToAccountId}
                    onChange={setTransferToAccountId}
                    options={accounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => ({ value: a.id, label: a.name }))}
                    placeholder="Selecione..."
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor={accountIdUid}>
                    Conta
                  </label>
                  <CustomSelect
                    id={accountIdUid}
                    value={accountId}
                    onChange={setAccountId}
                    options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                    placeholder="Selecione..."
                  />
                </div>
                {mode !== 'bill' && mode !== 'fuel' ? (
                  <div>
                    <label className={labelCls} htmlFor={categoryIdUid}>
                      Categoria
                    </label>
                    <CustomSelect
                      id={categoryIdUid}
                      value={categoryId}
                      onChange={setCategoryId}
                      options={filteredCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                        description: c.description,
                        color: c.color,
                      }))}
                      placeholder="Opcional"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Categoria
                      </p>
                      <p className="text-sm font-semibold">
                        {mode === 'fuel' ? 'Automática para combustível' : 'Não aplicada'}
                      </p>
                    </div>
                    <Droplets className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>

          {mode === 'fuel' && (
            <div className="xl:col-span-5 card-premium p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Fuel className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                  Abastecimento
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls} htmlFor={vehicleIdUid}>
                    Veículo
                  </label>
                  <CustomSelect
                    id={vehicleIdUid}
                    value={vehicleId}
                    onChange={setVehicleId}
                    options={vehicles.map((v) => ({
                      value: v.id,
                      label: v.name,
                      description: v.brand,
                      icon: <CarFront className="w-3.5 h-3.5" />,
                    }))}
                    placeholder="Selecione..."
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={fuelTypeId}>
                    Tipo de combustível
                  </label>
                  <CustomSelect
                    id={fuelTypeId}
                    value={fuelType}
                    onChange={setFuelType}
                    options={fuelTypes}
                    placeholder="Selecione..."
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={odometerId}>
                    Odômetro
                  </label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id={odometerId}
                      required
                      type="text"
                      inputMode="numeric"
                      value={odometer === '0' ? '' : Number(odometer).toLocaleString('pt-BR')}
                      onChange={(e) => setOdometer(cleanNumeric(e.target.value))}
                      className={`${inputCls} pl-10`}
                      placeholder="Ex: 45000"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor={litersId}>
                    Litros
                  </label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id={litersId}
                      required
                      type="text"
                      inputMode="numeric"
                      value={
                        liters === '0'
                          ? ''
                          : (Number(liters) / 1000).toLocaleString('pt-BR', {
                              minimumFractionDigits: 3,
                            })
                      }
                      onChange={(e) => setLiters(cleanNumeric(e.target.value))}
                      className={`${inputCls} pl-10`}
                      placeholder="Ex: 40,000"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className={labelCls} htmlFor={stationId}>
                  Posto / Observação
                </label>
                <input
                  id={stationId}
                  type="text"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: Posto Shell Centro"
                />
              </div>
            </div>
          )}

          <div className="xl:col-span-5 card-premium p-4 sm:p-5">
            <label className={labelCls} htmlFor={descriptionId}>
              Descrição
            </label>
            <textarea
              id={descriptionId}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
              placeholder="Ex: Compra no mercado, salário, pagamento da fatura..."
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-bold uppercase tracking-widest">Resumo</span>
              <span className="rounded-full border border-border px-2 py-1 bg-muted/30">
                {selectedModeMeta.label}
              </span>
              <span className="rounded-full border border-border px-2 py-1 bg-muted/30">
                {monthLabel}
              </span>
              {mode === 'bill' && (
                <span className="rounded-full border border-border px-2 py-1 bg-muted/30">
                  Fatura consolidada
                </span>
              )}
              {isEditing && (
                <span className="rounded-full border border-border px-2 py-1 bg-muted/30">
                  Edição
                </span>
              )}
            </div>
          </div>
        </div>
      </form>
    </ActivityShell>
  );
}
