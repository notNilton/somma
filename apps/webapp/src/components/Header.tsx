import { Link } from '@tanstack/react-router';
import {
  CircleDollarSign,
  Eye,
  EyeOff,
  LayoutGrid,
  Activity,
  LogOut,
  User,
  Fuel,
  Wallet,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { usePrivacy } from '../lib/privacy';
import { auth } from '../lib/auth';

export default function Header() {
  const { privacyMode, togglePrivacy } = usePrivacy();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
      <nav className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity px-2 py-1"
          >
            <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground tracking-tighter">
              Mirante
            </span>
          </Link>
        </h2>

        <div className="hidden sm:flex items-center gap-1.5 ml-8">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            activeProps={{ className: 'text-foreground bg-accent' }}
          >
            <LayoutGrid className="w-4 h-4" />
            Panorama
          </Link>
          <Link
            to="/transactions"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            activeProps={{ className: 'text-foreground bg-accent' }}
          >
            <Activity className="w-4 h-4" />
            Transações
          </Link>
          {/* Orçamentos/Metas removidos (Budget/Goal) */}
          <Link
            to="/accounts"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            activeProps={{ className: 'text-foreground bg-accent' }}
          >
            <Wallet className="w-4 h-4" />
            Contas
          </Link>
          <Link
            to="/vehicles"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            activeProps={{ className: 'text-foreground bg-accent' }}
          >
            <Fuel className="w-4 h-4" />
            Veículos
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={togglePrivacy}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            title="Modo Oculto"
          >
            {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <ThemeToggle />
          <div className="w-[1px] h-4 bg-border mx-1" />
          <Link
            to="/settings"
            className="hidden sm:flex p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            title="Perfil"
          >
            <User className="w-5 h-5" />
          </Link>
          <button
            onClick={() => auth.logout()}
            className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-smooth"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </header>
  );
}
