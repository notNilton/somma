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
      backgroundClassName="bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(14,165,233,0.03))]"
      decorations={[]}
      contentClassName={contentClassName}
    >
      {children}
    </SectionShell>
  );
}
