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
      backgroundClassName="bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(226,232,240,0.94))]"
      decorations={[]}
      contentClassName={contentClassName}
    >
      {children}
    </SectionShell>
  );
}
