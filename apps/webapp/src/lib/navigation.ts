import { LayoutGrid, ReceiptText, Settings, type LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  to: '/' | '/transactions' | '/settings';
  icon: LucideIcon;
  label: string;
  shortLabel?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export const navigationItems: NavigationItem[] = [
  { id: 'dashboard', to: '/', icon: LayoutGrid, label: 'Dashboard' },
  {
    id: 'transactions',
    to: '/transactions',
    icon: ReceiptText,
    label: 'Transactions',
    shortLabel: 'Tx',
  },
  { id: 'config', to: '/settings', icon: Settings, label: 'Config' },
];
