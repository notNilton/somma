import React, { useEffect, useState, useId } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Fuel,
  Loader2,
  Save,
  Wallet,
  Car,
  CalendarDays,
  Droplets,
  Gauge,
  CircleDollarSign,
} from 'lucide-react';
import ActivityShell from '../../../components/ActivityShell';
import { SectionLoadingState } from '../../../components/SectionFeedback';
import SectionPageHeader from '../../../components/SectionPageHeader';
import { api } from '../../../lib/api';
import { formatCurrency, cleanNumeric, formatValue, formatKm } from '../../../lib/formatters';
import CustomSelect from '../../../components/ui/CustomSelect';

export const Route = createFileRoute('/activity/transactions/crud-fueling')({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search.transactionId === 'string' ? search.transactionId : undefined,
    vehicleId: typeof search.vehicleId === 'string' ? search.vehicleId : undefined,
  }),
  component: CrudFuelingPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Transaction {
  id: string;
  description: string;
  amount: number | string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  classification?: string;
  accountId?: string;
  categoryId?: string;
  vehicleId?: string;
  currentKm?: number;
  liters?: number;
  fuelType?: string;
}

const FUEL_TYPES = [
  { value: 'GASOLINA_COMUM', label: 'Gasolina Comum' },
  { value: 'GASOLINA_ADITIVADA', label: 'Gasolina Aditivada' },
  { value: 'ETANOL', label: 'Etanol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'GNV', label: 'GNV' },
];

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

// ─── Page ─────────────────────────────────────────────────────────────────────

function CrudFuelingPage() {
  const { transactionId, vehicleId: defaultVehicleId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!transactionId;

  // Accessibility IDs
  const amountId = useId();
  const dateId = useId();
  const accountId_uid = useId();
  const vehicleId_uid = useId();
  const fuelTypeId_uid = useId();
  const kmId = useId();
  const litersId = useId();

  // Fetch transaction when editing
  const { data: initialData, isLoading: isLoadingTx } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => api.get<Transaction>(`/api/v1/transactions/${transactionId}`),
    enabled: !!transactionId,
    staleTime: 0,
  });

  // Supporting data
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/api/v1/accounts'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  // ─── Form state ────────────────────────────────────────────────────────────

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amountCents, setAmountCents] = useState('0');
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || '');
  const [accountId, setAccountId] = useState('');
  const [fuelType, setFuelType] = useState('GASOLINA_COMUM');
  const [odometer, setOdometer] = useState('0');
  const [litersNum, setLitersNum] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Populate from fetched data ────────────────────────────────────────────

  useEffect(() => {
    if (!initialData) return;
    setDate(new Date(initialData.date).toISOString().split('T')[0]);
    setAmountCents(Math.floor(Math.abs(Number(initialData.amount)) * 100).toString());
    setAccountId(initialData.accountId ?? '');
    setVehicleId(initialData.vehicleId ?? '');
    setFuelType(initialData.fuelType ?? 'GASOLINA_COMUM');
    setOdometer(initialData.currentKm ? Math.floor(Number(initialData.currentKm)).toString() : '0');
    setLitersNum(initialData.liters ? Math.floor(Number(initialData.liters) * 1000).toString() : '0');
  }, [initialData]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const litersDecimal = Number(litersNum) / 1000;
  const pricePerLiter = litersDecimal > 0 ? (Number(amountCents) / 100) / litersDecimal : 0;

  const goBack = () => void navigate({ to: '/activity/transactions' });

  const isSubmitDisabled = !vehicleId || !accountId || Number(amountCents) <= 0 || !date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Find fuel category
      const fuelCat = categories.find(c => 
        c.name.toLowerCase().includes('combust') || 
        c.name.toLowerCase().includes('transp')
      )?.id;

      const payload = {
        type: 'EXPENSE',
        classification: 'FUEL',
        description: 'Abastecimento',
        amount: Number(amountCents) / 100,
        date,
        accountId,
        categoryId: fuelCat,
        vehicleId,
        currentKm: Number(odometer),
        liters: litersDecimal,
        fuelType,
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
      setError(err instanceof Error ? err.message : 'Erro ao salvar abastecimento.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && isLoadingTx) {
    return (
      <ActivityShell contentClassName="flex-1 justify-center">
        <SectionLoadingState message="Carregando abastecimento..." />
      </ActivityShell>
    );
  }

  return (
    <ActivityShell>
      <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SectionPageHeader
          title={isEditing ? 'Editar Abastecimento' : 'Novo Abastecimento'}
          description="Registre consumo, quilometragem e custo por litro."
          backTo="/activity/transactions"
          actions={<div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || isSubmitDisabled}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-smooth"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'Atualizar' : 'Confirmar'}
            </button>
          </div>}
        />

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Section 1: Financial & Date */}
          <div className="card-premium p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 mb-1">
               <CircleDollarSign className="w-4 h-4 text-primary" />
               <span className="text-xs font-bold uppercase tracking-tight text-foreground">Informações de Pagamento</span>
            </div>
            
            <div>
              <label className={labelCls} htmlFor={amountId}>Valor Total Pago</label>
              <input
                id={amountId}
                required
                type="text"
                inputMode="numeric"
                value={formatCurrency(amountCents)}
                onChange={(e) => setAmountCents(cleanNumeric(e.target.value))}
                className={`${inputCls} text-lg font-black text-rose-500 font-display`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor={dateId}>Data do Registro</label>
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
              <div>
                <label className={labelCls} htmlFor={accountId_uid}>Conta Pagadora</label>
                <CustomSelect
                  id={accountId_uid}
                  value={accountId}
                  onChange={setAccountId}
                  options={accounts.map(acc => ({ value: acc.id, label: acc.name, icon: <Wallet className="w-3 h-3"/> }))}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle & Odometer */}
          <div className="card-premium p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 mb-1">
               <Car className="w-4 h-4 text-primary" />
               <span className="text-xs font-bold uppercase tracking-tight text-foreground">Veículo e Hodômetro</span>
            </div>

            <div>
              <label className={labelCls} htmlFor={vehicleId_uid}>Selecione o Veículo</label>
              <CustomSelect
                id={vehicleId_uid}
                value={vehicleId}
                onChange={setVehicleId}
                options={vehicles.map(v => ({ value: v.id, label: v.name, icon: <Car className="w-3 h-3"/> }))}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor={kmId}>Odômetro Atual (km)</label>
              <div className="relative">
                 <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <input
                  id={kmId}
                  required
                  type="text"
                  inputMode="numeric"
                  value={formatKm(odometer)}
                  onChange={(e) => setOdometer(cleanNumeric(e.target.value))}
                  placeholder="Ex: 45.000"
                  className={`${inputCls} pl-10 font-bold`}
                 />
              </div>
            </div>
          </div>

          {/* Section 3: Fuel Details */}
          <div className="md:col-span-2 card-premium p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 mb-1">
               <Droplets className="w-4 h-4 text-primary" />
               <span className="text-xs font-bold uppercase tracking-tight text-foreground">Detalhes do Abastecimento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelCls} htmlFor={fuelTypeId_uid}>Tipo de Combustível</label>
                <CustomSelect
                  id={fuelTypeId_uid}
                  value={fuelType}
                  onChange={setFuelType}
                  options={FUEL_TYPES}
                />
              </div>

              <div>
                <label className={labelCls} htmlFor={litersId}>Volume (Litros)</label>
                <div className="relative">
                  <input
                    id={litersId}
                    type="text"
                    inputMode="numeric"
                    value={litersNum === '0' ? '' : (Number(litersNum)/1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                    onChange={(e) => setLitersNum(cleanNumeric(e.target.value))}
                    placeholder="Ex: 40,000"
                    className={`${inputCls} font-bold`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">L</span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 flex flex-col justify-center border border-border/50">
                 <span className={labelCls}>Média de Preço</span>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-display text-primary">
                      {formatValue(pricePerLiter)}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">por litro</span>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </form>
    </ActivityShell>
  );
}
