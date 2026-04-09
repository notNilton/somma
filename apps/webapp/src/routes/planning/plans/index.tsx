import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Edit2,
  Loader2,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import PlanningShell from '../../../../components/PlanningShell';
import SectionPageHeader from '../../../../components/SectionPageHeader';
import { SectionEmptyState, SectionLoadingState } from '../../../../components/SectionFeedback';
import Fab from '../../../../components/Fab';
import { api } from '../../../../lib/api';
import { formatValue } from '../../../../lib/formatters';

export const Route = createFileRoute('/planning/plans/')({
  component: PlanningPlansPage,
});

interface PlanningPlanSummary {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
  notes?: string | null;
  color?: string | null;
  icon?: string | null;
  estimatedTotal: number;
  contributedTotal: number;
  remainingToContribute: number;
  itemCount: number;
  contributionCount: number;
  progressPercent: number;
}

const inputCls =
  'w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none transition-smooth focus:ring-2 focus:ring-primary/20';
const labelCls = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground';

function statusLabel(status: PlanningPlanSummary['status']) {
  if (status === 'PAUSED') return 'Pausado';
  if (status === 'COMPLETED') return 'Concluído';
  if (status === 'CANCELED') return 'Cancelado';
  return 'Ativo';
}

function statusClasses(status: PlanningPlanSummary['status']) {
  if (status === 'PAUSED') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (status === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (status === 'CANCELED') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
}

function formatDate(date?: string | null) {
  if (!date) return 'Sem data-alvo';
  return new Date(date).toLocaleDateString('pt-BR');
}

function PlanModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PlanningPlanSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [targetAmountCents, setTargetAmountCents] = useState(
    initial ? Math.round(initial.targetAmount * 100).toString() : '0',
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate?.slice(0, 10) ?? '');
  const [status, setStatus] = useState<PlanningPlanSummary['status']>(initial?.status ?? 'ACTIVE');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [color, setColor] = useState(initial?.color ?? '#f59e0b');
  const [icon, setIcon] = useState(initial?.icon ?? 'Planejamento');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const dto = {
        name: name.trim(),
        targetAmount: Number(targetAmountCents) / 100,
        targetDate: targetDate || undefined,
        status,
        notes: notes.trim() || undefined,
        color: color || undefined,
        icon: icon.trim() || undefined,
      };
      if (initial) {
        await api.updatePlan(initial.id, dto);
      } else {
        await api.createPlan(dto);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar planejamento.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display">
                {initial ? 'Editar planejamento' : 'Novo planejamento'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Defina o objetivo principal e quanto você quer reservar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-smooth hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
              {error}
            </div>
          ) : null}

          <div>
            <label className={labelCls}>Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem para São Paulo"
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Valor alvo</label>
              <input
                value={formatValue(Number(targetAmountCents) / 100)}
                onChange={(e) => setTargetAmountCents(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className={`${inputCls} font-bold text-primary`}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Data-alvo</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as PlanningPlanSummary['status'])} className={inputCls}>
                <option value="ACTIVE">Ativo</option>
                <option value="PAUSED">Pausado</option>
                <option value="COMPLETED">Concluído</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Cor</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className={`${inputCls} h-11 p-1`} />
            </div>
            <div>
              <label className={labelCls}>Ícone/Nome curto</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls} maxLength={30} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Quero dividir em hospedagem, passagem e presentes."
              className={`${inputCls} min-h-28 resize-none`}
            />
          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold transition-smooth hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || Number(targetAmountCents) <= 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-smooth disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Salvar' : 'Criar planejamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanningPlansPage() {
  const navigate = useNavigate({ from: '/planning/plans/' });
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PlanningPlanSummary | undefined>(undefined);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['planning', 'plans'],
    queryFn: () => api.listPlans<PlanningPlanSummary[]>(),
    staleTime: 1000 * 60,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planning'] }),
  });

  const handleSaved = () => {
    setShowModal(false);
    setEditing(undefined);
    void queryClient.invalidateQueries({ queryKey: ['planning'] });
  };

  const handleDelete = (plan: PlanningPlanSummary) => {
    if (!window.confirm(`Excluir o planejamento "${plan.name}"?`)) return;
    deleteMutation.mutate(plan.id);
  };

  return (
    <>
      <PlanningShell>
        <SectionPageHeader
          title="Planejamentos"
          description="Organize objetivos como viagem, mudança ou compras grandes com itens e aportes."
          backTo="/planning"
          actions={
            <button
              onClick={() => {
                setEditing(undefined);
                setShowModal(true);
              }}
              className="hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-smooth hover:scale-[1.02] sm:flex"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo planejamento
            </button>
          }
        />

        {isLoading ? (
          <SectionLoadingState message="Carregando planejamentos..." />
        ) : plans.length === 0 ? (
          <SectionEmptyState
            icon={PiggyBank}
            title="Nenhum planejamento criado"
            description="Crie um objetivo e comece a reservar dinheiro para ele."
            action={
              <button
                onClick={() => setShowModal(true)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Criar primeiro planejamento
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {plans.map((plan) => {
              const pct = Math.min(plan.progressPercent ?? 0, 100);
              return (
                <div
                  key={plan.id}
                  className="card-premium group flex flex-col gap-4 overflow-hidden p-5"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${plan.color ?? '#f59e0b'}12, transparent 40%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClasses(plan.status)}`}>
                          {statusLabel(plan.status)}
                        </span>
                        <span className="rounded-full bg-muted/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {plan.itemCount} item(ns)
                        </span>
                      </div>
                      <h2 className="truncate text-lg font-bold font-display">{plan.name}</h2>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(plan.targetDate)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-smooth group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditing(plan);
                          setShowModal(true);
                        }}
                        className="rounded-lg p-2 text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        className="rounded-lg p-2 text-muted-foreground transition-smooth hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Meta
                      </p>
                      <p className="mt-1 text-base font-bold">{formatValue(plan.targetAmount)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Reservado
                      </p>
                      <p className="mt-1 text-base font-bold text-emerald-500">
                        {formatValue(plan.contributedTotal)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Estimado nos itens
                      </p>
                      <p className="mt-1 text-base font-bold">{formatValue(plan.estimatedTotal)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Aportes
                      </p>
                      <p className="mt-1 text-base font-bold">{plan.contributionCount}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-muted-foreground">Progresso do valor alvo</span>
                      <span className="font-bold text-primary">{Math.round(plan.progressPercent)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Faltam {formatValue(plan.remainingToContribute)} para atingir a meta.
                    </p>
                  </div>

                  {plan.notes ? (
                    <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                      {plan.notes}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <WalletCards className="h-3.5 w-3.5" />
                      Planejamento detalhado
                    </p>
                    <button
                      onClick={() =>
                        void navigate({
                          to: '/planning/plans/$planId',
                          params: { planId: plan.id },
                        })
                      }
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Abrir →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PlanningShell>

      {showModal ? (
        <PlanModal
          initial={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(undefined);
          }}
          onSaved={handleSaved}
        />
      ) : null}

      <Fab
        label="Novo planejamento"
        onClick={() => {
          setEditing(undefined);
          setShowModal(true);
        }}
      />
    </>
  );
}
