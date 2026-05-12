import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowDownLeft, ArrowUpRight, Fuel } from "lucide-react";
import { cleanNumeric, formatCurrency, formatKm } from "../lib/formatters";
import CustomSelect from "./ui/CustomSelect";
import Modal from "./ui/Modal";
import { flattenCategories } from "../lib/categories";
import {
  createSyncQueueId,
  enqueueSyncQueueItem,
} from "../lib/offline-sync";

export type TransactionCreateMode = "expense" | "income" | "fuel";
type Method = "normal" | "debit" | "credit" | "pix";

interface Category {
  id: string;
  name: string;
  description?: string;
  type: "INCOME" | "EXPENSE";
}

interface Vehicle {
  id: string;
  name: string;
}

interface BudgetItem {
  id: string;
  name: string;
}

interface BudgetPlan {
  id: string;
  name: string;
  targetDate: string;
  items: BudgetItem[];
}

interface Props {
  isOpen: boolean;
  mode: TransactionCreateMode;
  categories: Category[];
  vehicles: Vehicle[];
  budgets: BudgetPlan[];
  onClose: () => void;
  onCreated: () => void;
}

function methodToPayload(method: Method) {
  switch (method) {
    case "credit":
      return { paymentMethod: "CREDIT", channel: "CARD_CREDIT" };
    case "pix":
      return { paymentMethod: "DEBIT", channel: "PIX" };
    case "normal":
      return { paymentMethod: "DEBIT", channel: "BANK" };
    case "debit":
    default:
      return { paymentMethod: "DEBIT", channel: "CARD_DEBIT" };
  }
}

function defaultDescriptionForMode(mode: TransactionCreateMode) {
  if (mode === "income") return "Receita";
  if (mode === "fuel") return "Abastecimento";
  return "Despesa";
}

