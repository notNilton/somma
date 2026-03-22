import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fuel,
  Car,
  Gauge,
  Loader2,
  BarChart3,
  Wrench,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
} from 'lucide-react';
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
import PrivacyAmount from '../components/PrivacyAmount';
import { VehicleModal } from '../components/VehicleModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { api } from '../lib/api';
import type { Vehicle, RefuelingLog, VehicleStats, VehicleMaintenanceLog } from './_types';

export const Route = createFileRoute('/vehicles')({
  component: VehiclesPage,
});

function VehicleSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-smooth min-w-[180px]"
      >
        <span className="truncate">{selected?.label ?? 'Selecione'}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 z-50 bg-card border border-border rounded-2xl shadow-xl shadow-primary/10 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 p-1.5 ring-1 ring-black/5 min-w-full">
            {options.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-smooth group ${
                  value === opt.value ? 'bg-primary/5' : ''
                }`}
              >
                <div
                  className={`text-sm font-bold transition-smooth truncate ${
                    value === opt.value
                      ? 'text-primary'
                      : 'text-foreground group-hover:text-primary'
                  }`}
                >
                  {opt.label}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FuelCharts({ data }: { data: RefuelingLog[] }) {
  const detailedData = [...data]
    .reverse()
    .map((log, index, array) => {
      const nextLog = array[index + 1];
      if (!nextLog) return null;
      const kmDiff = Number(nextLog.odometer) - Number(log.odometer);
      if (kmDiff <= 0) return null;
      return {
        date: new Date(nextLog.transaction.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        }),
        consumo: Number((kmDiff / Number(nextLog.fuelLiters)).toFixed(2)),
        gasto: Math.abs(Number(nextLog.transaction.amount)),
        totalKm: Number(nextLog.odometer),
      };
    })
    .filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card-premium p-4 h-[280px] flex flex-col gap-3">
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

      <div className="card-premium p-4 h-[280px] flex flex-col gap-3">
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
  const [subTab, setSubTab] = useState<'fuelHistory' | 'maintenanceHistory' | 'charts'>(
    'fuelHistory',
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  const activeVehicleId = selectedVehicleId ?? vehicles[0]?.id ?? null;

  const { data: refuelings = [], isLoading: refuelingsLoading } = useQuery({
    queryKey: ['vehicle-refuelings', activeVehicleId],
    queryFn: () => api.get<RefuelingLog[]>(`/vehicles/${activeVehicleId}/refuelings`),
    enabled: !!activeVehicleId,
    staleTime: 1000 * 60,
  });

  const { data: maintenances = [], isLoading: maintenancesLoading } = useQuery({
    queryKey: ['vehicle-maintenances', activeVehicleId],
    queryFn: () => api.get<VehicleMaintenanceLog[]>(`/vehicles/${activeVehicleId}/maintenances`),
    enabled: !!activeVehicleId,
    staleTime: 1000 * 60,
  });

  const { data: vehicleStats } = useQuery({
    queryKey: ['vehicle-stats', activeVehicleId],
    queryFn: () => api.get<VehicleStats>(`/vehicles/${activeVehicleId}/stats`),
    enabled: !!activeVehicleId,
    staleTime: 1000 * 60,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSelectedVehicleId(null);
      setConfirmDeleteOpen(false);
    },
  });

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) ?? null;

  const handleCreate = () => {
    setEditingVehicle(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = () => {
    setEditingVehicle(activeVehicle);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const modalInitialData = editingVehicle
    ? {
        id: editingVehicle.id,
        name: editingVehicle.nickname ?? `${editingVehicle.brand} ${editingVehicle.model}`,
        licensePlate: editingVehicle.licensePlate,
        brand: editingVehicle.brand,
        model: editingVehicle.model,
      }
    : null;

  if (vehiclesLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Carregando veículos...</p>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Veículos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Histórico de abastecimentos, manutenções e gráficos por veículo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Veículo
          </button>
        </div>
        <div className="card-premium p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Car className="w-10 h-10 text-muted-foreground/40" />
          <p className="font-bold text-sm">Nenhum veículo cadastrado</p>
          <p className="text-xs text-muted-foreground max-w-[260px]">
            Adicione um veículo para ver o histórico de abastecimentos e manutenções.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Veículo
          </button>
        </div>
        <VehicleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          mode={modalMode}
          initialData={modalInitialData}
        />
      </div>
    );
  }

  const filteredMaintenances = maintenances.filter(
    (m) => m.transaction.category?.name === 'Veículo Manutenção',
  );

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Veículos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Histórico de abastecimentos, manutenções e gráficos por veículo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-sm font-semibold hover:bg-rose-50 transition-smooth text-rose-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Veículo
          </button>
        </div>
      </div>

      {/* Resumo + seletor de veículo + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Veículo em Análise
            </p>
            <VehicleSelect
              value={activeVehicleId ?? ''}
              onChange={setSelectedVehicleId}
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.nickname ?? `${v.brand} ${v.model}`}${v.licensePlate ? ` (${v.licensePlate})` : ''}`,
              }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Odômetro
            </p>
            <p className="font-bold text-sm">
              {refuelings[0] ? Number(refuelings[0].odometer).toLocaleString('pt-BR') : '—'}
              <span className="text-[10px] ml-1 opacity-50">km</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Consumo
            </p>
            <p className="font-bold text-sm">
              {vehicleStats?.avgConsumption.toFixed(1) ?? '—'}
              <span className="text-[10px] ml-1 opacity-50">km/L</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Gasto Médio
            </p>
            {vehicleStats ? (
              <PrivacyAmount value={vehicleStats.avgCost} className="font-bold text-sm" />
            ) : (
              <span className="font-bold text-sm">—</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Autonomia
            </p>
            <p className="font-bold text-sm">
              {vehicleStats?.autonomy ?? '—'}
              <span className="text-[10px] ml-1 opacity-50">km</span>
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(
              [
                { key: 'fuelHistory', label: 'Abast.', icon: Fuel },
                { key: 'maintenanceHistory', label: 'Manut.', icon: Wrench },
                { key: 'charts', label: 'Gráficos', icon: BarChart3 },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSubTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-smooth ${
                  subTab === t.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted-foreground/5'
                }`}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {subTab === 'charts' ? (
        <FuelCharts data={refuelings} />
      ) : subTab === 'fuelHistory' ? (
        <div className="card-premium overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {['Data', 'Posto / Combustível', 'Odômetro', 'Volume', 'Valor'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${i === 2 || i === 3 ? 'text-center' : ''} ${i === 4 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {refuelingsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Carregando...</p>
                    </div>
                  </td>
                </tr>
              ) : refuelings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <p className="text-xs text-muted-foreground">
                      Nenhum abastecimento encontrado.
                    </p>
                  </td>
                </tr>
              ) : (
                refuelings.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/20 transition-smooth group">
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(h.transaction.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {h.station || 'Posto não informado'}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {h.fuelType?.replace('_', ' ') ?? 'Combustível'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold border border-primary/10">
                        <Gauge className="w-2.5 h-2.5" />
                        {Number(h.odometer).toLocaleString('pt-BR')} km
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="text-sm font-bold text-primary">
                        {Number(h.fuelLiters).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        L
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        R${' '}
                        {Number(h.pricePerLiter).toLocaleString('pt-BR', {
                          minimumFractionDigits: 3,
                        })}
                        /L
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-sm">
                      <PrivacyAmount value={-Number(h.transaction.amount)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {['Data', 'Tipo / Descrição', 'Odômetro', 'Fornecedor', 'Valor'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${i === 2 ? 'text-center' : ''} ${i === 4 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {maintenancesLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Carregando...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMaintenances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <p className="text-xs text-muted-foreground">Nenhuma manutenção encontrada.</p>
                  </td>
                </tr>
              ) : (
                filteredMaintenances.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/20 transition-smooth group">
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(h.transaction.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {h.type.replace('_', ' ')}
                      </div>
                      {h.description && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {h.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {h.odometer != null ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-bold border border-border/50">
                          <Gauge className="w-2.5 h-2.5" />
                          {Number(h.odometer).toLocaleString('pt-BR')} km
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground">
                      {h.provider || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-sm">
                      <PrivacyAmount value={-Number(h.transaction.amount)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        mode={modalMode}
        initialData={modalInitialData}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        title="Remover veículo"
        description={`Tem certeza que deseja remover "${activeVehicle?.nickname ?? `${activeVehicle?.brand} ${activeVehicle?.model}`}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        variant="danger"
        onConfirm={() => activeVehicleId && deleteMutation.mutate(activeVehicleId)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
