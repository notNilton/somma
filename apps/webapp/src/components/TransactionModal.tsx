import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, ArrowDownLeft, ArrowUpRight, Fuel } from 'lucide-react';
import { api } from '../lib/api';
import { cleanNumeric, formatCurrency, formatKm } from '../lib/formatters';
import CustomSelect from './ui/CustomSelect';

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
    return categories.filter((c) => c.type === (activeMode === 'income' ? 'INCOME' : 'EXPENSE'));
  }, [activeMode, categories]);

  const canSubmit =
    Number(amount) > 0 &&
    date !== '' &&
    (activeMode !== 'fuel' || vehicleId !== '');

  if (!isOpen) return null;

  const submit = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const methodPayload = methodToPayload(method);
      const payload: Record<string, unknown> = {
        type: activeMode === 'income' ? 'INCOME' : 'EXPENSE',
        classification: activeMode === 'fuel' ? 'FUEL' : 'COMMON',
        amount: Number(amount) / 100,
        date,
        description:
          description.trim() ||
          (activeMode === 'income' ? 'Receita' : activeMode === 'fuel' ? 'Abastecimento' : 'Despesa'),
        categoryId: categoryId || undefined,
        ...methodPayload,
      };

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="transactions-surface transactions-modal w-full max-w-2xl border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(241,245,249,0.9))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-300/70 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Transaction entry</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
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
            { key: 'expense' as const, label: 'Despesa', Icon: ArrowDownLeft },
            { key: 'income' as const, label: 'Receita', Icon: ArrowUpRight },
            { key: 'fuel' as const, label: 'Abastecimento', Icon: Fuel },
          ].map(({ key, label, Icon }) => {
            const selected = activeMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMode(key)}
                className={`flex items-center justify-center gap-2 border-r border-slate-300/70 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] transition-smooth last:border-r-0 ${
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

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
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
                    className={`border-r border-slate-300/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-smooth last:border-r-0 ${
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

        {error ? (
          <div className="mx-5 mb-5 semantic-expense px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-slate-300/70 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="transactions-action px-4 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isLoading}
            className="transactions-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
