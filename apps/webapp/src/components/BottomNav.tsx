import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { navigationItems } from '../lib/navigation';

const MOBILE_NAV_ITEMS = navigationItems.filter((item) => !item.desktopOnly);
const INFINITE_ITEMS = [...MOBILE_NAV_ITEMS, ...MOBILE_NAV_ITEMS, ...MOBILE_NAV_ITEMS];

export default function BottomNav() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const width = el.scrollWidth / 3;
    el.scrollLeft = width;

    let isJumping = false;

    const handleScroll = () => {
      if (isJumping) return;

      const { scrollLeft, scrollWidth } = el;
      const setWidth = scrollWidth / 3;

      if (scrollLeft >= setWidth * 2) {
        isJumping = true;
        el.scrollTo({ left: scrollLeft - setWidth, behavior: 'auto' });
        setTimeout(() => {
          isJumping = false;
        }, 50);
      } else if (scrollLeft <= setWidth / 4) {
        isJumping = true;
        el.scrollTo({ left: scrollLeft + setWidth, behavior: 'auto' });
        setTimeout(() => {
          isJumping = false;
        }, 50);
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
        {INFINITE_ITEMS.map(({ id, to, icon: Icon, label, shortLabel }, index) => (
          <Link
            key={`${id}-${index}`}
            to={to}
            className="flex flex-col items-center justify-center gap-0.5 py-2 min-w-[72px] min-h-[56px] text-muted-foreground text-[9px] font-bold uppercase tracking-tighter transition-colors snap-center"
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
