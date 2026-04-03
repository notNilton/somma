import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import PrivacyAmount from '../../components/PrivacyAmount';
import {
  ArrowRight,
  Plus,
  Trash2,
  ArrowLeftRight,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';

export const Route = createFileRoute('/transfers/')({
  component: TransfersPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  balance: number;
}

interface Transfer {
  id: string;
  description?: string;
  amount: number;
  date: string;
  fromAccountId: string;
  toAccountId: string;
  fromAccount?: { name: string };
  toAccount?: { name: string };
}

interface CreateTransferDto {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all';
const labelCls =
  'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none transition-all hover:border-primary/40"
      >
        <span className={selected ? 'text-foreground font-medium' : 'text-muted-foreground'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all hover:bg-muted/60 font-bold ${value === opt.value ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────

function TransferModal({
  accounts,
  onClose,
  onSuccess,
}: {
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('0');
  const [date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (cents: string) =>
    (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isDisabled =
    !fromAccountId || !toAccountId || fromAccountId === toAccountId || Number(amount) <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const dto: CreateTransferDto = {
        fromAccountId,
        toAccountId,
        amount: Number(amount) / 100,
        date,
        description: description.trim() || undefined,
      };
      await api.createTransfer(dto);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar transferência.');
    } finally {
      setIsLoading(false);
    }
  };

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold font-display">Nova Transferência</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-smooth text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          id="transfer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-4"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Origin → Destination visual */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Origem</label>
              <CustomSelect
                value={fromAccountId}
                onChange={setFromAccountId}
                options={accountOptions}
                placeholder="Selecione..."
              />
            </div>
            <div className="mt-5 p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Destino</label>
              <CustomSelect
                value={toAccountId}
                onChange={setToAccountId}
                options={accountOptions.filter((a) => a.value !== fromAccountId)}
                placeholder="Selecione..."
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Valor</label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={fmt(amount)}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              className={`${inputCls} font-bold text-primary text-lg`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-1">
                <label className={labelCls}>Data</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Descrição (opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Reserva"
                  className={inputCls}
                />
              </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-smooth"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="transfer-form"
            disabled={isLoading || isDisabled}
            className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-smooth flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
            Confirmar Transferência
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Row ─────────────────────────────────────────────────────────────

function TransferRow({
  transfer,
  onDelete,
}: {
  transfer: Transfer;
  onDelete: (id: string) => void;
}) {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="flex items-center justify-between px-4 py-4 min-h-[64px] hover:bg-muted/20 transition-smooth group cursor-default border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ArrowLeftRight className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight truncate">
            {transfer.fromAccount?.name ?? '—'} <span className="text-muted-foreground mx-1">→</span> {transfer.toAccount?.name ?? '—'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {transfer.description
              ? `${transfer.description} · ${fmtDate(transfer.date)}`
              : fmtDate(transfer.date)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <PrivacyAmount
          value={Number(transfer.amount)}
          className="text-sm font-bold text-primary"
        />
        <button
          onClick={() => onDelete(transfer.id)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-smooth"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TransfersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.listTransfers<Transfer[]>(),
    staleTime: 1000 * 60,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/api/v1/accounts'),
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta transferência? Os saldos das contas serão revertidos.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSuccess = () => {
    setShowModal(false);
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Group transfers by month
  const grouped = transfers.reduce<Record<string, Transfer[]>>((acc, t) => {
    const key = t.date.slice(0, 7); // YYYY-MM
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Transferências</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Transferência
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs">Carregando transferências...</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="card-premium flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground">
            <ArrowLeftRight className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">Nenhuma transferência ainda</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-bold text-primary hover:underline"
          >
            + Criar primeira
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedMonths.map((month) => {
            const [year, mon] = month.split('-');
            const monDate = new Date(parseInt(year), parseInt(mon) - 1, 1);
            const label = monDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            const monthTotal = grouped[month].reduce((s, t) => s + Number(t.amount), 0);

            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground capitalize">
                    {label}
                  </p>
                  <PrivacyAmount
                    value={monthTotal}
                    className="text-[10px] font-bold text-muted-foreground"
                  />
                </div>
                <div className="card-premium overflow-hidden">
                  {grouped[month].map((t) => (
                    <TransferRow key={t.id} transfer={t} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TransferModal
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