export function TransactionModal({
  isOpen,
  mode,
  categories,
  vehicles,
  budgets,
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState<TransactionCreateMode>(mode);
  const [method, setMethod] = useState<Method>("normal");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [budgetItemId, setBudgetItemId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [currentKm, setCurrentKm] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveMode(mode);
    setMethod("normal");
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("0");
    setDescription("");
    setCategoryId("");
    setBudgetId("");
    setBudgetItemId("");
    setVehicleId("");
    setCurrentKm("0");
    setIsLoading(false);
    setError(null);
  }, [isOpen, mode]);

  useEffect(() => {
    if (activeMode === "income") {
      setBudgetId("");
      setBudgetItemId("");
    }
  }, [activeMode]);

  const filteredCategories = useMemo(() => {
    return flattenCategories(categories).filter(
      (c) => c.type === (activeMode === "income" ? "INCOME" : "EXPENSE"),
    );
  }, [activeMode, categories]);

  const selectedBudget = useMemo(
    () => budgets.find((budget) => budget.id === budgetId),
    [budgetId, budgets],
  );

  const selectedBudgetItems = selectedBudget?.items ?? [];

  const canSubmit =
    Number(amount) > 0 &&
    date !== "" &&
    (activeMode !== "fuel" || vehicleId !== "");
  const showPaymentMethod = activeMode !== "income";
  const updateTransactionCaches = (updater: (current: unknown) => unknown) => {
    queryClient.setQueriesData({ queryKey: ["transactions"] }, updater);
  };

  const submit = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        type: activeMode === "income" ? "INCOME" : "EXPENSE",
        classification: activeMode === "fuel" ? "FUEL" : "COMMON",
        amount: Number(amount) / 100,
        date,
        description:
          description.trim() || defaultDescriptionForMode(activeMode),
        categoryId: categoryId || undefined,
      };

      if (showPaymentMethod) {
        Object.assign(payload, methodToPayload(method));
      }

      if (activeMode !== "income" && budgetId) {
        payload.budgetId = budgetId;
      }
      if (activeMode !== "income" && budgetItemId) {
        payload.budgetItemId = budgetItemId;
      }

      if (activeMode === "fuel") {
        payload.vehicleId = vehicleId;
        payload.currentKm = Number(currentKm);
      }

      const tempId = createSyncQueueId();
      const optimisticTransaction = {
        id: tempId,
        ...payload,
        amount: Number(amount) / 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        syncStatus: "pending",
      };

      updateTransactionCaches((current) => {
        if (!Array.isArray(current)) return current;
        return [optimisticTransaction, ...current];
      });

      enqueueSyncQueueItem({
        id: tempId,
        kind: "transaction.create",
        method: "POST",
        path: "/api/v1/transactions",
        payload,
        entityId: tempId,
        tempEntityId: tempId,
        createdAt: new Date().toISOString(),
        attempts: 0,
      });

      onClose();
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar transação.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    activeMode === "income"
      ? "Nova Receita"
      : activeMode === "fuel"
        ? "Novo Abastecimento"
        : "Nova Despesa";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      eyebrow="Transaction entry"
      subHeader={
        <div className="grid grid-cols-3 gap-0 border-b border-slate-300/70">
          {[
            { key: "income" as const, label: "Receita", Icon: ArrowUpRight },
            { key: "expense" as const, label: "Despesa", Icon: ArrowDownLeft },
            { key: "fuel" as const, label: "Abastecimento", Icon: Fuel },
          ].map(({ key, label, Icon }) => {
            const selected = activeMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMode(key)}
                className={`flex items-center justify-center gap-1.5 border-r border-slate-300/70 px-2 py-2.5 text-[10px] font-bold uppercase leading-none tracking-[0.12em] transition-smooth last:border-r-0 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.2em] ${
                  selected
                    ? key === "income"
                      ? "semantic-income-solid"
                      : key === "expense"
                        ? "semantic-expense-solid"
                        : "bg-slate-900 text-white"
                    : "bg-white/70 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="transactions-action w-full px-4 py-3 text-sm font-semibold sm:w-auto sm:py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isLoading}
            className="transactions-primary inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </>
      }
    >
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
            Valor
          </label>
          <input
            value={formatCurrency(amount)}
            onChange={(e) => setAmount(cleanNumeric(e.target.value))}
            className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
            inputMode="numeric"
            type="text"
            placeholder="0,00"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        {activeMode !== "fuel" ? (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.description ?? category.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
            Descrição
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
            type="text"
            placeholder={title}
            maxLength={255}
          />
        </div>

        {showPaymentMethod ? (
          <div className="sm:col-span-2">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Forma
            </label>
            <div className="grid grid-cols-4 border border-slate-300/80 bg-white">
              {[
                { key: "normal" as const, label: "Normal" },
                { key: "debit" as const, label: "Débito" },
                { key: "credit" as const, label: "Crédito" },
                { key: "pix" as const, label: "Pix" },
              ].map(({ key, label }) => {
                const selected = method === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key)}
                    className={`border-r border-slate-300/80 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-smooth last:border-r-0 sm:px-3 sm:py-2 sm:text-xs sm:tracking-[0.18em] ${
                      selected
                        ? key === "credit"
                          ? "semantic-credit-solid"
                          : key === "pix"
                            ? "semantic-pix-solid"
                            : "semantic-debit-solid"
                        : key === "credit"
                          ? "text-slate-700 hover:bg-amber-500/10 hover:text-amber-600"
                          : key === "pix"
                            ? "text-slate-700 hover:bg-sky-500/10 hover:text-sky-600"
                            : "text-slate-700 hover:bg-orange-500/10 hover:text-orange-600"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="sm:col-span-2 rounded-none border border-slate-300/70 bg-white/70 px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            Receita é apenas uma entrada. Sem forma de pagamento.
          </div>
        )}

        {activeMode !== "income" ? (
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Orçamento
              </label>
              <select
                value={budgetId}
                onChange={(e) => {
                  setBudgetId(e.target.value);
                  setBudgetItemId("");
                }}
                className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">Sem orçamento</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Item
              </label>
              <select
                value={budgetItemId}
                onChange={(e) => setBudgetItemId(e.target.value)}
                disabled={!selectedBudgetItems.length}
                className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none disabled:opacity-60"
              >
                <option value="">Sem item</option>
                {selectedBudgetItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {activeMode === "fuel" ? (
          <>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Veículo
              </label>
              <CustomSelect
                value={vehicleId}
                onChange={setVehicleId}
                options={vehicles.map((vehicle) => ({
                  value: vehicle.id,
                  label: vehicle.name,
                }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Km atual
              </label>
              <input
                value={formatKm(currentKm)}
                onChange={(e) => setCurrentKm(cleanNumeric(e.target.value))}
                className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
                inputMode="numeric"
                type="text"
                placeholder="0"
              />
            </div>
          </>
        ) : null}

        {error ? (
          <div className="sm:col-span-2 semantic-expense px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
