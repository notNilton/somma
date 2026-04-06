import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarFront, Plus, History, Edit2, Trash2, Loader2 } from 'lucide-react';
import SettingsShell from '../../components/SettingsShell';
import { SectionLoadingState } from '../../components/SectionFeedback';
import SectionPageHeader from '../../components/SectionPageHeader';
import PrivacyAmount from '../../components/PrivacyAmount';
import { api } from '../../lib/api';
import { VehicleModal } from '../../components/VehicleModal';
import { SUPPORTED_BRANDS, getBrandIcon } from '../../lib/vehicle-brands';

export const Route = createFileRoute('/settings/vehicles')({
  component: VehiclesPage,
});

interface Vehicle {
  id: string;
  name: string;
  licensePlate?: string;
  brand?: string;
  model?: string;
  year?: number;
  tank?: number;
}

interface RefuelingLog {
  id: string;
  station?: string;
  fuelType: string;
  currentKm: number | string;
  liters: number | string;
  pricePerLiter: number | string;
  createdAt: string;
}

interface VehicleStats {
  totalFuel: number;
  totalMaintenance: number;
  total: number;
}

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  onEdit: (v: Vehicle) => void;
  onDelete: (id: string) => void;
}) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['vehicle-stats', vehicle.id],
    queryFn: () => api.get<VehicleStats>(`/api/v1/vehicles/${vehicle.id}/expenses-stats`),
  });

  return (
    <div className="card-premium p-6 group flex flex-col gap-6 relative overflow-hidden h-full">
      <div className="relative flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center border border-border relative overflow-hidden p-2.5">
            {vehicle.brand ? (
              <img
                src={getBrandIcon(vehicle.brand)}
                className="w-full h-full object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-smooth"
                alt={vehicle.brand}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <CarFront
              className={`w-6 h-6 text-muted-foreground ${vehicle.brand ? 'hidden' : ''}`}
            />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg tracking-tight">{vehicle.name}</h3>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-2">
              <span>
                {SUPPORTED_BRANDS.find((b) => b.id === vehicle.brand)?.name ?? vehicle.brand}
              </span>{' '}
              {vehicle.model && <span>• {vehicle.model}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {vehicle.licensePlate && (
            <div className="px-2.5 py-1 rounded border border-border bg-muted/20">
              <span className="font-mono font-bold text-[11px] tracking-widest">
                {vehicle.licensePlate}
              </span>
            </div>
          )}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-smooth">
            <button
              onClick={() => onEdit(vehicle)}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-smooth"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(vehicle.id)}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-smooth"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border mt-auto">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
            Combustível
          </p>
          <p className="font-bold">{isLoading ? '...' : `R$ ${(stats?.totalFuel ?? 0).toFixed(2)}`}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
            Total Gastos
          </p>
          <p className="font-bold text-primary">
            {isLoading ? '...' : `R$ ${(stats?.total ?? 0).toFixed(2)}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function VehiclesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
  });

  // Auto-select first vehicle for history
  const activeHistoryId = historyVehicleId ?? vehicles[0]?.id ?? null;

  const { data: refuelings = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['vehicle-refuelings', activeHistoryId],
    queryFn: () =>
      activeHistoryId ? api.get<RefuelingLog[]>(`/api/v1/vehicles/${activeHistoryId}/refuelings`) : [],
    enabled: !!activeHistoryId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const handleAdd = () => {
    setModalMode('create');
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setModalMode('edit');
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        'Tem certeza que deseja excluir este veículo? Totais de abastecimento serão mantidos mas o veículo não aparecerá mais.',
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <SettingsShell>
      <div className="flex flex-col gap-6 sm:gap-8">
      <SectionPageHeader
        title="Frota e Combustivel"
        description="Gerencie seus veículos e acompanhe o desempenho e custos de manutenção."
        backTo="/settings"
        actions={
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.02] transition-smooth active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Adicionar Veículo
          </button>
        }
      />

      {isLoading ? (
        <SectionLoadingState message="Carregando frota..." />
      ) : (
        <div className="flex flex-wrap gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="flex-1 min-w-[350px]">
              <VehicleCard vehicle={vehicle} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      {/* Refueling History Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <History className="w-4 h-4" />
            Histórico de Abastecimentos
          </h2>

          {vehicles.length > 0 && (
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setHistoryVehicleId(v.id)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-smooth ${
                    activeHistoryId === v.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Data
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Posto / Local
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Odômetro
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Qtd (L)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    R$ / Litro
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right border-l border-border/10">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isHistoryLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground text-sm"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Carregando histórico completo...
                    </td>
                  </tr>
                ) : !activeHistoryId ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground text-sm italic"
                    >
                      Selecione um veículo para ver os abastecimentos.
                    </td>
                  </tr>
                ) : refuelings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground text-sm italic"
                    >
                      Nenhum abastecimento registrado para este veículo.
                    </td>
                  </tr>
                ) : (
                  refuelings.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-smooth group">
                      <td className="px-6 py-4 text-xs font-semibold">
                        {new Date(log.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-xs">
                          {log.station || 'Posto não informado'}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                          {log.fuelType.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                        {Number(log.currentKm).toLocaleString('pt-BR')}{' '}
                        <span className="text-[9px] uppercase opacity-60">km</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-primary/80">
                        {Number(log.liters).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        <span className="text-[9px] uppercase opacity-60">L</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                        {Number(log.pricePerLiter).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right border-l border-border/10">
                        <PrivacyAmount
                          value={Number(log.pricePerLiter) * Number(log.liters)}
                          className="font-bold text-xs"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <VehicleModal
        key={selectedVehicle?.id ?? 'new'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['vehicles'] })}
        mode={modalMode}
        initialData={selectedVehicle}
      />
      </div>
    </SettingsShell>
  );
}
