import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import {
  LayoutGrid,
  Activity,
  ArrowLeftRight,
  Fuel,
  Target,
  Wallet,
  CalendarDays,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'panorama', to: '/' as const, icon: LayoutGrid, label: 'Panorama' },
  { id: 'transactions', to: '/transactions' as const, icon: Activity, label: 'Transações' },
  { id: 'transfers', to: '/transfers' as const, icon: ArrowLeftRight, label: 'Transf.' },
  { id: 'vehicles', to: '/vehicles' as const, icon: Fuel, label: 'Veículos' },
  { id: 'budgets', to: '/budgets' as const, icon: Target, label: 'Orçamentos' },
  { id: 'accounts', to: '/accounts' as const, icon: Wallet, label: 'Contas' },
  { id: 'calendar', to: '/calendar' as const, icon: CalendarDays, label: 'Calendário' },
];

// Triplicamos os itens para criar a ilusão de scroll infinito
const INFINITE_ITEMS = [...NAV_ITEMS, ...NAV_ITEMS, ...NAV_ITEMS];

export default function BottomNav() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const setWidth = el.scrollWidth / 3;
    el.scrollLeft = setWidth;

    let isJumping = false;

    const handleScroll = () => {
      if (isJumping) return;
      
      const { scrollLeft, scrollWidth } = el;
      const setWidth = scrollWidth / 3;

      if (scrollLeft >= setWidth * 2) {
        isJumping = true;
        el.scrollTo({ left: scrollLeft - setWidth, behavior: 'auto' });
        setTimeout(() => { isJumping = false; }, 50);
      } else if (scrollLeft <= setWidth / 4) { // Pula um pouco antes do zero absoluto pra evitar bugs
        isJumping = true;
        el.scrollTo({ left: scrollLeft + setWidth, behavior: 'auto' });
        setTimeout(() => { isJumping = false; }, 50);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg">
      <div
        ref={scrollRef}
        className="flex items-stretch overflow-x-auto no-scrollbar snap-x snap-mandatory"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {INFINITE_ITEMS.map(({ id, to, icon: Icon, label }, index) => (
          <Link
            key={`${id}-${index}`}
            to={to}
            className="flex flex-col items-center justify-center gap-0.5 py-2 min-w-[72px] min-h-[56px] text-muted-foreground text-[9px] font-bold uppercase tracking-tighter transition-colors snap-center"
            activeProps={{ className: 'text-primary' }}
            activeOptions={{ exact: to === '/' }}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate w-full text-center px-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
