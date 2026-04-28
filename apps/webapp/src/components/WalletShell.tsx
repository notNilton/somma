import { Banknote, CarFront, CreditCard, Landmark, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import SectionShell from './SectionShell';

export default function WalletShell({
  children,
  contentClassName = '',
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <SectionShell
      backgroundClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),transparent_35%),radial-gradient(circle_at_20%_12%,rgba(125,211,252,0.22),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.18),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(226,232,240,0.94))]"
      decorations={[
        {
          Icon: Wallet,
          className: 'absolute -left-8 top-12 rotate-[-10deg] text-sky-700/[0.08]',
          iconClassName: 'h-28 w-28 sm:h-36 sm:w-36 lg:h-44 lg:w-44',
        },
        {
          Icon: CreditCard,
          className: 'absolute right-[7%] top-10 rotate-[12deg] text-slate-500/[0.08]',
          iconClassName: 'h-32 w-32 sm:h-40 sm:w-40 lg:h-52 lg:w-52',
        },
        {
          Icon: Landmark,
          className: 'absolute left-[26%] top-32 rotate-[6deg] text-sky-700/[0.05]',
          iconClassName: 'h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36',
        },
        {
          Icon: CarFront,
          className: 'absolute bottom-24 right-[14%] rotate-[-10deg] text-slate-500/[0.06]',
          iconClassName: 'h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40',
        },
        {
          Icon: Banknote,
          className: 'absolute bottom-4 left-[10%] rotate-[8deg] text-sky-700/[0.05]',
          iconClassName: 'h-28 w-28 sm:h-40 sm:w-40 lg:h-52 lg:w-52',
        },
        {
          Icon: CreditCard,
          className: 'absolute left-[6%] top-[44%] rotate-[-8deg] text-slate-500/[0.04]',
          iconClassName: 'h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40',
        },
        {
          Icon: Wallet,
          className: 'absolute right-[24%] top-[54%] rotate-[10deg] text-sky-700/[0.04]',
          iconClassName: 'h-16 w-16 sm:h-24 sm:w-24 lg:h-32 lg:w-32',
        },
      ]}
      contentClassName={contentClassName}
    >
      {children}
    </SectionShell>
  );
}
