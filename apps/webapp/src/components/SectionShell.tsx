import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Decoration = {
  Icon: LucideIcon;
  className: string;
  iconClassName: string;
};

const shellContentClassName =
  'mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-7';

export default function SectionShell({
  children,
  backgroundClassName,
  decorations,
  contentClassName = '',
}: {
  children: ReactNode;
  backgroundClassName: string;
  decorations: Decoration[];
  contentClassName?: string;
}) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute inset-0 ${backgroundClassName}`} />
        {decorations.map(({ Icon, className, iconClassName }, index) => (
          <div key={`${Icon.displayName ?? Icon.name}-${index}`} className={className}>
            <Icon className={iconClassName} />
          </div>
        ))}
      </div>

      <div className="relative flex min-h-full w-full flex-1">
        <div className={`${shellContentClassName} ${contentClassName}`.trim()}>{children}</div>
      </div>
    </div>
  );
}
