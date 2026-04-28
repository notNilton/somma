import { Link } from '@tanstack/react-router';
import { CircleDollarSign, User } from 'lucide-react';
import { navigationItems } from '../lib/navigation';

const DESKTOP_NAV_ITEMS = navigationItems.filter((item) => !item.mobileOnly && !item.desktopOnly);

export default function Header() {
  return (
    <header className="hidden sm:block sticky top-0 z-50 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
      <nav className="max-w-7xl mx-auto flex items-center gap-1 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight mr-6 hidden min-[1100px]:flex">
          <Link
            to="/"
            className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity px-2 py-1"
          >
            <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground tracking-tighter">
              AureaFlow
            </span>
          </Link>
        </h2>

        <div className="hidden sm:flex items-center gap-0.5 flex-1 min-w-0">
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

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Link
            to="/settings"
            className="hidden sm:flex p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            title="Perfil"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
