import { LayoutGrid, PiggyBank, Settings, type LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  to: '/' | '/budgets' | '/settings';
  icon: LucideIcon;
  label: string;
  shortLabel?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export const navigationItems: NavigationItem[] = [
  { id: 'dashboard', to: '/', icon: LayoutGrid, label: 'Dashboard' },
  { id: 'budgets', to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { id: 'config', to: '/settings', icon: Settings, label: 'Config' },
];
