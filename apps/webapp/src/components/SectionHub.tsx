import { Link } from '@tanstack/react-router';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface SectionHubItem {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  eyebrow?: string;
}

export default function SectionHub({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: SectionHubItem[];
}) {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/80">
          Navegacao
        </p>
        <h1 className="text-xl sm:text-2xl font-display font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.map(({ title: itemTitle, description: itemDescription, to, icon: Icon, eyebrow }) => (
          <Link
            key={to}
            to={to}
            className="card-premium p-4 sm:p-5 flex flex-col gap-4 border border-border/70 hover:border-primary/30 hover:bg-accent/30 transition-smooth group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/10">
                <Icon className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-smooth shrink-0" />
            </div>

            <div className="space-y-1">
              {eyebrow ? (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {eyebrow}
                </p>
              ) : null}
              <h2 className="text-base font-bold">{itemTitle}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{itemDescription}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
