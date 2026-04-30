import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import FinancialSummaryPanel from "../components/FinancialSummaryPanel";
import BudgetPlansSection from "../components/BudgetPlansSection";
import DashboardPanel from "../components/DashboardPanel";
import SectionShell from "../components/SectionShell";
import PrivacyAmount from "../components/PrivacyAmount";
import { api } from "../lib/api";
import { useBudgetPlans } from "../lib/budgets";
import type { BudgetPlan } from "../lib/budgets";
import { formatMonthLabelPtBr } from "../lib/formatters";
import { cn } from "../lib/utils";
import { BudgetModal } from "../components/BudgetModal";
import BudgetDetailView from "../components/BudgetDetailView";

export const Route = createFileRoute("/budgets")({
  component: BudgetsPage,
});

function BudgetCard({
  budget,
  onEdit,
  onDelete,
  onViewDetails,
}: {
  budget: BudgetPlan;
  onEdit: (budget: BudgetPlan) => void;
  onDelete: (id: string) => void;
  onViewDetails: (budget: BudgetPlan) => void;
}) {
  const percent = Math.min(100, Math.max(0, budget.progress));

  return (
    <DashboardPanel
      className="flex flex-col gap-4 p-4 hover:border-slate-300 transition-colors cursor-pointer group"
      onClick={() => onViewDetails(budget)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
            {formatMonthLabelPtBr(budget.targetDate.slice(0, 7))}
          </p>
          <h3 className="mt-1 truncate text-lg font-bold text-slate-900">
            {budget.name}
          </h3>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onEdit(budget)}
            className="transactions-action p-2"
            aria-label="Editar orçamento"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(budget.id)}
            className="transactions-action p-2"
            aria-label="Excluir orçamento"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
            Total
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            <PrivacyAmount value={budget.totalCents / 100} />
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
            Gasto
          </p>
          <p className="mt-1 text-sm font-semibold semantic-expense-text">
            <PrivacyAmount value={budget.spentCents / 100} />
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
            Falta
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              budget.remainingCents < 0
                ? "semantic-expense-text"
                : "semantic-income-text",
            )}
          >
            <PrivacyAmount value={budget.remainingCents / 100} />
          </p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            budget.progress >= 100 ? "bg-rose-500" : "bg-slate-900",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {budget.items.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className="rounded-full border border-slate-300/80 bg-white/75 px-3 py-1 text-[10px] font-medium text-slate-700"
            >
              {item.name}
            </span>
          ))}
          {budget.items.length > 3 && (
            <span className="text-[10px] font-bold text-slate-400">
              +{budget.items.length - 3}
            </span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </DashboardPanel>
  );
}

function BudgetsPage() {
  const queryClient = useQueryClient();
  const { data: budgets = [], isLoading } = useBudgetPlans();

  const [editingBudget, setEditingBudget] = useState<BudgetPlan | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const selectedBudget = useMemo(
    () => budgets.find((b) => b.id === selectedBudgetId),
    [budgets, selectedBudgetId],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["budgets"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteBudgets<void>(id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditingBudget(null);
    setShowModal(true);
  };

  const openEdit = (budget: BudgetPlan) => {
    setEditingBudget(budget);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBudget(null);
  };

  const totalPlannedCents = budgets.reduce(
    (acc, budget) => acc + budget.totalCents,
    0,
  );
  const totalSpentCents = budgets.reduce(
    (acc, budget) => acc + budget.spentCents,
    0,
  );
  const totalRemainingCents = budgets.reduce(
    (acc, budget) => acc + budget.remainingCents,
    0,
  );

  if (selectedBudget) {
    return (
      <SectionShell
        backgroundClassName="transactions-bg-starfield"
        decorations={[]}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:gap-5 sm:p-6">
          <BudgetDetailView
            budget={selectedBudget}
            onBack={() => setSelectedBudgetId(null)}
          />
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      backgroundClassName="transactions-bg-starfield"
      decorations={[]}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:gap-5 sm:p-6">
        <BudgetModal
          isOpen={showModal}
          onClose={closeModal}
          editingBudget={editingBudget}
        />

        <FinancialSummaryPanel
          eyebrow="Budgets"
          monthLabel={formatMonthLabelPtBr(
            new Date().toISOString().slice(0, 7),
          )}
          icon={CalendarDays}
          statsClassName="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:grid-cols-2 xl:grid-cols-4"
          stats={[
            {
              title: "Planos",
              value: `${budgets.length}`,
              icon: CalendarDays,
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
            {
              title: "Planejado",
              value: (
                <PrivacyAmount
                  value={totalPlannedCents / 100}
                  className="font-display"
                />
              ),
              icon: Wallet,
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
            {
              title: "Gasto",
              value: (
                <PrivacyAmount
                  value={totalSpentCents / 100}
                  className="font-display text-rose-600"
                />
              ),
              icon: ArrowDownLeft,
              tone: "expense",
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
            {
              title: "Falta",
              value: (
                <PrivacyAmount
                  value={totalRemainingCents / 100}
                  className={cn(
                    "font-display",
                    totalRemainingCents < 0
                      ? "text-rose-600"
                      : "text-emerald-600",
                  )}
                />
              ),
              icon: ShieldCheck,
              tone: totalRemainingCents < 0 ? "expense" : "income",
              className: "w-[220px] shrink-0 snap-start sm:w-auto",
            },
          ]}
        />

        <BudgetPlansSection
          eyebrow="Planejamento"
          title={budgets.length === 0 ? "Sem orçamento ainda" : "Orçamentos"}
          count={`${budgets.length} plano(s)`}
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="transactions-primary inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              Novo
            </button>
          }
        >
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-sky-700" />
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
              <Wallet className="h-10 w-10 text-slate-400" />
              <p className="max-w-md text-sm text-slate-500">
                Crie um objetivo futuro e separe os valores por itens simples.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-3 sm:p-4">
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onEdit={openEdit}
                  onViewDetails={(b) => setSelectedBudgetId(b.id)}
                  onDelete={(id) => {
                    if (window.confirm("Excluir este orçamento?")) {
                      deleteMutation.mutate(id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </BudgetPlansSection>
      </div>
    </SectionShell>
  );
}
