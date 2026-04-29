import type { ReactNode } from 'react';
import SectionShell from './SectionShell';

export default function SettingsShell({
  children,
  contentClassName = 'settings-starfield',
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <SectionShell
      backgroundClassName="transactions-bg-starfield"
      decorations={[]}
      contentClassName={contentClassName}
    >
      {children}
    </SectionShell>
  );
}
