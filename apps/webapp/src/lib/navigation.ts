import { ArrowLeftRight, LayoutGrid, Settings, Target, Wallet, type LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  to: '/' | '/activity' | '/wallet' | '/planning' | '/settings';
  icon: LucideIcon;
  label: string;
  shortLabel?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export const navigationItems: NavigationItem[] = [
  { id: 'panorama', to: '/', icon: LayoutGrid, label: 'Panorama' },
  { id: 'activity', to: '/activity', icon: ArrowLeftRight, label: 'Movimentacoes', shortLabel: 'Mov.' },
  { id: 'wallet', to: '/wallet', icon: Wallet, label: 'Carteira' },
  { id: 'planning', to: '/planning', icon: Target, label: 'Planejamento', shortLabel: 'Plano' },
  { id: 'settings', to: '/settings', icon: Settings, label: 'Ajustes', mobileOnly: true },
];
