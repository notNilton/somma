import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, CarFront, Hash, Calendar, Fuel } from 'lucide-react';
import { api } from '../../lib/api';
import { SUPPORTED_BRANDS, getBrandIcon } from '../../lib/vehicle-brands';

export const Route = createFileRoute('/vehicles/crud-vehicles')({
  validateSearch: (search: Record<string, unknown>) => ({
    vehicleId: typeof search.vehicleId === 'string' ? search.vehicleId : undefined,
  }),
  component: CrudVehiclesPage,
});

function CrudVehiclesPage() {
  const navigate = useNavigate({ from: '/vehicles/crud-vehicles' });
  const { vehicleId } = Route.useSearch();
  const isEditing = !!vehicleId;

  const { data: initialData, isLoading: loadingInitial } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () =>
      api.get<{
        id: string;
        name: string;
        nickname?: string;
        licensePlate?: string;
        brand?: string;
        model?: string;
        year?: number;
        tank?: number;
      }>(`/api/v1/vehicles/${vehicleId}`),
    enabled: isEditing,
  });

  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [tank, setTank] = useState('50');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.nickname ?? initialData.name ?? '');
      setLicensePlate(initialData.licensePlate ?? '');
      setBrand(initialData.brand ?? '');
      setModel(initialData.model ?? '');
      setYear(initialData.year?.toString() ?? '');
      setTank(initialData.tank?.toString() ?? '50');
    }
  }, [initialData]);

  const handleCancel = () => void navigate({ to: '/vehicles/' });

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

      if (isEditing && vehicleId) {
        await api.patch(`/api/v1/vehicles/${vehicleId}`, payload);
      } else {
        await api.post('/api/v1/vehicles', payload);
      }

      void navigate({ to: '/vehicles/' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar veículo.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && loadingInitial) {
    return (
      <div className="flex items-center justify-center py-24 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-smooth"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">
              {isEditing ? 'Editar Veículo' : 'Novo Veículo'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:block">
              Gerenciamento de frota e consumo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="hidden sm:flex px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="vehicle-form"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 transition-smooth"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Salvar Veículo</span>
                <span className="sm:hidden">Salvar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form */}
      <form id="vehicle-form" onSubmit={handleSubmit} className="card-premium p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
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

          {/* Tank */}
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
          <div className="col-span-2 sm:col-span-1">
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
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
