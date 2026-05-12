import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Tag, Palette } from "lucide-react";
import Modal from "./ui/Modal";
import {
  createSyncQueueId,
  enqueueSyncQueueItem,
} from "../lib/offline-sync";

export type CategoryType = "INCOME" | "EXPENSE";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "create" | "edit";
  type: CategoryType;
  initialData?: {
    id: string;
    name: string;
    color?: string;
  } | null;
}

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  type,
  initialData,
}: CategoryModalProps) {
  const queryClient = useQueryClient();
  const isEditing = mode === "edit";

  const [name, setName] = useState(initialData?.name ?? "");
  const initialDefault = type === "INCOME" ? "#22C55E" : "#EF4444";
  const [colorHex, setColorHex] = useState<string>(
    typeof initialData?.color === "string" && initialData.color.startsWith("#")
      ? initialData.color
      : initialDefault,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName(initialData?.name ?? "");
      const nextDefault = type === "INCOME" ? "#22C55E" : "#EF4444";
      const nextColor =
        typeof initialData?.color === "string" &&
        initialData.color.startsWith("#")
          ? initialData.color
          : nextDefault;
      setColorHex(nextColor);
    }
  }, [isOpen, initialData, type]);

  const updateCategoryCaches = (updater: (current: unknown) => unknown) => {
    queryClient.setQueriesData({ queryKey: ["categories"] }, updater);
    queryClient.setQueriesData({ queryKey: ["settings-categories"] }, updater);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        type,
        color: colorHex || undefined,
      };

      if (!payload.name) {
        throw new Error("Informe um nome para a categoria.");
      }

      const entityId = isEditing && initialData ? initialData.id : createSyncQueueId();
      const optimisticCategory = {
        id: entityId,
        ...payload,
        syncStatus: "pending",
      };

      updateCategoryCaches((current) => {
        if (!Array.isArray(current)) return current;
        const next = current.filter((item) => {
          if (!item || typeof item !== "object") return true;
          return (item as Record<string, unknown>).id !== entityId;
        });
        return [optimisticCategory, ...next];
      });

      if (isEditing && initialData) {
        enqueueSyncQueueItem({
          id: entityId,
          kind: "category.update",
          method: "PATCH",
          path: `/api/v1/categories/${initialData.id}`,
          payload,
          entityId,
          createdAt: new Date().toISOString(),
          attempts: 0,
        });
      } else {
        enqueueSyncQueueItem({
          id: entityId,
          kind: "category.create",
          method: "POST",
          path: "/api/v1/categories",
          payload,
          entityId,
          createdAt: new Date().toISOString(),
          attempts: 0,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar categoria.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabel = type === "INCOME" ? "Receita" : "Despesa";
  const title = isEditing
    ? `Editar categoria de ${typeLabel.toLowerCase()}`
    : `Nova categoria de ${typeLabel.toLowerCase()}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      eyebrow="Category settings"
      maxWidth="sm:max-w-md"
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
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className="transactions-primary inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEditing ? "Salvar alterações" : "Criar categoria"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-primary"
            style={{ backgroundColor: `${colorHex}20` }}
          >
            <Tag className="w-4 h-4" style={{ color: colorHex }} />
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Nome e cor para destacar esta categoria
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 block">
              Nome da categoria
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "INCOME"
                  ? "Ex: Salário, Rendimentos, Outros..."
                  : "Ex: Mercado, Combustível, Moradia..."
              }
              className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 block">
              Cor
            </label>
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="color"
                value={colorHex}
                onChange={(e) => {
                  setColorHex(e.target.value);
                }}
                className="w-full h-[42px] bg-white border border-slate-300/80 pl-10 pr-4 py-1.5 text-sm outline-none cursor-pointer"
                aria-label="Selecionar cor"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="semantic-expense px-3 py-2 text-sm">{error}</div>
        )}
      </div>
    </Modal>
  );
}
