import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import PrivacyAmount from '../../components/PrivacyAmount';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export const Route = createFileRoute('/calendar/')({
  component: CalendarPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarTx {
  id: string;
  description?: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status?: string;
  category?: { name: string; color?: string };
}

interface CalendarDay {
  date: string; // YYYY-MM-DD
  transactions: CalendarTx[];
  income: number;
  expense: number;
  hasPending: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Day Detail Panel ────────────────────────────────────────────────────────

function DayPanel({
  date,
  transactions,
  onClose,
}: {
  date: string;
  transactions: CalendarTx[];
  onClose: () => void;
}) {
  const label = new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-bold capitalize">{label}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-all text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-xs text-muted-foreground">Sem transações neste dia.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-500' : tx.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description ?? '—'}</p>
                  {tx.category && (
                    <p className="text-[10px] text-muted-foreground">{tx.category.name}</p>
                  )}
                </div>
                <PrivacyAmount
                  value={Number(tx.amount)}
                  className={`text-sm font-bold shrink-0 ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['calendar', from, to],
    queryFn: async () => {
      const res = await api.getFinancialCalendar<any>(from, to);
      return (Array.isArray(res) ? res : (res as any)?.data ?? []) as CalendarDay[];
    },
    staleTime: 1000 * 60,
  });

  const dayMap: Record<string, CalendarDay> = {};
  if (calendarData) {
    for (const d of calendarData) dayMap[d.date] = d;
  }

  // Build grid
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const totalCells = firstDow + lastDay;
  const rows = Math.ceil(totalCells / 7);

  const shiftMonth = (dir: -1 | 1) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const monthLabel = new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Calendário</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              Visualize suas transações por dia.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-2 py-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-bold capitalize min-w-[140px] text-center">{monthLabel}</p>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Receita</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />Despesa</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Pendente</span>
        </div>

        {/* Calendar grid */}
        <div className="card-premium overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                {wd}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className={`grid grid-cols-7`}>
              {Array.from({ length: rows * 7 }).map((_, idx) => {
                const dayNum = idx - firstDow + 1;
                const isValid = dayNum >= 1 && dayNum <= lastDay;
                if (!isValid) {
                  return <div key={idx} className="min-h-[72px] border-b border-r border-border/40 bg-muted/10" />;
                }

                const dateStr = isoDate(new Date(year, month, dayNum));
                const info = dayMap[dateStr];
                const isToday = dateStr === isoDate(now);
                const hasIncome = (info?.income ?? 0) > 0;
                const hasExpense = (info?.expense ?? 0) > 0;
                const hasPending = info?.hasPending ?? false;

                return (
                  <div
                    key={idx}
                    onClick={() => info && setSelectedDay(info)}
                    className={`min-h-[72px] p-2 border-b border-r border-border/40 flex flex-col gap-1 transition-all ${info ? 'cursor-pointer hover:bg-muted/30' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                  >
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}
                    >
                      {dayNum}
                    </span>
                    {info && (
                      <div className="flex flex-col gap-0.5 mt-auto">
                        {hasIncome && (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <PrivacyAmount
                              value={info.income}
                              className="text-[9px] font-bold text-emerald-600 truncate"
                            />
                          </div>
                        )}
                        {hasExpense && (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <PrivacyAmount
                              value={info.expense}
                              className="text-[9px] font-bold text-rose-500 truncate"
                            />
                          </div>
                        )}
                        {hasPending && (
                          <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wide">pend.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty state */}
        {!isLoading && !calendarData?.length && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CalendarDays className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Nenhuma transação encontrada neste mês.</p>
          </div>
        )}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <DayPanel
          date={selectedDay.date}
          transactions={selectedDay.transactions}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}
