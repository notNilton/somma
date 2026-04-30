import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '#/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  className?: string;
  containerClassName?: string;
  subHeader?: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  maxWidth = 'sm:max-w-2xl',
  className = '',
  containerClassName = '',
  subHeader,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center bg-black/45 backdrop-blur-sm px-0 py-0 sm:items-center sm:px-4 sm:py-6',
        containerClassName,
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'transactions-surface transactions-modal flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(241,245,249,0.9))] shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-none',
          maxWidth,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-300/70 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            {eyebrow && (
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 sm:text-[10px] sm:tracking-[0.35em]">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="transactions-action p-2"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {subHeader}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex flex-col gap-2 border-t border-slate-300/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-5 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
