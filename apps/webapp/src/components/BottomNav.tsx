import { Link } from '@tanstack/react-router';
import { navigationItems } from '../lib/navigation';

const MOBILE_NAV_ITEMS = navigationItems;

export default function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg">
      <div className="grid grid-cols-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MOBILE_NAV_ITEMS.map(({ id, to, icon: Icon, label, shortLabel }) => (
          <Link
            key={id}
            to={to}
            className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-muted-foreground text-[9px] font-bold uppercase tracking-tighter transition-colors"
            activeProps={{ className: 'text-primary' }}
            activeOptions={{ exact: to === '/' }}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate w-full text-center px-1">{shortLabel ?? label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
