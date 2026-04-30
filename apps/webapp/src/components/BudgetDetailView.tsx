import { ArrowLeft, Loader2, Calendar } from "lucide-react";
import { useBudgetTransactions } from "../lib/budgets";
import type { BudgetPlan } from "../lib/budgets";
import PrivacyAmount from "./PrivacyAmount";
import DashboardPanel from "./DashboardPanel";
import { cn } from "../lib/utils";

interface BudgetDetailViewProps {
  budget: BudgetPlan;
  onBack: () => void;
}

export default function BudgetDetailView({
  budget,
  onBack,
}: BudgetDetailViewProps) {
  const { data: transactions = [], isLoading } = useBudgetTransactions(
    budget.id,
  );

  const percent = Math.min(100, Math.max(0, budget.progress));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="transactions-action p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{budget.name}</h2>
          <p className="text-sm text-slate-500">
            Detalhes e rastreamento de gastos
          </p>
        </div>
      </div>

      <DashboardPanel className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                Progresso Geral
              </p>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    budget.progress >= 100 ? "bg-rose-500" : "bg-slate-900",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-600">
                {budget.progress.toFixed(1)}% do total planejado consumido
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Planejado
                </p>
                <p className="text-lg font-bold text-slate-900">
                  <PrivacyAmount value={budget.totalCents / 100} />
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Gasto
                </p>
                <p className="text-lg font-bold text-rose-600">
                  <PrivacyAmount value={budget.spentCents / 100} />
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Saldo
                </p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    budget.remainingCents < 0
                      ? "text-rose-600"
                      : "text-emerald-600",
                  )}
                >
                  <PrivacyAmount value={budget.remainingCents / 100} />
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Itens do Orçamento
            </p>
            <div className="grid gap-2">
              {budget.items.map((item) => {
                const itemPercent =
                  Math.min(100, (item.spentCents / item.amountCents) * 100) ||
                  0;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-3 bg-slate-50/50"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-slate-800">
                        {item.name}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        <PrivacyAmount value={item.spentCents / 100} /> /{" "}
                        <PrivacyAmount value={item.amountCents / 100} />
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          itemPercent >= 100 ? "bg-rose-500" : "bg-sky-500",
                        )}
                        style={{ width: `${itemPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DashboardPanel>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-500" />
          Histórico de Lançamentos
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-400">
              Nenhuma transação vinculada a este orçamento ainda.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx: any) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">
                    {tx.description}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                    {new Date(tx.date).toLocaleDateString("pt-BR")} •{" "}
                    {tx.category?.name || "Sem categoria"}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      tx.type === "EXPENSE"
                        ? "text-rose-600"
                        : "text-emerald-600",
                    )}
                  >
                    {tx.type === "EXPENSE" ? "-" : "+"}{" "}
                    <PrivacyAmount value={Math.abs(tx.amount)} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
