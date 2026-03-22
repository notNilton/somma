import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Lock, Loader2, X, Receipt } from 'lucide-react';
import { getBrandIcon } from '../lib/vehicle-brands';
import { useTransactionModalModel } from './TransactionModal.queries';

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface Account {
  id: string;
  name: string;
  creditLimit?: number | string | null;
  type?: 'CHECKING' | 'SAVINGS' | 'CASH' | 'WALLET' | 'INVESTMENT';
}

export interface Vehicle {
  id: string;
  name: string;
  brand?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number | string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  classification?: string;
  paymentMethod?: 'DEBIT' | 'CREDIT';
  isRecurring?: boolean;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  channel?: string;
  category?: Category;
  account?: Account;
  vehicleId?: string;
  currentKm?: number;
  liters?: number;
  pricePerLiter?: number;
  fuelType?: string;
  refuelingLog?: {
    vehicleId: string;
    odometer: number;
    fuelLiters: number;
    fuelType: string;
    pricePerLiter: number;
  };
}

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  initialData?: Transaction | null;
  defaultVehicleId?: string;
  defaultClassification?: 'COMMON' | 'FUEL' | 'MAINTENANCE';
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: {
    value: string;
    label: string;
    description?: string;
    color?: string;
    icon?: React.ReactNode;
  }[];
  placeholder?: string;
  disabled?: boolean;
}

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  disabled,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);

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
          <span className="truncate">{selected?.label || placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl shadow-primary/10 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 p-1 ring-1 ring-black/5">
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

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'create',
  initialData,
  defaultVehicleId,
  defaultClassification,
}: TransactionModalProps) {
  const model = useTransactionModalModel({
    isOpen,
    onClose,
    onSuccess,
    mode,
    initialData,
    defaultVehicleId,
    defaultClassification,
  });

  if (!isOpen) return null;

  const {
    isEditing,
    isFuel,
    isMaintenance,
    activeTab,
    isExpense,
    setActiveTab,
    date,
    setDate,
    description,
    setDescription,
    amount,
    handleAmountChange,
    categoryId,
    setCategoryId,
    accountId,
    setAccountId,
    totalInstallments,
    setTotalInstallments,
    hasPaidInstallments,
    setHasPaidInstallments,
    paidInstallments,
    setPaidInstallments,
    vehicleId,
    setVehicleId,
    handleKmChange,
    liters,
    handleLitersChange,
    fuelType,
    setFuelType,
    formattedAmount,
    installmentValue,
    formattedInstallment,
    formattedKm,
    formattedLiters,
    filteredCategories,
    accounts,
    vehicles,
    expenseKind,
    setExpenseKind,
    isVehicleCategory,
    classification,
    setClassification,
    isLoading,
    isSubmitDisabled,
    error,
    handleSubmit,
  } = model;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl shadow-primary/5 p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold font-display">
            {isEditing ? 'Editar Lançamento' : 'Nova Transação'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-smooth text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Tipo: Despesa / Receita / Fatura */}
          <div
            className={`relative grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-lg ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isEditing && (
              <div className="absolute -top-5 right-0 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <Lock className="w-3 h-3" />
                Bloqueado
              </div>
            )}
            {(
              [
                {
                  key: 'expense',
                  label: 'Despesa',
                  Icon: ArrowDownLeft,
                  color: 'bg-rose-500 shadow-rose-500/20',
                },
                {
                  key: 'income',
                  label: 'Receita',
                  Icon: ArrowUpRight,
                  color: 'bg-emerald-500 shadow-emerald-500/20',
                },
                {
                  key: 'bill_payment',
                  label: 'Fatura',
                  Icon: Receipt,
                  color: 'bg-amber-500 shadow-amber-500/20',
                },
              ] as const
            ).map(({ key, label, Icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => !isEditing && setActiveTab(key)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-smooth ${
                  activeTab === key
                    ? `${color} text-white shadow-lg`
                    : 'text-muted-foreground hover:bg-muted-foreground/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Formulário de Pagamento de Fatura */}
          {activeTab === 'bill_payment' && (
            <div className="flex flex-col gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                Registra a saída de dinheiro da sua conta para pagar uma fatura. Aparece como
                "Fatura Paga" no resumo mensal.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Valor</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={formattedAmount}
                    onChange={handleAmountChange}
                    className={`${inputCls} font-bold text-amber-500 focus:ring-amber-500/20`}
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
                <div className="col-span-2">
                  <label className={labelCls}>Conta debitada</label>
                  <CustomSelect
                    value={accountId}
                    onChange={setAccountId}
                    placeholder="Selecione a conta que paga"
                    options={accounts.map((acc) => ({ value: acc.id, label: acc.name }))}
                  />
                </div>
                <div className="col-span-2">
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

          {/* Despesa / Receita */}
          <div className={`flex flex-col gap-3 ${activeTab === 'bill_payment' ? 'hidden' : ''}`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Valor</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={formattedAmount}
                  onChange={handleAmountChange}
                  className={`${inputCls} font-bold ${isExpense ? 'text-rose-500 focus:ring-rose-500/20' : 'text-emerald-500 focus:ring-emerald-500/20'}`}
                />
              </div>
              {activeTab === 'expense' && (
                <div>
                  <label className={labelCls}>Tipo</label>
                  <CustomSelect
                    value={expenseKind}
                    onChange={(v) => setExpenseKind(v as 'DEBIT' | 'PIX' | 'BANK' | 'CASH')}
                    disabled={isEditing}
                    placeholder="Tipo de despesa"
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
            </div>

            {/* Parcelas — só para crédito */}
            {activeTab === 'expense' && expenseKind === 'CREDIT' && (
              <div className="bg-muted/30 border border-border rounded-xl p-3 flex flex-col gap-3">
                <div>
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
                  {totalInstallments > 1 && (
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">
                      Parcela: {formattedInstallment}
                    </p>
                  )}
                </div>
                {!isEditing && totalInstallments > 1 && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasPaidInstallments}
                        onChange={(e) => setHasPaidInstallments(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 transition-smooth"
                      />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Já pagou algumas?
                      </span>
                    </label>
                    {hasPaidInstallments && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Quantas?</label>
                          <CustomSelect
                            value={String(paidInstallments)}
                            onChange={(v) => setPaidInstallments(Number(v))}
                            placeholder="Selecione"
                            options={Array.from({ length: totalInstallments }, (_, i) => i + 1).map(
                              (n) => ({ value: String(n), label: `${n} de ${totalInstallments}` }),
                            )}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Valor pago</label>
                          <div className={`${inputCls} font-bold`}>
                            {(installmentValue * paidInstallments).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Conta */}
            <div>
              <label className={labelCls}>Conta</label>
              <CustomSelect
                value={accountId}
                onChange={setAccountId}
                placeholder="Selecione uma conta"
                options={accounts.map((acc) => ({ value: acc.id, label: acc.name }))}
              />
            </div>

            {/* Toggle Abastecimento */}
            {isVehicleCategory && (
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={classification === 'FUEL'}
                  onChange={(e) => setClassification(e.target.checked ? 'FUEL' : 'COMMON')}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 transition-smooth cursor-pointer"
                />
                <span className="text-xs font-bold uppercase tracking-widest group-hover:text-foreground transition-smooth">
                  Abastecimento?
                </span>
              </label>
            )}

            {/* Veículo + combustível */}
            {(isFuel || isMaintenance) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Veículo</label>
                  <CustomSelect
                    value={vehicleId}
                    placeholder="Selecione"
                    onChange={setVehicleId}
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
                    value={formattedKm}
                    onChange={handleKmChange}
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
                        value={formattedLiters}
                        onChange={handleLitersChange}
                        placeholder="Ex: 45,234"
                        className={inputCls}
                      />
                      {Number(liters) > 0 && Number(amount) > 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">
                          {(Number(amount) / 100 / (Number(liters) / 1000)).toLocaleString(
                            'pt-BR',
                            { style: 'currency', currency: 'BRL' },
                          )}
                          /L
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Observações */}
            {!isFuel && !isMaintenance && (
              <div>
                <label className={labelCls}>Observações</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Supermercado, posto, etc..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || isSubmitDisabled}
              className={`flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition-smooth hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 ${
                activeTab === 'bill_payment'
                  ? 'bg-amber-500 shadow-amber-500/20'
                  : isExpense
                    ? 'bg-rose-500 shadow-rose-500/20'
                    : 'bg-emerald-500 shadow-emerald-500/20'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                'Salvar'
              ) : activeTab === 'bill_payment' ? (
                'Confirmar Pagamento'
              ) : (
                `Confirmar ${isFuel ? 'Abastecimento' : isExpense ? 'Despesa' : 'Receita'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
