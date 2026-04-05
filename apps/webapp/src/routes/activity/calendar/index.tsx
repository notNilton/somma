import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api, unwrapData, type ApiDataResponse } from '../../../lib/api';
import PrivacyAmount from '../../../components/PrivacyAmount';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/activity/calendar/')({
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

const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex flex-col">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{new Date(date + 'T12:00:00Z').getFullYear()}</p>
            <p className="text-sm font-bold capitalize">{label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-all text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
               <div className="p-3 rounded-full bg-muted/50 text-muted-foreground">
                  <CalendarDays className="w-6 h-6" />
               </div>
               <p className="text-xs text-muted-foreground font-medium">Nenhuma transação registrada para este dia.</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-smooth group">
                <div
                  className={`w-1.5 h-6 rounded-full shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-500' : tx.status === 'PENDING' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-rose-500'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-primary transition-smooth">{tx.description ?? '—'}</p>
                  {tx.category && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.category.color || 'var(--muted-foreground)' }} />
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tx.category.name}</p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                   <PrivacyAmount
                    value={Number(tx.amount)}
                    className={`text-sm font-bold shrink-0 ${tx.type === 'INCOME' ? 'text-emerald-500 font-display' : 'text-foreground font-display'}`}
                  />
                  {tx.status === 'PENDING' && (
                    <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Aguardando</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border">
           <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-muted font-bold text-sm hover:bg-muted/80 transition-smooth">Fechar</button>
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
      const res = await api.getFinancialCalendar<
        CalendarDay[] | ApiDataResponse<CalendarDay[]>
      >(from, to);
      return unwrapData(res, []);
    },
    staleTime: 1000 * 60,
  });

  const dayMap: Record<string, CalendarDay> = {};
  let totalIncome = 0;
  let totalExpense = 0;
  let pendingCount = 0;

  if (calendarData) {
    for (const d of calendarData) {
      dayMap[d.date] = d;
      totalIncome += d.income;
      totalExpense += d.expense;
      if (d.hasPending) pendingCount++;
    }
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
      <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Calendário Financeiro</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acompanhe sua saúde financeira dia após dia.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-center sm:self-auto bg-muted/30 border border-border rounded-2xl p-1.5">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-2 rounded-xl hover:bg-background shadow-none hover:shadow-sm transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-bold capitalize min-w-[150px] text-center font-display tracking-tight">{monthLabel}</p>
            <button
              onClick={() => shiftMonth(1)}
              className="p-2 rounded-xl hover:bg-background shadow-none hover:shadow-sm transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumo Rápido */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             <div className="card-premium p-4 flex flex-col gap-1">
                <p className={labelCls}>Entradas</p>
                <div className="flex items-center gap-2">
                   <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                   <PrivacyAmount value={totalIncome} className="text-lg font-bold text-emerald-500 font-display" />
                </div>
             </div>
             <div className="card-premium p-4 flex flex-col gap-1">
                <p className={labelCls}>Saídas</p>
                <div className="flex items-center gap-2">
                   <ArrowDownLeft className="w-4 h-4 text-rose-500" />
                   <PrivacyAmount value={totalExpense} className="text-lg font-bold text-rose-500 font-display" />
                </div>
             </div>
             <div className="card-premium p-4 flex flex-col gap-1">
                <p className={labelCls}>Saldo Líquido</p>
                <PrivacyAmount value={totalIncome - totalExpense} className={`text-lg font-bold font-display ${totalIncome - totalExpense >= 0 ? 'text-primary' : 'text-rose-500'}`} />
             </div>
             <div className="card-premium p-4 flex flex-col gap-1">
                <p className={labelCls}>Alertas/Pendentes</p>
                <div className="flex items-center gap-2">
                   <AlertCircle className={`w-4 h-4 ${pendingCount > 0 ? 'text-amber-500' : 'text-muted-foreground/30'}`} />
                   <span className="text-lg font-bold font-display">{pendingCount} <span className="text-[10px] text-muted-foreground font-sans">DIAS</span></span>
                </div>
             </div>
          </div>
        )}

        {/* Legend e Stats */}
        <div className="flex items-center justify-between border-b border-border pb-2 px-1">
           <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Receita</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Despesa</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />Pendente</span>
            </div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">
               Visão mensal detalhada
            </div>
        </div>

        {/* Calendar grid */}
        <div className="card-premium overflow-hidden shadow-xl shadow-primary/5">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/10">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                {wd}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Carregando dados...</p>
            </div>
          ) : (
            <div className={`grid grid-cols-7 divide-x divide-y divide-border/50`}>
              {Array.from({ length: rows * 7 }).map((_, idx) => {
                const dayNum = idx - firstDow + 1;
                const isValid = dayNum >= 1 && dayNum <= lastDay;
                if (!isValid) {
                  return <div key={idx} className="min-h-[100px] bg-muted/5 border-b border-r border-border/5" />;
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
                    className={`min-h-[100px] p-3 flex flex-col gap-1.5 transition-smooth ${info ? 'cursor-pointer hover:bg-primary/5 group' : ''} ${isToday ? 'bg-primary/[0.03]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                       <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-smooth ${isToday ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground group-hover:text-foreground group-hover:bg-muted font-display'}`}
                      >
                        {dayNum}
                      </span>
                      {hasPending && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                      )}
                    </div>
                    
                    {info && (
                      <div className="flex flex-col gap-1.5 mt-auto">
                        {(hasIncome || hasExpense) ? (
                          <>
                            {hasIncome && (
                              <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <div className="flex items-center gap-1 min-w-0">
                                   <div className="w-1 h-3 rounded-full bg-emerald-500 shrink-0" />
                                   <PrivacyAmount
                                      value={info.income}
                                      className="text-[10px] font-bold text-emerald-600 truncate font-display"
                                    />
                                </div>
                                <ArrowUpRight className="w-2 h-2 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                            {hasExpense && (
                              <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <div className="flex items-center gap-1 min-w-0">
                                   <div className="w-1 h-3 rounded-full bg-rose-500 shrink-0" />
                                   <PrivacyAmount
                                      value={info.expense}
                                      className="text-[10px] font-bold text-rose-500 truncate font-display"
                                    />
                                </div>
                                <ArrowDownLeft className="w-2 h-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="h-4 flex items-center justify-center opacity-10 group-hover:opacity-30">
                             <div className="w-4 h-[1px] bg-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 py-4">
           <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
             Clique em um dia para ver os detalhes
           </p>
        </div>
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
