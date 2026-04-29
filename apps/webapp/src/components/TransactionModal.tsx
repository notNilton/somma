import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, ArrowDownLeft, ArrowUpRight, Fuel } from 'lucide-react';
import { api } from '../lib/api';
import { cleanNumeric, formatCurrency, formatKm } from '../lib/formatters';
import CustomSelect from './ui/CustomSelect';
import { flattenCategories } from '../lib/categories';

export type TransactionCreateMode = 'expense' | 'income' | 'fuel';
type Method = 'normal' | 'debit' | 'credit' | 'pix';

interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Vehicle {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  mode: TransactionCreateMode;
  categories: Category[];
  vehicles: Vehicle[];
  onClose: () => void;
  onCreated: () => void;
}

function methodToPayload(method: Method) {
  switch (method) {
    case 'credit':
      return { paymentMethod: 'CREDIT', channel: 'CARD_CREDIT' };
    case 'pix':
      return { paymentMethod: 'DEBIT', channel: 'PIX' };
    case 'normal':
      return { paymentMethod: 'DEBIT', channel: 'BANK' };
    case 'debit':
    default:
      return { paymentMethod: 'DEBIT', channel: 'CARD_DEBIT' };
  }
}

function defaultDescriptionForMode(mode: TransactionCreateMode) {
  if (mode === 'income') return 'Receita';
  if (mode === 'fuel') return 'Abastecimento';
  return 'Despesa';
}

export function TransactionModal({
  isOpen,
  mode,
  categories,
  vehicles,
  onClose,
  onCreated,
}: Props) {
  const [activeMode, setActiveMode] = useState<TransactionCreateMode>(mode);
  const [method, setMethod] = useState<Method>('normal');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [currentKm, setCurrentKm] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveMode(mode);
    setMethod('normal');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('0');
    setDescription('');
    setCategoryId('');
    setVehicleId('');
    setCurrentKm('0');
    setIsLoading(false);
    setError(null);
  }, [isOpen, mode]);

  const filteredCategories = useMemo(() => {
    return flattenCategories(categories).filter(
      (c) => c.type === (activeMode === 'income' ? 'INCOME' : 'EXPENSE'),
    );
  }, [activeMode, categories]);

  const canSubmit =
    Number(amount) > 0 &&
    date !== '' &&
    (activeMode !== 'fuel' || vehicleId !== '');
  const showPaymentMethod = activeMode !== 'income';

  if (!isOpen) return null;

  const submit = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        type: activeMode === 'income' ? 'INCOME' : 'EXPENSE',
        classification: activeMode === 'fuel' ? 'FUEL' : 'COMMON',
        amount: Number(amount) / 100,
        date,
        description:
          description.trim() || defaultDescriptionForMode(activeMode),
        categoryId: categoryId || undefined,
      };

      if (showPaymentMethod) {
        Object.assign(payload, methodToPayload(method));
      }

      if (activeMode === 'fuel') {
        payload.vehicleId = vehicleId;
        payload.currentKm = Number(currentKm);
      }

      await api.post('/api/v1/transactions', payload);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar transação.');
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    activeMode === 'income' ? 'Nova Receita' : activeMode === 'fuel' ? 'Novo Abastecimento' : 'Nova Despesa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 backdrop-blur-sm px-0 py-0 sm:items-center sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="transactions-surface transactions-modal flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(241,245,249,0.9))] shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-2xl sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-300/70 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 sm:text-[10px] sm:tracking-[0.35em]">
              Transaction entry
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="transactions-action p-2"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-0 border-b border-slate-300/70">
          {[
            { key: 'income' as const, label: 'Receita', Icon: ArrowUpRight },
            { key: 'expense' as const, label: 'Despesa', Icon: ArrowDownLeft },
            { key: 'fuel' as const, label: 'Abastecimento', Icon: Fuel },
          ].map(({ key, label, Icon }) => {
            const selected = activeMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMode(key)}
                className={`flex items-center justify-center gap-1.5 border-r border-slate-300/70 px-2 py-2.5 text-[10px] font-bold uppercase leading-none tracking-[0.12em] transition-smooth last:border-r-0 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.2em] ${
                  selected
                    ? key === 'income'
                      ? 'semantic-income-solid'
                      : key === 'expense'
                        ? 'semantic-expense-solid'
                        : 'bg-slate-900 text-white'
                    : 'bg-white/70 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">
            <div className="sm:col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Valor
            </label>
            <input
              value={formatCurrency(amount)}
              onChange={(e) => setAmount(cleanNumeric(e.target.value))}
              className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
              inputMode="numeric"
              type="text"
              placeholder="0,00"
            />
          </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>

            {activeMode !== 'fuel' ? (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">Sem categoria</option>
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.description ?? category.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Descrição
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
                type="text"
                placeholder={title}
                maxLength={255}
              />
            </div>

            {showPaymentMethod ? (
              <div className="sm:col-span-2">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Forma
                </label>
                <div className="grid grid-cols-4 border border-slate-300/80 bg-white">
                  {[
                    { key: 'normal' as const, label: 'Normal' },
                    { key: 'debit' as const, label: 'Débito' },
                    { key: 'credit' as const, label: 'Crédito' },
                    { key: 'pix' as const, label: 'Pix' },
                  ].map(({ key, label }) => {
                    const selected = method === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMethod(key)}
                        className={`border-r border-slate-300/80 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-smooth last:border-r-0 sm:px-3 sm:py-2 sm:text-xs sm:tracking-[0.18em] ${
                          selected
                            ? key === 'credit'
                              ? 'semantic-credit-solid'
                              : key === 'pix'
                                ? 'semantic-pix-solid'
                                : 'semantic-debit-solid'
                            : key === 'credit'
                              ? 'text-slate-700 hover:bg-amber-500/10 hover:text-amber-600'
                              : key === 'pix'
                                ? 'text-slate-700 hover:bg-sky-500/10 hover:text-sky-600'
                                : 'text-slate-700 hover:bg-orange-500/10 hover:text-orange-600'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2 rounded-none border border-slate-300/70 bg-white/70 px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                Receita é apenas uma entrada. Sem forma de pagamento.
              </div>
            )}

            {activeMode === 'fuel' ? (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                    Veículo
                  </label>
                  <CustomSelect
                    value={vehicleId}
                    onChange={setVehicleId}
                    options={vehicles.map((vehicle) => ({
                      value: vehicle.id,
                      label: vehicle.name,
                    }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                    Km atual
                  </label>
                  <input
                    value={formatKm(currentKm)}
                    onChange={(e) => setCurrentKm(cleanNumeric(e.target.value))}
                    className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
                    inputMode="numeric"
                    type="text"
                    placeholder="0"
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mx-4 mb-4 semantic-expense px-3 py-2 text-sm sm:mx-5 sm:mb-5">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-slate-300/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="transactions-action w-full px-4 py-3 text-sm font-semibold sm:w-auto sm:py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isLoading}
            className="transactions-primary inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
