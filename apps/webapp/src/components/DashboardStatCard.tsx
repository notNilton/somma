import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export default function DashboardStatCard({
  title,
  value,
  icon: Icon,
  tone = 'neutral',
  className = '',
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: 'neutral' | 'income' | 'expense';
  className?: string;
}) {
  const toneClass =
    tone === 'income'
      ? 'text-emerald-600'
      : tone === 'expense'
        ? 'text-rose-600'
        : 'text-slate-600';

  return (
    <div
      className={`flex flex-col gap-3 border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,246,250,0.84))] px-4 py-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_14px_32px_rgba(15,23,42,0.06)] transition-colors hover:border-sky-400/50 sm:px-5 sm:py-5 ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="border border-slate-300/80 bg-white/85 p-2 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-3">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.34em] text-slate-500">
          {title}
        </span>
      </div>
      <div className={`font-display text-xl font-bold sm:text-2xl ${toneClass}`}>{value}</div>
    </div>
  );
}
