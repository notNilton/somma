import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function SectionLoadingState({
  message = 'Carregando...',
}: {
  message?: string;
}) {
  return (
    <div className="card-premium flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function SectionEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-premium flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="rounded-2xl bg-muted/50 p-4 text-muted-foreground">
        <Icon className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        {description ? <p className="text-xs text-muted-foreground/80">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
