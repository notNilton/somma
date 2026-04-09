import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Edit2,
  Loader2,
  Plus,
  ReceiptText,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import PlanningShell from '../../../../components/PlanningShell';
import SectionPageHeader from '../../../../components/SectionPageHeader';
import { SectionEmptyState, SectionLoadingState } from '../../../../components/SectionFeedback';
import { api } from '../../../../lib/api';
import { formatValue } from '../../../../lib/formatters';

export const Route = createFileRoute('/planning/plans/$planId')({
  component: PlanningPlanDetailPage,
});

interface Category {
  id: string;
  name: string;
  color?: string;
  type: 'INCOME' | 'EXPENSE';
}

interface PlanDetail {
  plan: {
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
  };
  items: Array<{
    id: string;
    categoryId?: string | null;
    name: string;
    estimatedAmount: number;
    notes?: string | null;
    sortOrder: number;
    category?: { id?: string | null; name?: string | null; color?: string | null };
  }>;
  contributions: Array<{
    id: string;
    amount: number;
    contributionDate: string;
    notes?: string | null;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    date: string;
    description: string;
    type: 'INCOME' | 'EXPENSE';
    classification?: string;
    channel?: string;
    category?: { id?: string | null; name?: string | null; color?: string | null };
    account?: { id?: string | null; name?: string | null };
  }>;
}

const inputCls =
  'w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none transition-smooth focus:ring-2 focus:ring-primary/20';
const labelCls = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground';

function statusLabel(status: PlanDetail['plan']['status']) {
  if (status === 'PAUSED') return 'Pausado';
  if (status === 'COMPLETED') return 'Concluído';
  if (status === 'CANCELED') return 'Cancelado';
  return 'Ativo';
}

