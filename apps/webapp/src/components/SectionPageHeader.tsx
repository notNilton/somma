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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {backTo ? (
            <Link
              to={backTo}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-smooth hover:bg-muted/70 hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold tracking-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
    </div>
  );
}
