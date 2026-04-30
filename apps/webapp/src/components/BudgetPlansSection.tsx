import type { ReactNode } from 'react';
import DashboardPanel from './DashboardPanel';
import DashboardSectionHeader from './DashboardSectionHeader';

export default function BudgetPlansSection({
  eyebrow,
  title,
  count,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  count: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DashboardPanel>
      <DashboardSectionHeader eyebrow={eyebrow} title={title} count={count} actions={actions} />
      {children}
    </DashboardPanel>
  );
}
