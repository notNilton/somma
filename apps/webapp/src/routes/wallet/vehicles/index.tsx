import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Fuel, Car, Gauge, Loader2, BarChart3, Wrench, Plus, Edit2, Trash2 } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import PrivacyAmount from '../../../components/PrivacyAmount';
import Fab from '../../../components/Fab';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import WalletShell from '../../../components/WalletShell';
import { SectionEmptyState, SectionLoadingState } from '../../../components/SectionFeedback';
import SectionPageHeader from '../../../components/SectionPageHeader';
import { api } from '../../../lib/api';
import type { Vehicle, RefuelingLog, VehicleExpenseStats, VehicleMaintenanceLog } from './-types';

export const Route = createFileRoute('/wallet/vehicles/')({
  component: VehiclesPage,
});

function FuelCharts({ data }: { data: RefuelingLog[] }) {
  const detailedData = [...data]
    .reverse()
    .map((log, index, array) => {
      const nextLog = array[index + 1];
      if (!nextLog) return null;
      const kmDiff = Number(nextLog.currentKm) - Number(log.currentKm);
      if (kmDiff <= 0) return null;
      return {
        date: new Date(nextLog.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        }),
        consumo: Number((kmDiff / Number(nextLog.liters)).toFixed(2)),
        gasto: Number((Number(nextLog.pricePerLiter) * Number(nextLog.liters)).toFixed(2)),
      };
    })
    .filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card-premium p-4 h-[260px] flex flex-col gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Consumo Médio (km/L)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={detailedData}>
            <defs>
              <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              fontSize={10}
              fontWeight="bold"
              tickLine={false}
              axisLine={false}
            />
            <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="consumo"
              stroke="var(--primary)"
              fillOpacity={1}
              fill="url(#colorConsumo)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="card-premium p-4 h-[260px] flex flex-col gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Gasto por Abastecimento (R$)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={detailedData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              fontSize={10}
              fontWeight="bold"
              tickLine={false}
              axisLine={false}
            />
            <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="gasto" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VehiclesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/wallet/vehicles/' });
  const [subTab, setSubTab] = useState<'fuelHistory' | 'maintenanceHistory' | 'charts'>(
    'fuelHistory',
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  const activeVehicleId = selectedVehicleId ?? vehicles[0]?.id ?? null;
  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) ?? null;

  const { data: refuelings = [], isLoading: refuelingsLoading } = useQuery({
    queryKey: ['vehicle-refuelings', activeVehicleId],
    queryFn: () => api.get<RefuelingLog[]>(`/api/v1/vehicles/${activeVehicleId}/refuelings`),
    enabled: !!activeVehicleId,
    staleTime: 1000 * 60,
  });

  const { data: maintenances = [], isLoading: maintenancesLoading } = useQuery({
    queryKey: ['vehicle-maintenances', activeVehicleId],
    queryFn: () => api.get<VehicleMaintenanceLog[]>(`/api/v1/vehicles/${activeVehicleId}/maintenances`),
    enabled: !!activeVehicleId,
    staleTime: 1000 * 60,
  });

  const { data: vehicleStats } = useQuery({
    queryKey: ['vehicle-stats', activeVehicleId],
    queryFn: () => api.get<VehicleExpenseStats>(`/api/v1/vehicles/${activeVehicleId}/expenses-stats`),
    enabled: !!activeVehicleId,
    staleTime: 1000 * 60,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSelectedVehicleId(null);
      setConfirmDeleteOpen(false);
    },
  });

  const handleCreate = () => void navigate({ to: '/wallet/vehicles/crud-vehicles' });
  const handleEdit = () =>
    activeVehicleId &&
    void navigate({ to: '/wallet/vehicles/crud-vehicles', search: { vehicleId: activeVehicleId } });

  const filteredMaintenances = maintenances;

  const activeVehicleLabel = activeVehicle
    ? (activeVehicle.name || [activeVehicle.brand, activeVehicle.model].filter(Boolean).join(' ') || '—')
    : '—';

  if (vehiclesLoading) {
    return (
      <WalletShell contentClassName="flex-1 justify-center">
        <SectionLoadingState message="Carregando veículos..." />
      </WalletShell>
    );
  }

  if (vehicles.length === 0) {
    return (
      <WalletShell>
        <SectionPageHeader
          title="Veículos"
          description="Acompanhe abastecimentos, manutenções e indicadores da sua frota."
          actions={
            <button
              type="button"
              onClick={handleCreate}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Veículo
            </button>
          }
        />
        <SectionEmptyState
          icon={Car}
          title="Nenhum veículo cadastrado"
          description="Adicione um veículo para ver o histórico de abastecimentos e manutenções."
          action={
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Veículo
            </button>
          }
        />
        <Fab label="Novo veículo" onClick={handleCreate} />
      </WalletShell>
    );
  }

  return (
    <WalletShell>
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        title="Remover veículo"
        description={`Tem certeza que deseja remover "${activeVehicleLabel}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        variant="danger"
        onConfirm={() => activeVehicleId && deleteMutation.mutate(activeVehicleId)}
        isLoading={deleteMutation.isPending}
      />

      <SectionPageHeader
        title="Veículos"
        description="Acompanhe abastecimentos, manutenções e indicadores da sua frota."
        actions={<div className="flex items-center gap-2">
          {activeVehicle && (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-smooth"
                title="Editar veículo"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="p-2.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-smooth"
                title="Remover veículo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleCreate}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Veículo
          </button>
        </div>}
      />

      {/* Seletor de veículo */}
      {vehicles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedVehicleId(v.id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-bold border transition-smooth ${
                v.id === activeVehicleId
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {v.name || [v.brand, v.model].filter(Boolean).join(' ')}
            </button>
          ))}
        </div>
      )}

      {/* Stats do veículo */}
      <div className="card-premium p-3 sm:p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold">{activeVehicleLabel}</p>
            {activeVehicle?.licensePlate && (
              <p className="text-[10px] font-mono text-muted-foreground">
                {activeVehicle.licensePlate}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border pt-3">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Odômetro
            </p>
            <p className="text-sm font-bold">
              {refuelings[0] ? Number(refuelings[0].currentKm).toLocaleString('pt-BR') : '—'}
              <span className="text-[9px] ml-0.5 opacity-50">km</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Abastecimentos
            </p>
            {vehicleStats ? (
              <PrivacyAmount value={vehicleStats.totalFuel} className="text-sm font-bold" />
            ) : (
              <span className="text-sm font-bold">—</span>
            )}
          </div>
          <div className="text-center sm:border-l sm:border-border sm:pl-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Manutenções
            </p>
            {vehicleStats ? (
              <PrivacyAmount value={vehicleStats.totalMaintenance} className="text-sm font-bold" />
            ) : (
              <span className="text-sm font-bold">—</span>
            )}
          </div>
          <div className="text-center sm:border-l sm:border-border sm:pl-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Total Gastos
            </p>
            {vehicleStats ? (
              <PrivacyAmount value={vehicleStats.total} className="text-sm font-bold" />
            ) : (
              <span className="text-sm font-bold">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        {(
          [
            { key: 'fuelHistory', label: 'Abastecimentos', icon: Fuel },
            { key: 'maintenanceHistory', label: 'Manutenções', icon: Wrench },
            { key: 'charts', label: 'Gráficos', icon: BarChart3 },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSubTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-smooth ${
              subTab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted-foreground/5'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === 'charts' ? (
        <FuelCharts data={refuelings} />
      ) : subTab === 'fuelHistory' ? (
        <div className="card-premium overflow-hidden">
          {refuelingsLoading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </div>
          ) : refuelings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Fuel className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Nenhum abastecimento encontrado.</p>
            </div>
          ) : (
            refuelings.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 px-4 py-3.5 min-h-[60px] border-b border-border last:border-b-0 hover:bg-muted/20 transition-smooth"
              >
                <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Fuel className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">
                      {h.station || 'Posto não informado'}
                    </span>
                    <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border">
                      {h.fuelType?.replace('_', ' ') ?? 'Combustível'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Gauge className="w-3 h-3" />
                      {Number(h.currentKm).toLocaleString('pt-BR')} km
                    </span>
                    <span className="text-[10px] text-primary font-bold">
                      {Number(h.liters).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      R${' '}
                      {Number(h.pricePerLiter).toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                      })}
                      /L
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <PrivacyAmount
                    value={Number(h.pricePerLiter) * Number(h.liters)}
                    className="text-sm font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          {maintenancesLoading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredMaintenances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Wrench className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Nenhuma manutenção encontrada.</p>
            </div>
          ) : (
            filteredMaintenances.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 px-4 py-3.5 min-h-[60px] border-b border-border last:border-b-0 hover:bg-muted/20 transition-smooth"
              >
                <div className="w-9 h-9 shrink-0 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{h.maintenanceType.replace('_', ' ')}</span>
                  {h.provider && (
                    <p className="text-[11px] text-muted-foreground truncate">{h.provider}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Fab label="Novo veículo" onClick={handleCreate} />
    </WalletShell>
  );
}
