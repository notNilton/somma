import { useState, useEffect } from 'react';
import { X, Loader2, CarFront, Hash, Calendar, Fuel } from 'lucide-react';
import { api } from '../lib/api';
import { SUPPORTED_BRANDS, getBrandIcon } from '../lib/vehicle-brands';

interface Vehicle {
  id: string;
  name: string;
  licensePlate?: string;
  brand?: string;
  model?: string;
  year?: number;
  tank?: number;
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  initialData?: Vehicle | null;
}

export function VehicleModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'create',
  initialData,
}: VehicleModalProps) {
  const isEditing = mode === 'edit';
  const [name, setName] = useState(initialData?.name ?? '');
  const [licensePlate, setLicensePlate] = useState(initialData?.licensePlate ?? '');
  const [brand, setBrand] = useState(initialData?.brand ?? '');
  const [model, setModel] = useState(initialData?.model ?? '');
  const [year, setYear] = useState(initialData?.year?.toString() ?? '');
  const [tank, setTank] = useState(initialData?.tank?.toString() ?? '50');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with initialData when it changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? '');
      setLicensePlate(initialData?.licensePlate ?? '');
      setBrand(initialData?.brand ?? '');
      setModel(initialData?.model ?? '');
      setYear(initialData?.year?.toString() ?? '');
      setTank(initialData?.tank?.toString() ?? '50');
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        licensePlate: licensePlate || undefined,
        brand: brand || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        tank: tank ? Number(tank) : 50,
      };

      if (isEditing && initialData) {
        await api.patch(`/api/v1/vehicles/${initialData.id}`, payload);
      } else {
        await api.post('/api/v1/vehicles', payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar veículo.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight">
              {isEditing ? 'Editar Veículo' : 'Novo Veículo'}
            </h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
              Gerenciamento de frota e consumo
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
          <div className="grid grid-cols-2 gap-4">
            {/* Name/Nick */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Nome / Apelido do Veículo
              </label>
              <div className="relative">
                <CarFront className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Meu Corolla, Moto Entrega"
                  className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
                />
              </div>
            </div>

            {/* License Plate */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Placa
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth uppercase font-mono"
                />
              </div>
            </div>

            {/* Tank Capacity */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Capacidade do Tanque (L)
              </label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  required
                  type="number"
                  step="0.1"
                  value={tank}
                  onChange={(e) => setTank(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
                />
              </div>
            </div>

            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-2">
                Marca
                {brand && <img src={getBrandIcon(brand)} className="w-3 h-3 grayscale" alt="" />}
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth appearance-none"
              >
                <option value="">Outra / Não informada</option>
                {SUPPORTED_BRANDS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Modelo
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: Corolla XEI"
                className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
              />
            </div>

            {/* Year */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Ano
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Ex: 2022"
                  className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
                />
              </div>
            </div>
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
              disabled={isLoading}
              className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 transition-smooth"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
