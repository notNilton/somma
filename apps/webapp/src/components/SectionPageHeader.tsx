import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export default function SectionPageHeader({
  title,
  description,
  actions,
  backTo,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backTo?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <div className="flex items-start gap-2.5 sm:items-center sm:gap-3">
          {backTo ? (
            <Link
              to={backTo}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-smooth hover:bg-muted/70 hover:text-foreground sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold tracking-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
