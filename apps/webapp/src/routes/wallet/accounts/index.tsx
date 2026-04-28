import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PrivacyAmount from '../../../components/PrivacyAmount';
import Fab from '../../../components/Fab';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import WalletShell from '../../../components/WalletShell';
import { SectionLoadingState } from '../../../components/SectionFeedback';
import { VehicleModal } from '../../../components/VehicleModal';
import {
  Plus,
  Wallet,
  Building,
  PiggyBank,
  Banknote,
  Edit2,
  Trash2,
  Loader2,
  CarFront,
  History,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { SUPPORTED_BRANDS, getBrandIcon } from '../../../lib/vehicle-brands';

export const Route = createFileRoute('/wallet/accounts/')({
  component: AccountsPage,
});

interface CreditSummaryItem {
  id: string;
  name: string;
  creditLimit: number;
  usedAmount: number;
  availableAmount: number;
}

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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

export interface Account {
  id: string;
  name: string;
  balance: number | string;
  creditLimit?: number | string | null;
  closingDay?: number | null;
  dueDay?: number | null;
  type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'WALLET' | 'INVESTMENT';
  color: string;
  icon: string;
  ownership?: string;
  bankName?: string;
  cpf?: string;
  cnpj?: string;
  hasDebit?: boolean;
  hasPix?: boolean;
  hasCredit?: boolean;
  includeInTotal?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Corrente',
  SAVINGS: 'Poupança',
  CASH: 'Dinheiro',
  WALLET: 'Carteira',
  INVESTMENT: 'Invest.',
};

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  Building,
  PiggyBank,
  Banknote,
};

