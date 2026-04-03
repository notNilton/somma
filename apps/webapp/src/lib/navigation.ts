import {
  Activity,
  ArrowLeftRight,
  CalendarDays,
  Fuel,
  LayoutGrid,
  LineChart,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  to:
    | '/'
    | '/transactions'
    | '/transfers'
    | '/vehicles'
    | '/budgets'
    | '/accounts'
    | '/reports'
    | '/calendar'
    | '/settings';
  icon: LucideIcon;
  label: string;
  shortLabel?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export const navigationItems: NavigationItem[] = [
  { id: 'panorama', to: '/', icon: LayoutGrid, label: 'Panorama' },
  { id: 'transactions', to: '/transactions', icon: Activity, label: 'Transações' },
  { id: 'transfers', to: '/transfers', icon: ArrowLeftRight, label: 'Transferências', shortLabel: 'Transf.' },
  { id: 'vehicles', to: '/vehicles', icon: Fuel, label: 'Veículos' },
  { id: 'budgets', to: '/budgets', icon: Target, label: 'Orçamentos' },
  { id: 'accounts', to: '/accounts', icon: Wallet, label: 'Contas & Cartões', shortLabel: 'Contas' },
  { id: 'reports', to: '/reports', icon: LineChart, label: 'Relatórios', shortLabel: 'Reports' },
  { id: 'calendar', to: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { id: 'settings', to: '/settings', icon: Settings, label: 'Ajustes', mobileOnly: true },
];
