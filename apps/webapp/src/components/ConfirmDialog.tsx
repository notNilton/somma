import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "./ui/Modal";

type ConfirmVariant = "default" | "danger";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  isLoading: isLoadingProp,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const isLoading = isLoadingProp ?? isLoadingLocal;

  useEffect(() => {
    if (!isOpen) setIsLoadingLocal(false);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isLoading) return;
    try {
      if (isLoadingProp === undefined) setIsLoadingLocal(true);
      await onConfirm();
    } finally {
      if (isLoadingProp === undefined) setIsLoadingLocal(false);
    }
  };

  const tone =
    variant === "danger"
      ? {
          iconBg: "bg-rose-500/10",
          icon: "text-rose-500",
          confirm: "semantic-expense-solid",
        }
      : {
          iconBg: "bg-primary/10",
          icon: "text-primary",
          confirm: "transactions-primary",
        };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      eyebrow="Confirm Action"
      maxWidth="sm:max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="transactions-action w-full px-4 py-3 text-sm font-semibold sm:w-auto sm:py-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`${tone.confirm} inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:py-2`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone.iconBg}`}
          >
            <AlertTriangle className={`w-4 h-4 ${tone.icon}`} />
          </div>
          {description && (
            <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