function statusClasses(status: PlanDetail['plan']['status']) {
  if (status === 'PAUSED') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (status === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (status === 'CANCELED') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
}

function PlanEditModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: PlanDetail['plan'];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [targetAmountCents, setTargetAmountCents] = useState(
    Math.round(plan.targetAmount * 100).toString(),
  );
  const [targetDate, setTargetDate] = useState(plan.targetDate?.slice(0, 10) ?? '');
  const [status, setStatus] = useState(plan.status);
  const [notes, setNotes] = useState(plan.notes ?? '');
  const [color, setColor] = useState(plan.color ?? '#f59e0b');
  const [icon, setIcon] = useState(plan.icon ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.updatePlan(plan.id, {
        name: name.trim(),
        targetAmount: Number(targetAmountCents) / 100,
        targetDate: targetDate || undefined,
        status,
        notes: notes.trim() || undefined,
        color: color || undefined,
        icon: icon.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar planejamento.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Edit2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display">Editar planejamento</h2>
              <p className="text-xs text-muted-foreground">Ajuste a meta, prazo e contexto.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div> : null}
          <div>
            <label className={labelCls}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Valor alvo</label>
              <input
                value={formatValue(Number(targetAmountCents) / 100)}
                onChange={(e) => setTargetAmountCents(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} font-bold text-primary`}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Data-alvo</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as PlanDetail['plan']['status'])} className={inputCls}>
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
              <input value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} min-h-24 resize-none`} />
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanItemModal({
  categories,
  initial,
  onClose,
  onSaved,
}: {
  categories: Category[];
  initial?: PlanDetail['items'][number];
  onClose: () => void;
  onSaved: (payload: { name: string; estimatedAmount: number; categoryId?: string; notes?: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [amountCents, setAmountCents] = useState(
    initial ? Math.round(initial.estimatedAmount * 100).toString() : '0',
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const expenseCategories = categories.filter((category) => category.type === 'EXPENSE');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onSaved({
        name: name.trim(),
        estimatedAmount: Number(amountCents) / 100,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar item.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold font-display">
              {initial ? 'Editar item' : 'Novo item'}
            </h2>
            <p className="text-xs text-muted-foreground">Defina o custo previsto dessa parte do objetivo.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div> : null}
          <div>
            <label className={labelCls}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Valor estimado</label>
              <input
                value={formatValue(Number(amountCents) / 100)}
                onChange={(e) => setAmountCents(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} font-bold text-primary`}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Sem categoria</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || Number(amountCents) <= 0} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Salvar item' : 'Adicionar item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContributionModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PlanDetail['contributions'][number];
  onClose: () => void;
  onSaved: (payload: { amount: number; contributionDate: string; notes?: string }) => Promise<void>;
}) {
  const [amountCents, setAmountCents] = useState(
    initial ? Math.round(initial.amount * 100).toString() : '0',
  );
  const [contributionDate, setContributionDate] = useState(
    initial?.contributionDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onSaved({
        amount: Number(amountCents) / 100,
        contributionDate,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aporte.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold font-display">
              {initial ? 'Editar aporte' : 'Novo aporte'}
            </h2>
            <p className="text-xs text-muted-foreground">Registre quanto foi reservado para este objetivo.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Valor</label>
              <input
                value={formatValue(Number(amountCents) / 100)}
                onChange={(e) => setAmountCents(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} font-bold text-primary`}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Data do aporte</label>
              <input type="date" value={contributionDate} onChange={(e) => setContributionDate(e.target.value)} className={inputCls} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || Number(amountCents) <= 0} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Salvar aporte' : 'Registrar aporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanningPlanDetailPage() {
  const { planId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanDetail['items'][number] | null>(null);
  const [editingContribution, setEditingContribution] =
    useState<PlanDetail['contributions'][number] | null>(null);

  const [itemName, setItemName] = useState('');
  const [itemAmountCents, setItemAmountCents] = useState('0');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [itemError, setItemError] = useState<string | null>(null);

  const [contributionAmountCents, setContributionAmountCents] = useState('0');
  const [contributionDate, setContributionDate] = useState(new Date().toISOString().slice(0, 10));
  const [contributionNotes, setContributionNotes] = useState('');
  const [contributionError, setContributionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['planning', 'plans', planId],
    queryFn: () => api.getPlan<PlanDetail>(planId),
    staleTime: 1000 * 30,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const saveItemMutation = useMutation({
    mutationFn: (payload: { categoryId?: string; name: string; estimatedAmount: number; notes?: string }) =>
      api.createPlanItem(planId, payload),
    onSuccess: async () => {
      setItemName('');
      setItemAmountCents('0');
      setItemCategoryId('');
      setItemNotes('');
      setItemError(null);
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans', planId] });
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
    },
  });

  const saveContributionMutation = useMutation({
    mutationFn: (payload: { amount: number; contributionDate: string; notes?: string }) =>
      api.createPlanContribution(planId, payload),
    onSuccess: async () => {
      setContributionAmountCents('0');
      setContributionDate(new Date().toISOString().slice(0, 10));
      setContributionNotes('');
      setContributionError(null);
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans', planId] });
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.deletePlanItem(planId, itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans', planId] });
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
    },
  });

  const deleteContributionMutation = useMutation({
    mutationFn: (contributionId: string) => api.deletePlanContribution(planId, contributionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans', planId] });
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: () => api.deletePlan(planId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
      void navigate({ to: '/planning/plans' });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (payload: { itemId: string; body: { name: string; estimatedAmount: number; categoryId?: string; notes?: string } }) =>
      api.updatePlanItem(planId, payload.itemId, payload.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans', planId] });
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
    },
  });

  const updateContributionMutation = useMutation({
    mutationFn: (payload: { contributionId: string; body: { amount: number; contributionDate: string; notes?: string } }) =>
      api.updatePlanContribution(planId, payload.contributionId, payload.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans', planId] });
      await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
    },
  });

  const expenseCategories = categories.filter((category) => category.type === 'EXPENSE');

  if (isLoading) {
    return (
      <PlanningShell>
        <SectionLoadingState message="Carregando planejamento..." />
      </PlanningShell>
    );
  }

  if (!data) {
    return (
      <PlanningShell>
        <SectionEmptyState
          icon={Target}
          title="Planejamento não encontrado"
          description="Esse objetivo pode ter sido removido."
          action={
            <button
              onClick={() => void navigate({ to: '/planning/plans' })}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Voltar para planejamentos
            </button>
          }
        />
      </PlanningShell>
    );
  }

  const { plan, items, contributions, transactions } = data;
  const pct = Math.min(plan.progressPercent ?? 0, 100);

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setItemError(null);
    try {
      await saveItemMutation.mutateAsync({
        categoryId: itemCategoryId || undefined,
        name: itemName.trim(),
        estimatedAmount: Number(itemAmountCents) / 100,
        notes: itemNotes.trim() || undefined,
      });
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Erro ao adicionar item.');
    }
  };

  const handleCreateContribution = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContributionError(null);
    try {
      await saveContributionMutation.mutateAsync({
        amount: Number(contributionAmountCents) / 100,
        contributionDate,
        notes: contributionNotes.trim() || undefined,
      });
    } catch (err) {
      setContributionError(err instanceof Error ? err.message : 'Erro ao registrar aporte.');
    }
  };

  return (
    <>
      <PlanningShell>
        <SectionPageHeader
          title={plan.name}
          description="Detalhe do objetivo, com composição por itens e histórico de aportes."
          actions={
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-semibold text-foreground transition-smooth hover:bg-muted"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  if (!window.confirm(`Excluir o planejamento "${plan.name}"?`)) return;
                  deletePlanMutation.mutate();
                }}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-500 transition-smooth hover:bg-rose-500/15"
              >
                Excluir
              </button>
            </>
          }
          backTo="/planning/plans"
        />

        <div
          className="card-premium overflow-hidden"
          style={{ backgroundImage: `linear-gradient(135deg, ${plan.color ?? '#f59e0b'}18, transparent 42%)` }}
        >
          <div className="flex flex-col gap-5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClasses(plan.status)}`}>
                {statusLabel(plan.status)}
              </span>
              <span className="rounded-full bg-muted/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {plan.itemCount} item(ns)
              </span>
              <span className="rounded-full bg-muted/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {plan.contributionCount} aporte(s)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meta</p>
                <p className="mt-1 text-lg font-bold">{formatValue(plan.targetAmount)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reservado</p>
                <p className="mt-1 text-lg font-bold text-emerald-500">{formatValue(plan.contributedTotal)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Itens estimados</p>
                <p className="mt-1 text-lg font-bold">{formatValue(plan.estimatedTotal)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data-alvo</p>
                <p className="mt-1 text-sm font-bold">
                  {plan.targetDate ? new Date(plan.targetDate).toLocaleDateString('pt-BR') : 'Sem data'}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Progresso da reserva</span>
                <span className="font-bold text-primary">{Math.round(plan.progressPercent)}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted/60">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Faltam <span className="font-semibold text-foreground">{formatValue(plan.remainingToContribute)}</span> para atingir a meta.
              </p>
            </div>

            {plan.notes ? (
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                {plan.notes}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="card-premium p-5">
              <div className="mb-4 flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">Itens previstos</h2>
              </div>
              <form onSubmit={handleCreateItem} className="flex flex-col gap-3">
                {itemError ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{itemError}</div> : null}
                <div>
                  <label className={labelCls}>Nome do item</label>
                  <input value={itemName} onChange={(e) => setItemName(e.target.value)} className={inputCls} placeholder="Ex: Hospedagem" required />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Valor estimado</label>
                    <input
                      value={formatValue(Number(itemAmountCents) / 100)}
                      onChange={(e) => setItemAmountCents(e.target.value.replace(/\D/g, ''))}
                      className={`${inputCls} font-bold text-primary`}
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Categoria</label>
                    <select value={itemCategoryId} onChange={(e) => setItemCategoryId(e.target.value)} className={inputCls}>
                      <option value="">Sem categoria</option>
                      {expenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Observações</label>
                  <input value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} className={inputCls} placeholder="Opcional" />
                </div>
                <button
                  type="submit"
                  disabled={saveItemMutation.isPending || Number(itemAmountCents) <= 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saveItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar item
                </button>
              </form>
            </div>

            <div className="card-premium overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-bold">Composição do planejamento</h2>
              </div>
              {items.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">Nenhum item previsto ainda.</div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                      <div className="flex items-center gap-2">
                          {item.category?.color ? (
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.category.color }} />
                          ) : null}
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.category?.name ?? 'Sem categoria'}
                          {item.notes ? ` · ${item.notes}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold">{formatValue(item.estimatedAmount)}</p>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm(`Excluir o item "${item.name}"?`)) return;
                            deleteItemMutation.mutate(item.id);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card-premium p-5">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">Registrar aporte</h2>
              </div>
              <form onSubmit={handleCreateContribution} className="flex flex-col gap-3">
                {contributionError ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{contributionError}</div> : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Valor</label>
                    <input
                      value={formatValue(Number(contributionAmountCents) / 100)}
                      onChange={(e) => setContributionAmountCents(e.target.value.replace(/\D/g, ''))}
                      className={`${inputCls} font-bold text-primary`}
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Data do aporte</label>
                    <input type="date" value={contributionDate} onChange={(e) => setContributionDate(e.target.value)} className={inputCls} required />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Observações</label>
                  <input value={contributionNotes} onChange={(e) => setContributionNotes(e.target.value)} className={inputCls} placeholder="Ex: reserva do salário de abril" />
                </div>
                <button
                  type="submit"
                  disabled={saveContributionMutation.isPending || Number(contributionAmountCents) <= 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saveContributionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Registrar aporte
                </button>
              </form>
            </div>

            <div className="card-premium overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-bold">Histórico de aportes</h2>
              </div>
              {contributions.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">Nenhum aporte registrado ainda.</div>
              ) : (
                <div className="divide-y divide-border">
                  {contributions.map((contribution) => (
                    <div key={contribution.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{formatValue(contribution.amount)}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(contribution.contributionDate).toLocaleDateString('pt-BR')}
                          {contribution.notes ? ` · ${contribution.notes}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingContribution(contribution)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm('Excluir este aporte?')) return;
                            deleteContributionMutation.mutate(contribution.id);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-premium overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-bold">Transações vinculadas</h2>
                <button
                  onClick={() =>
                    void navigate({
                      to: '/activity/transactions/crud-transactions',
                      search: { transactionId: undefined, planningPlanId: plan.id },
                    })
                  }
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Nova transação →
                </button>
              </div>
              {transactions.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">
                  Nenhuma transação real vinculada ainda.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <button
                      key={transaction.id}
                      onClick={() =>
                        void navigate({
                          to: '/activity/transactions/crud-transactions',
                          search: { transactionId: transaction.id },
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-smooth hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{transaction.description}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          {transaction.account?.name ? ` · ${transaction.account.name}` : ''}
                          {transaction.category?.name ? ` · ${transaction.category.name}` : ''}
                        </p>
                      </div>
                      <p className={`shrink-0 text-sm font-bold ${transaction.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}>
                        {formatValue(transaction.amount)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PlanningShell>

      {showEditModal ? (
        <PlanEditModal
          plan={plan}
          onClose={() => setShowEditModal(false)}
          onSaved={async () => {
            setShowEditModal(false);
            await queryClient.invalidateQueries({ queryKey: ['planning', 'plans', planId] });
            await queryClient.invalidateQueries({ queryKey: ['planning', 'plans'] });
          }}
        />
      ) : null}

      {editingItem ? (
        <PlanItemModal
          categories={categories}
          initial={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={async (payload) => {
            await updateItemMutation.mutateAsync({ itemId: editingItem.id, body: payload });
            setEditingItem(null);
          }}
        />
      ) : null}

      {editingContribution ? (
        <ContributionModal
          initial={editingContribution}
          onClose={() => setEditingContribution(null)}
          onSaved={async (payload) => {
            await updateContributionMutation.mutateAsync({
              contributionId: editingContribution.id,
              body: payload,
            });
            setEditingContribution(null);
          }}
        />
      ) : null}
    </>
  );
}
