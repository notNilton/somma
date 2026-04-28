import type { ReactNode } from 'react';
import SectionShell from './SectionShell';

export default function ActivityShell({
  children,
  contentClassName = '',
  starfield = false,
}: {
  children: ReactNode;
  contentClassName?: string;
  starfield?: boolean;
}) {
  const shellContentClassName = [contentClassName, starfield ? 'wallet-starfield' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <SectionShell
      backgroundClassName={
        starfield
          ? 'bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))]'
          : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(99,102,241,0.04))]'
      }
      decorations={[]}
      contentClassName={shellContentClassName}
    >
      {children}
    </SectionShell>
  );
}
