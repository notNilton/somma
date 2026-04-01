import { useState } from 'react';
import { Loader2, X, Fuel } from 'lucide-react';
import { api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';

export interface Vehicle {
  id: string;
  name: string;
  brand?: string;
}

export interface FuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultVehicleId?: string;
}

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

export function FuelModal({
  isOpen,
  onClose,
  onSuccess,
  defaultVehicleId,
}: FuelModalProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description] = useState('');
  const [amountCents, setAmountCents] = useState('0');
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || '');
  const [fuelType, setFuelType] = useState('GASOLINA_COMUM');
  const [odometer, setOdometer] = useState('0');
  const [litersNum, setLitersNum] = useState('0');
  const [accountId, setAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<any[]>('/api/v1/accounts'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any[]>('/api/v1/categories'),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !accountId || Number(amountCents) <= 0) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Find a category that looks like "Transporte" or "Combustível"
      const fuelCat = categories.find(c => c.name.toLowerCase().includes('combust') || c.name.toLowerCase().includes('transp'))?.id;

      await api.post('/api/v1/transactions', {
        type: 'EXPENSE',
        classification: 'FUEL',
        description: description || 'Abastecimento',
        amount: Number(amountCents) / 100,
        date,
        accountId,
        categoryId: fuelCat,
        vehicleId,
        currentKm: Number(odometer.replace(/\D/g, '')),
        liters: Number(litersNum.replace(/\D/g, '')) / 1000,
        fuelType,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar abastecimento.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: string) => {
    return (Number(val) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDecimal = (val: string, divisor = 1000) => {
    return (Number(val) / divisor).toLocaleString('pt-BR', { minimumFractionDigits: divisor === 1000 ? 3 : 0 });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Fuel className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold font-display">Novo Abastecimento</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-smooth">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Valor Total</label>
              <input
                required
                type="text"
                inputMode="numeric"
                value={formatCurrency(amountCents)}
                onChange={(e) => setAmountCents(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} font-bold text-rose-500 text-lg`}
              />
            </div>

            <div>
              <label className={labelCls}>Data</label>
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Conta</label>
              <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Veículo</label>
              <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputCls}>
                <option value="">Selecione o veículo...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Combustível</label>
              <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className={inputCls}>
                <option value="GASOLINA_COMUM">Gasolina Comum</option>
                <option value="GASOLINA_ADITIVADA">Gasolina Aditivada</option>
                <option value="ETANOL">Etanol</option>
                <option value="DIESEL">Diesel</option>
                <option value="GNV">GNV</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Odômetro (km)</label>
              <input
                type="text"
                inputMode="numeric"
                value={odometer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 45.000"
                className={inputCls}
              />
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Litros</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatDecimal(litersNum)}
                  onChange={(e) => setLitersNum(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 40,000"
                  className={inputCls}
                />
                {Number(litersNum) > 0 && Number(amountCents) > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">
                    {formatCurrency(String(Math.round(Number(amountCents) / (Number(litersNum) / 1000))))}/L
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-smooth">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !vehicleId || !accountId || Number(amountCents) <= 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-smooth disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Abastecimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
