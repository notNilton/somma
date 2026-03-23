import { Link } from '@tanstack/react-router';
import { LayoutGrid, Activity, Wallet, Fuel, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/' as const, icon: LayoutGrid, label: 'Panorama' },
  { to: '/transactions' as const, icon: Activity, label: 'Transações' },
  { to: '/accounts' as const, icon: Wallet, label: 'Contas' },
  { to: '/vehicles' as const, icon: Fuel, label: 'Veículos' },
  { to: '/settings' as const, icon: Settings, label: 'Ajustes' },
];

export default function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg">
      <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-muted-foreground text-[10px] font-medium transition-colors"
            activeProps={{ className: 'text-primary' }}
            activeOptions={{ exact: to === '/' }}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
