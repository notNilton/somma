import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Lock, Loader2, X } from 'lucide-react';
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
        className="w-full flex items-center justify-between text-left bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth disabled:opacity-50"
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
          <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl shadow-primary/10 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 p-1.5 ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-smooth group"
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
                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-smooth group ${
                  value === opt.value ? 'bg-primary/5' : ''
                }`}
              >
                {opt.color && (
                  <div
                    className="w-2.5 h-2.5 shrink-0 rounded-full mt-1.5 shadow-sm border border-black/10"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.icon && <div className="mt-0.5 shrink-0">{opt.icon}</div>}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-bold transition-smooth truncate ${
                      value === opt.value
                        ? 'text-primary'
                        : 'text-foreground group-hover:text-primary'
                    }`}
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
      <div className="bg-card border border-border w-full max-w-xl rounded-3xl shadow-2xl shadow-primary/5 p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight">
              {isEditing ? 'Editar Lançamento' : 'Nova Transação'}
            </h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
              {isEditing ? 'Atualize os detalhes da transação' : 'Registro de atividade financeira'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-smooth text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* Tipo: Despesa / Receita */}
          <div
            className={`relative grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl ${
              isEditing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isEditing && (
              <div className="absolute -top-6 right-0 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <Lock className="w-3 h-3" />
                Bloqueado
              </div>
            )}
            <button
              type="button"
              onClick={() => !isEditing && setActiveTab('expense')}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-smooth ${
                activeTab === 'expense'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'text-muted-foreground hover:bg-muted-foreground/10'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => !isEditing && setActiveTab('income')}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-smooth ${
                activeTab === 'income'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-muted-foreground hover:bg-muted-foreground/10'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Receita
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*:last-child:nth-child(odd)]:sm:col-span-2">
            {/* Valor Total */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Valor Total
              </label>
              <input
                required
                type="text"
                inputMode="numeric"
                value={formattedAmount}
                onChange={handleAmountChange}
                className={`w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 outline-none transition-smooth ${
                  isExpense
                    ? 'text-rose-500 focus:ring-rose-500/20'
                    : 'text-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
            </div>

            {/* Tipo de despesa (canal) */}
            {activeTab === 'expense' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Tipo de despesa
                </label>
                <CustomSelect
                  value={expenseKind}
                  onChange={(v) => setExpenseKind(v as 'DEBIT' | 'PIX' | 'BANK' | 'CASH')}
                  disabled={isEditing}
                  placeholder="Selecione o tipo"
                  options={[
                    { value: 'DEBIT', label: 'Débito' },
                    { value: 'PIX', label: 'Pix' },
                    { value: 'BANK', label: 'Transação bancária' },
                    { value: 'CASH', label: 'Dinheiro físico' },
                  ]}
                />
              </div>
            )}

            {/* Data */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Data
              </label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Categoria
              </label>
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

            {/* Parcelas (todas as despesas) */}
            {activeTab === 'expense' && (
              <div className="sm:col-span-2 bg-muted/30 border border-border rounded-2xl p-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Parcelas
                  </label>
                  <CustomSelect
                    value={String(totalInstallments)}
                    onChange={(v) => setTotalInstallments(Number(v))}
                    disabled={isEditing}
                    placeholder="Selecione as Parcelas"
                    options={Array.from({ length: 21 }, (_, i) => i + 1).map((n) => ({
                      value: String(n),
                      label: n === 1 ? 'À vista (1x)' : `${n}x`,
                    }))}
                  />
                  {totalInstallments > 1 && (
                    <p className="text-[10px] font-bold text-muted-foreground mt-1.5">
                      Valor por parcela: {formattedInstallment}
                    </p>
                  )}
                </div>

                {!isEditing && totalInstallments > 1 && (
                  <div className="mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasPaidInstallments}
                        onChange={(e) => setHasPaidInstallments(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 transition-smooth"
                      />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest">
                          já pagou algumas parcelas?
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Marca as primeiras parcelas como pagas
                        </p>
                      </div>
                    </label>

                    {hasPaidInstallments && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                            quantas parcelas?
                          </label>
                          <CustomSelect
                            value={String(paidInstallments)}
                            onChange={(v) => setPaidInstallments(Number(v))}
                            placeholder="Selecione"
                            options={Array.from({ length: totalInstallments }, (_, i) => i + 1).map(
                              (n) => ({
                                value: String(n),
                                label: `${n} de ${totalInstallments}`,
                              }),
                            )}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                            valor já pago
                          </label>
                          <div className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold">
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
            <div className="sm:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Conta
              </label>
              <CustomSelect
                value={accountId}
                onChange={setAccountId}
                placeholder="Selecione uma conta"
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: acc.name,
                }))}
              />
            </div>

            {/* Toggle Abastecimento */}
            {isVehicleCategory && (
              <div className="sm:col-span-2 pt-2 pb-1">
                <label className="flex items-center gap-3 cursor-pointer group w-max">
                  <input
                    type="checkbox"
                    checked={classification === 'FUEL'}
                    onChange={(e) => setClassification(e.target.checked ? 'FUEL' : 'COMMON')}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 transition-smooth cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest group-hover:text-foreground transition-smooth">
                      Abastecimento?
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Mostra campos extras de odômetro, litros consumidos e cálculo de consumo.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Veículo + combustível */}
            {(isFuel || isMaintenance) && (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Veículo
                  </label>
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Tipo de Combustível
                    </label>
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

                <div className={isFuel ? '' : 'col-span-1'}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Odômetro (KM)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formattedKm}
                    onChange={handleKmChange}
                    placeholder="Ex: 160.148"
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
                  />
                </div>

                {isFuel && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Litros
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formattedLiters}
                        onChange={handleLitersChange}
                        placeholder="Ex: 45,234"
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
                      />
                      {Number(liters) > 0 && Number(amount) > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">
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
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Supermercado, posto, etc..."
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth resize-none"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-2xl border border-border font-bold text-sm hover:bg-muted transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || isSubmitDisabled}
              className={`flex-[3] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-lg transition-smooth hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 ${
                isExpense
                  ? 'bg-rose-500 shadow-rose-500/20'
                  : 'bg-emerald-500 shadow-emerald-500/20'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                'Salvar Alterações'
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
