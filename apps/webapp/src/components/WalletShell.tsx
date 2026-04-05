import type { ReactNode } from 'react';
import { Banknote, CarFront, CreditCard, Landmark, Wallet } from 'lucide-react';

export default function WalletShell({
  children,
  contentClassName = '',
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(16,185,129,0.04))]" />
        <div className="absolute -left-8 top-12 rotate-[-10deg] text-emerald-500/[0.08]">
          <Wallet className="h-28 w-28 sm:h-36 sm:w-36 lg:h-44 lg:w-44" />
        </div>
        <div className="absolute right-[7%] top-10 rotate-[12deg] text-teal-500/[0.07]">
          <CreditCard className="h-32 w-32 sm:h-40 sm:w-40 lg:h-52 lg:w-52" />
        </div>
        <div className="absolute left-[26%] top-30 rotate-[6deg] text-emerald-500/[0.05]">
          <Landmark className="h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36" />
        </div>
        <div className="absolute bottom-24 right-[14%] rotate-[-10deg] text-teal-500/[0.06]">
          <CarFront className="h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40" />
        </div>
        <div className="absolute bottom-4 left-[10%] rotate-[8deg] text-emerald-500/[0.05]">
          <Banknote className="h-28 w-28 sm:h-40 sm:w-40 lg:h-52 lg:w-52" />
        </div>
        <div className="absolute left-[6%] top-[44%] rotate-[-8deg] text-teal-500/[0.04]">
          <CreditCard className="h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40" />
        </div>
        <div className="absolute right-[24%] top-[54%] rotate-[10deg] text-emerald-500/[0.04]">
          <Wallet className="h-16 w-16 sm:h-24 sm:w-24 lg:h-32 lg:w-32" />
        </div>
      </div>

      <div className="relative h-full min-h-full w-full pt-6 pb-12 sm:pt-7 sm:pb-14">
        <div className={`mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:gap-6 sm:p-6 ${contentClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}
