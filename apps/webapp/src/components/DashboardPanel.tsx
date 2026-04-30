import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type DashboardPanelProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export default function DashboardPanel<T extends ElementType = 'section'>({
  as,
  children,
  className = '',
  ...props
}: DashboardPanelProps<T>) {
  const Component = (as ?? 'section') as ElementType;

  return (
    <Component
      {...props}
      className={`overflow-visible border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,246,250,0.84))] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_14px_32px_rgba(15,23,42,0.06)] transition-colors hover:border-sky-400/50 ${className}`.trim()}
    >
      {children}
    </Component>
  );
}
