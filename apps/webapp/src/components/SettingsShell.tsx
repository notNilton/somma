import { Lock, Shield, SlidersHorizontal, Sparkles, UserRound, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import SectionShell from './SectionShell';

export default function SettingsShell({
  children,
  contentClassName = '',
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <SectionShell
      backgroundClassName="bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(14,165,233,0.04))]"
      decorations={[
        {
          Icon: Shield,
          className: 'absolute -left-8 top-12 rotate-[-10deg] text-sky-500/[0.08]',
          iconClassName: 'h-28 w-28 sm:h-36 sm:w-36 lg:h-44 lg:w-44',
        },
        {
          Icon: SlidersHorizontal,
          className: 'absolute right-[7%] top-10 rotate-[12deg] text-slate-400/[0.08]',
          iconClassName: 'h-32 w-32 sm:h-40 sm:w-40 lg:h-52 lg:w-52',
        },
        {
          Icon: UserRound,
          className: 'absolute left-[28%] top-32 rotate-[7deg] text-sky-500/[0.05]',
          iconClassName: 'h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36',
        },
        {
          Icon: Wrench,
          className: 'absolute bottom-24 right-[14%] rotate-[-8deg] text-slate-400/[0.06]',
          iconClassName: 'h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40',
        },
        {
          Icon: Lock,
          className: 'absolute bottom-4 left-[10%] rotate-[9deg] text-sky-500/[0.05]',
          iconClassName: 'h-28 w-28 sm:h-40 sm:w-40 lg:h-52 lg:w-52',
        },
        {
          Icon: Sparkles,
          className: 'absolute right-[24%] top-[54%] rotate-[10deg] text-sky-500/[0.04]',
          iconClassName: 'h-16 w-16 sm:h-24 sm:w-24 lg:h-32 lg:w-32',
        },
      ]}
      contentClassName={contentClassName}
    >
      {children}
    </SectionShell>
  );
}
