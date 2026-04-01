import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../lib/api';
import { MonthSelector } from '../../components/MonthSelector';
import {
  Plus,
  Target,
  Loader2,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

export const Route = createFileRoute('/budgets/')({
  component: BudgetsPage,
  validateSearch: z.object({ month: z.string().optional() }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  color?: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Budget {
  id: string;
  categoryId?: string;
  category?: { id: string; name: string; color?: string };
  limitAmount: number;
  month: number;
  year: number;
  notes?: string;
}

interface BudgetStatus extends Budget {
  spent: number;
  percentUsed: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all';
const labelCls =
  'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

function fmtBrl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-rose-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}
function progressTextColor(pct: number) {
  if (pct >= 100) return 'text-rose-500';
  if (pct >= 80) return 'text-amber-500';
  return 'text-emerald-500';
}

// ─── Budget Modal ────────────────────────────────────────────────────────────

function BudgetModal({
  initial,
  categories,
  defaultMonth,
  onClose,
  onSaved,
}: {
  initial?: BudgetStatus;
  categories: Category[];
  defaultMonth: string; // YYYY-MM
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, mon] = defaultMonth.split('-').map(Number);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [limitCents, setLimitCents] = useState(
    initial ? Math.round(initial.limitAmount * 100).toString() : '0',
  );
  const [month, setMonth] = useState(initial?.month ?? mon ?? new Date().getMonth() + 1);
  const [budgetYear, setBudgetYear] = useState(initial?.year ?? year ?? new Date().getFullYear());
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  const fmt = (c: string) =>
    (Number(c) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const isEdit = !!initial;
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const selectedCat = expenseCategories.find((c) => c.id === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const dto = {
        categoryId: categoryId || undefined,
        limitAmount: Number(limitCents) / 100,
        month,
        year: budgetYear,
        notes: notes.trim() || undefined,
      };
      if (isEdit && initial) {
        await api.updateBudget(initial.id, dto);
      } else {
        await api.createBudget(dto);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento.');
    } finally {
      setIsLoading(false);
    }
  };

  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold font-display">
              {isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
              {error}
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className={labelCls}>Categoria</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCatOpen(!catOpen)}
                className="w-full flex items-center justify-between text-left bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none transition-all hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  {selectedCat?.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedCat.color }}
                    />
                  )}
                  <span className={selectedCat ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {selectedCat?.name ?? 'Selecione uma categoria'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {catOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCatOpen(false)} />
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto p-1">
                    {expenseCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setCategoryId(cat.id); setCatOpen(false); }}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:bg-muted/60 ${categoryId === cat.id ? 'text-primary bg-primary/5 font-bold' : ''}`}
                      >
                        {cat.color && (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        )}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Limite */}
          <div>
            <label className={labelCls}>Valor Limite</label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={fmt(limitCents)}
              onChange={(e) => setLimitCents(e.target.value.replace(/\D/g, ''))}
              className={`${inputCls} font-bold text-primary`}
            />
          </div>

          {/* Mês e Ano */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mês</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className={inputCls}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ano</label>
              <input
                type="number"
                value={budgetYear}
                onChange={(e) => setBudgetYear(Number(e.target.value))}
                min={2020}
                max={2099}
                className={inputCls}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className={labelCls}>Observações (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Limite de lazer"
              className={inputCls}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit as any}
            disabled={isLoading || Number(limitCents) <= 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar Orçamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: BudgetStatus;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Math.min(budget.percentUsed ?? 0, 100);
  const isOver = (budget.percentUsed ?? 0) >= 100;
  const isWarn = !isOver && (budget.percentUsed ?? 0) >= 80;
  const remaining = budget.limitAmount - budget.spent;

  return (
    <div className={`card-premium p-4 flex flex-col gap-3 group relative ${isOver ? 'ring-1 ring-rose-500/30' : ''}`}>
      {isOver && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
          <AlertTriangle className="w-2.5 h-2.5" />
          ESTOURADO
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {budget.category?.color && (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: budget.category.color }}
            />
          )}
          <p className="text-sm font-bold">{budget.category?.name ?? 'Geral'}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-bold ${progressTextColor(budget.percentUsed ?? 0)}`}>
            {fmtBrl(budget.spent)} de {fmtBrl(budget.limitAmount)}
          </span>
          <span className={`text-[10px] font-bold ${progressTextColor(budget.percentUsed ?? 0)}`}>
            {Math.round(budget.percentUsed ?? 0)}%
          </span>
        </div>
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor(budget.percentUsed ?? 0)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`text-[10px] mt-1.5 font-medium ${isOver ? 'text-rose-500' : isWarn ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {isOver
            ? `${fmtBrl(Math.abs(remaining))} acima do limite`
            : `${fmtBrl(remaining)} restante`}
        </p>
      </div>

      {budget.notes && (
        <p className="text-[10px] text-muted-foreground/70 border-t border-border pt-2">{budget.notes}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BudgetsPage() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  const currentMonthValue = search.month ?? (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetStatus | undefined>(undefined);

  const { data: statusList = [], isLoading } = useQuery({
    queryKey: ['budgets', 'status', currentMonthValue],
    queryFn: async () => {
      const res = await api.getBudgetsStatus<any>(currentMonthValue);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
    staleTime: 1000 * 60,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir este orçamento?')) deleteMutation.mutate(id);
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditTarget(undefined);
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
  };

  const overBudget = statusList.filter((b: BudgetStatus) => (b.percentUsed ?? 0) >= 100);
  const onTrack = statusList.filter((b: BudgetStatus) => (b.percentUsed ?? 0) < 100);

  return (
    <>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Orçamentos</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              Defina limites de gastos por categoria.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MonthSelector
              value={currentMonthValue}
              onChange={(m) => {
                window.history.pushState({}, '', `?month=${m}`);
                queryClient.invalidateQueries({ queryKey: ['budgets', 'status'] });
              }}
            />
            <button
              onClick={() => { setEditTarget(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Orçamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : statusList.length === 0 ? (
          <div className="card-premium flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground">
              <Target className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Nenhum orçamento neste mês</p>
            <p className="text-xs text-muted-foreground/70">Clique em "Novo Orçamento" para começar.</p>
          </div>
        ) : (
          <>
            {overBudget.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-2 px-1">
                  ⚠ Estourados ({overBudget.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {overBudget.map((b: BudgetStatus) => (
                    <BudgetCard
                      key={b.id}
                      budget={b}
                      onEdit={() => { setEditTarget(b); setShowModal(true); }}
                      onDelete={() => handleDelete(b.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {onTrack.length > 0 && (
              <div>
                {overBudget.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                    No prazo ({onTrack.length})
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {onTrack.map((b: BudgetStatus) => (
                    <BudgetCard
                      key={b.id}
                      budget={b}
                      onEdit={() => { setEditTarget(b); setShowModal(true); }}
                      onDelete={() => handleDelete(b.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <BudgetModal
          initial={editTarget}
          categories={categories}
          defaultMonth={currentMonthValue}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
