import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import DashboardPanel from './DashboardPanel';
import DashboardStatCard from './DashboardStatCard';

export type FinancialSummaryStat = {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: 'neutral' | 'income' | 'expense';
  className?: string;
};

export default function FinancialSummaryPanel({
  eyebrow,
  monthLabel,
  icon: Icon,
  stats,
  className = '',
  statsClassName = '',
}: {
  eyebrow: string;
  monthLabel: string;
  icon: LucideIcon;
  stats: FinancialSummaryStat[];
  className?: string;
  statsClassName?: string;
}) {
  return (
    <DashboardPanel className={`flex flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">{eyebrow}</p>
          <p className="mt-1 text-xs text-slate-500">{monthLabel}</p>
        </div>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>

      <div className={statsClassName}>
        {stats.map(({ title, value, icon, tone, className: statClassName }) => (
          <DashboardStatCard
            key={title}
            title={title}
            value={value}
            icon={icon}
            tone={tone}
            className={statClassName}
          />
        ))}
      </div>
    </DashboardPanel>
  );
}