function AccountInternalSummary({
  account,
  creditSummary,
}: {
  account: Account;
  creditSummary?: CreditSummaryItem;
}) {
  const limit = Number(creditSummary?.creditLimit ?? account.creditLimit ?? 0);
  const used = Number(creditSummary?.usedAmount ?? 0);
  const balance = Number(account.balance ?? 0);
  const hasCredit = limit > 0;
  const available = hasCredit ? Number(creditSummary?.availableAmount ?? Math.max(0, limit - used)) : balance;

  return (
    <div className="mt-3 border-t border-slate-300/70 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
            Cartão interno
          </p>
          <p className="text-xs font-bold text-slate-900">{account.name}</p>
          {account.bankName ? <p className="text-[10px] text-slate-500">{account.bankName}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
            {hasCredit ? 'Disponível' : 'Saldo'}
          </p>
          <PrivacyAmount value={available} className={`text-sm font-bold ${hasCredit ? 'text-emerald-700' : 'text-slate-900'}`} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>{hasCredit ? 'Fluxo do limite' : 'Participação no patrimônio'}</span>
        <span>{hasCredit ? 'Limite ativo' : 'Saldo atual'}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
        <div className="rounded-none border border-slate-300/70 bg-white/70 px-2 py-1.5">
          <span className="block uppercase tracking-[0.3em]">{hasCredit ? 'Usado' : 'Saldo'}</span>
          <span className="block text-sm font-bold text-slate-900">
            <PrivacyAmount value={hasCredit ? used : balance} />
          </span>
        </div>
        <div className="rounded-none border border-slate-300/70 bg-white/70 px-2 py-1.5">
          <span className="block uppercase tracking-[0.3em]">{hasCredit ? 'Limite' : 'Total'}</span>
          <span className="block text-sm font-bold text-slate-900">
            <PrivacyAmount value={hasCredit ? limit : balance} />
          </span>
        </div>
      </div>
    </div>
  );
}

function AccountCard({
  account,
  creditSummary,
  onEdit,
  onDelete,
}: {
  account: Account;
  creditSummary?: CreditSummaryItem;
  onEdit: (a: Account) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = ICON_MAP[account.icon] ?? Wallet;
  const creditLimitValue = Number(creditSummary?.creditLimit ?? account.creditLimit ?? 0);
  const hasCredit = creditLimitValue > 0;

  return (
    <div
      onClick={() => onEdit(account)}
      className={`card-premium wallet-panel-surface p-4 group relative flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition-smooth h-full ${
        hasCredit ? 'min-h-[15rem] sm:min-h-[16rem]' : 'min-h-[8rem] sm:min-h-[9rem]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-lg border shrink-0"
            style={{
              backgroundColor: `${account.color}15`,
              color: account.color,
              borderColor: `${account.color}30`,
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">{account.name}</p>
            {account.bankName && (
              <p className="text-[10px] text-slate-500 leading-tight">
                {account.bankName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="wallet-chip text-[9px] font-bold uppercase tracking-[0.3em] px-1.5 py-0.5 rounded">
            {TYPE_LABELS[account.type] ?? account.type}
          </span>
          {/* Ações: sempre visíveis no mobile, hover no desktop */}
          <div className="flex gap-0.5 ml-1 sm:opacity-0 sm:group-hover:opacity-100 transition-smooth">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(account);
              }}
              className="p-1.5 rounded-md hover:bg-sky-500/10 text-slate-500 hover:text-sky-700 transition-smooth"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(account.id);
              }}
              className="p-1.5 rounded-md hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 transition-smooth"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Saldo</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold font-display tracking-tight text-slate-900 leading-none">
              <PrivacyAmount value={Number(account.balance)} />
            </p>
            <div className="flex items-center gap-1">
              <span
                className={`min-w-[2.25rem] text-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 border border-sky-500/20 ${(
                  account.hasDebit ?? true
                ) ? '' : 'invisible'}`}
              >
                Déb
              </span>
              <span
                className={`min-w-[2.25rem] text-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 border border-sky-500/20 ${(
                  account.hasPix ?? true
                ) ? '' : 'invisible'}`}
              >
                PIX
              </span>
              <span
                className={`min-w-[2.25rem] text-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-700 border border-slate-400/20 ${hasCredit ? '' : 'invisible'}`}
              >
                Cred
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasCredit ? <AccountInternalSummary account={account} creditSummary={creditSummary} /> : null}
    </div>
  );
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
    staleTime: 1000 * 60 * 5,
  });
  const { data: refuelings = [], isLoading: refuelingsLoading } = useQuery({
    queryKey: ['vehicle-refuelings', vehicle.id],
    queryFn: () => api.get<RefuelingLog[]>(`/api/v1/vehicles/${vehicle.id}/refuelings`),
    staleTime: 1000 * 60,
  });

  return (
    <div className="card-premium wallet-panel-surface p-3 group flex flex-col gap-3 relative overflow-hidden">
      <div className="relative flex justify-between items-start gap-3">
        <div className="flex gap-2.5 items-center min-w-0">
          <div className="w-10 h-10 rounded-none bg-white/70 flex items-center justify-center border border-slate-300/70 relative overflow-hidden p-2 shrink-0">
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
            <CarFront className={`w-5 h-5 text-slate-500 ${vehicle.brand ? 'hidden' : ''}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm tracking-tight text-slate-900 truncate">
              {vehicle.name}
            </h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.25em] truncate">
              {SUPPORTED_BRANDS.find((b) => b.id === vehicle.brand)?.name ?? vehicle.brand ?? 'Outra'}
              {vehicle.model ? ` · ${vehicle.model}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1">
            {vehicle.licensePlate && (
              <div className="px-2 py-0.5 rounded-none border border-slate-300/70 bg-white/70">
                <span className="font-mono font-bold text-[10px] tracking-widest text-slate-700">
                  {vehicle.licensePlate}
                </span>
              </div>
            )}
            <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex gap-1 transition-smooth">
              <button
                onClick={() => onEdit(vehicle)}
                className="p-1.5 rounded-none hover:bg-sky-500/10 text-slate-500 hover:text-sky-700 transition-smooth"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(vehicle.id)}
                className="p-1.5 rounded-none hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 transition-smooth"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-300/70 pt-3">
        <div className="rounded-none border border-slate-300/70 bg-white/70 px-2.5 py-2">
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-500">Km atual</p>
          <p className="text-sm font-bold text-slate-900">
            {refuelings[0] ? Number(refuelings[0].currentKm).toLocaleString('pt-BR') : '—'}
            <span className="text-[9px] ml-0.5 opacity-50">km</span>
          </p>
        </div>
        <div className="rounded-none border border-slate-300/70 bg-white/70 px-2.5 py-2">
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-500">Combustível</p>
          <p className="text-sm font-bold text-slate-900">
            {isLoading ? '...' : `R$ ${(stats?.totalFuel ?? 0).toFixed(2)}`}
          </p>
        </div>
        <div className="rounded-none border border-slate-300/70 bg-white/70 px-2.5 py-2">
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-500">Total gasto</p>
          <p className="text-sm font-bold text-sky-700">
            {isLoading ? '...' : `R$ ${(stats?.total ?? 0).toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="border border-slate-300/70 overflow-hidden">
        {refuelingsLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando histórico...</span>
          </div>
        ) : refuelings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-500">
            <History className="w-7 h-7" />
            <p className="text-sm">Nenhum abastecimento encontrado.</p>
          </div>
        ) : (
          refuelings.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-300/60 last:border-b-0 hover:bg-slate-100/70 transition-smooth"
            >
              <div className="w-7 h-7 shrink-0 rounded-none bg-sky-700/10 text-sky-700 border border-sky-700/20 flex items-center justify-center">
                <CarFront className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">
                  {item.station || 'Posto não informado'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {item.fuelType?.replace('_', ' ') ?? 'Combustível'} ·{' '}
                  {Number(item.currentKm).toLocaleString('pt-BR')} km ·{' '}
                  {Number(item.liters).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })} L
                </p>
              </div>
              <div className="text-right shrink-0">
                <PrivacyAmount
                  value={Number(item.pricePerLiter) * Number(item.liters)}
                  className="text-sm font-bold text-sky-700"
                />
                <p className="text-[10px] text-slate-500">
                  {fmtDate(item.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AccountsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/wallet/accounts/' });
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<'create' | 'edit'>('create');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [confirmVehicleDeleteOpen, setConfirmVehicleDeleteOpen] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/api/v1/accounts'),
  });

  const { data: creditSummary } = useQuery({
    queryKey: ['accounts', 'credit-summary'],
    queryFn: () => api.get<CreditSummaryItem[]>('/api/v1/accounts/credit-summary'),
  });
  const creditSummaryByAccountId = (creditSummary ?? []).reduce<Record<string, CreditSummaryItem>>(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {},
  );
  const sortedAccounts = [...accounts].sort((a, b) => {
    const aHasCredit = Number(creditSummaryByAccountId[a.id]?.creditLimit ?? a.creditLimit ?? 0) > 0;
    const bHasCredit = Number(creditSummaryByAccountId[b.id]?.creditLimit ?? b.creditLimit ?? 0) > 0;
    if (aHasCredit === bHasCredit) return 0;
    return aHasCredit ? -1 : 1;
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/api/v1/vehicles'),
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSelectedVehicle(null);
      setConfirmVehicleDeleteOpen(false);
    },
  });

  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance ?? 0), 0);
  const includedInTotalCount = accounts.filter((account) => account.includeInTotal !== false).length;
  const totalCreditLimit = creditSummary?.reduce((sum, item) => sum + Number(item.creditLimit ?? 0), 0) ?? 0;
  const totalCreditUsed = creditSummary?.reduce((sum, item) => sum + Number(item.usedAmount ?? 0), 0) ?? 0;
  const totalCreditAvailable = creditSummary?.reduce((sum, item) => sum + Number(item.availableAmount ?? 0), 0) ?? 0;
  const hasCreditSummary = totalCreditLimit > 0;
  const vehicleCount = vehicles.length;

  const handleCreate = () =>
    void navigate({ to: '/wallet/accounts/crud-accounts', search: { accountId: undefined } });

  const handleCreateVehicle = () => {
    setVehicleModalMode('create');
    setSelectedVehicle(null);
    setIsVehicleModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleModalMode('edit');
    setSelectedVehicle(vehicle);
    setIsVehicleModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta conta? As transações vinculadas serão mantidas.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteVehicle = (id: string) => {
    setSelectedVehicle(vehicles.find((vehicle) => vehicle.id === id) ?? null);
    setConfirmVehicleDeleteOpen(true);
  };

  return (
    <WalletShell contentClassName="wallet-starfield">
      {isLoading ? (
        <SectionLoadingState message="Carregando contas..." />
      ) : (
        <>
          {/* Resumo */}
          <div className="card-premium wallet-panel-surface p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Patrimônio total
                </p>
                <PrivacyAmount
                  value={totalBalance}
                  className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900"
                />
              </div>
              <button
                onClick={handleCreate}
                className="wallet-sci-button hidden sm:flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold hover:scale-[1.02] active:scale-95 transition-smooth shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova conta
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500">
              <span>
                {accounts.length} conta{accounts.length === 1 ? '' : 's'} carregada
                {accounts.length === 1 ? '' : 's'}
              </span>
              <span>
                {includedInTotalCount} conta{includedInTotalCount === 1 ? '' : 's'} entram no
                patrimônio
              </span>
            </div>
            {hasCreditSummary && (
              <div className="grid grid-cols-3 gap-2 border-t border-slate-300/70 pt-3 mt-3">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-0.5">
                    Limite
                  </p>
                  <PrivacyAmount value={totalCreditLimit} className="text-sm font-bold text-sky-700 block" />
                </div>
                <div className="text-center border-x border-slate-300/70">
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-0.5">
                    Usado
                  </p>
                  <PrivacyAmount value={totalCreditUsed} className="text-sm font-bold text-slate-700 block" />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-0.5">
                    Disponível
                  </p>
                  <PrivacyAmount value={totalCreditAvailable} className="text-sm font-bold text-emerald-700 block" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                creditSummary={creditSummaryByAccountId[account.id]}
                onEdit={(a) =>
                  void navigate({ to: '/wallet/accounts/crud-accounts', search: { accountId: a.id } })
                }
                onDelete={handleDelete}
              />
            ))}
          </div>

          <div className="card-premium wallet-panel-surface p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500">
                  Veículos
                </p>
                <p className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900">
                  {vehicleCount}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateVehicle}
                className="wallet-sci-button hidden sm:flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold hover:scale-[1.02] active:scale-95 transition-smooth shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo veículo
              </button>
            </div>

            {vehiclesLoading ? (
              <div className="flex items-center gap-2 py-4 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando veículos...</span>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="rounded-none border border-dashed border-slate-300/80 bg-white/50 px-3 py-4 text-sm text-slate-500">
                Adicione um veículo para ver abastecimentos, consumo e histórico nesta mesma página.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onEdit={handleEditVehicle}
                    onDelete={handleDeleteVehicle}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* FAB mobile */}
      <Fab label="Nova conta" onClick={handleCreate} />

      <VehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['vehicles'] })}
        mode={vehicleModalMode}
        initialData={selectedVehicle}
      />

      <ConfirmDialog
        isOpen={confirmVehicleDeleteOpen}
        onCancel={() => setConfirmVehicleDeleteOpen(false)}
        title="Remover veículo"
        description={`Tem certeza que deseja remover "${selectedVehicle?.name ?? 'este veículo'}"? Essa ação não pode ser desfeita.`}
        confirmText="Remover"
        variant="danger"
        onConfirm={() => selectedVehicle && deleteVehicleMutation.mutate(selectedVehicle.id)}
        isLoading={deleteVehicleMutation.isPending}
      />
    </WalletShell>
  );
}
