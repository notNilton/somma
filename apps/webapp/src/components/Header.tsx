import { Link } from '@tanstack/react-router';
import { navigationItems } from '../lib/navigation';

const DESKTOP_NAV_ITEMS = navigationItems.filter((item) => !item.mobileOnly && !item.desktopOnly);

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 px-4 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 py-3 sm:py-4">
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
          {DESKTOP_NAV_ITEMS.map(({ id, to, icon: Icon, label }) => (
            <Link
              key={id}
              to={to}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth whitespace-nowrap"
              activeProps={{ className: 'text-foreground bg-accent' }}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
