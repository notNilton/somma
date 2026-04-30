import type { ReactNode } from 'react';

export default function DashboardSectionHeader({
  eyebrow,
  title,
  description,
  count,
  actions,
  className = '',
}: {
  eyebrow: string;
  title?: string;
  description?: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 border-b border-slate-300/80 px-3 py-3 sm:px-4 sm:py-4 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
            {eyebrow}
          </p>
          {title ? <h2 className="mt-1 text-base font-bold text-slate-900">{title}</h2> : null}
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
          {count ? <p className="mt-1 text-xs text-slate-500">{count}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
