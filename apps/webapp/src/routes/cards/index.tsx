import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import PrivacyAmount from '../../components/PrivacyAmount';
import {
  CreditCard,
  Loader2,
  X,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Route = createFileRoute('/cards/')({
  component: CardsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  name: string;
  lastFour?: string;
  brand?: string;
  color?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  accountId?: string;
  account?: { name: string; balance: number };
}

interface StatementTx {
  id: string;
  description?: string;
  amount: number;
  date: string;
  category?: { name: string; color?: string };
  classification?: string;
}

interface Statement {
  card: Card;
  transactions: StatementTx[];
  totalAmount: number;
  from?: string;
  to?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  VISA: '#1A1F71',
  MASTERCARD: '#EB001B',
  ELO: '#FFD700',
  AMEX: '#007BC1',
};

function getBrandColor(brand?: string) {
  return brand ? (BRAND_COLORS[brand.toUpperCase()] ?? '#6366f1') : '#6366f1';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function currentPeriod(closingDay = 1) {
  const now = new Date();
  const day = now.getDate();
  let from: Date, to: Date;
  if (day <= closingDay) {
    from = new Date(now.getFullYear(), now.getMonth() - 1, closingDay + 1);
    to = new Date(now.getFullYear(), now.getMonth(), closingDay);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), closingDay + 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { from: fmt(from), to: fmt(to) };
}

// ─── Statement Drawer ────────────────────────────────────────────────────────

function StatementDrawer({ card, onClose }: { card: Card; onClose: () => void }) {
  const period = currentPeriod(card.closingDay);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);

  const { data: statement, isLoading } = useQuery({
    queryKey: ['card-statement', card.id, from, to],
    queryFn: async () => {
      const res = await api.getCardStatement<any>(card.id, from, to);
      return res as Statement;
    },
    staleTime: 1000 * 60,
  });

  const txs: StatementTx[] = Array.isArray(statement?.transactions)
    ? statement!.transactions
    : [];
  const total = statement?.totalAmount ?? txs.reduce((s, t) => s + Number(t.amount), 0);

  const shiftPeriod = (dir: -1 | 1) => {
    const d = new Date(from);
    d.setMonth(d.getMonth() + dir);
    const closing = card.closingDay ?? 1;
    const newFrom = new Date(d.getFullYear(), d.getMonth(), closing + 1);
    const newTo = new Date(d.getFullYear(), d.getMonth() + 1, closing);
    const fmt = (dt: Date) => dt.toISOString().split('T')[0];
    setFrom(fmt(newFrom));
    setTo(fmt(newTo));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-full overflow-hidden z-10">
        {/* Header */}
        <div
          className="p-5 flex flex-col gap-1"
          style={{ background: `linear-gradient(135deg, ${getBrandColor(card.brand)}22, transparent)` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${getBrandColor(card.brand)}20`, color: getBrandColor(card.brand) }}
              >
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold">{card.name}</p>
                {card.lastFour && (
                  <p className="text-[10px] text-muted-foreground">•••• {card.lastFour}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Period navigator */}
          <div className="flex items-center justify-between bg-muted/30 rounded-xl p-2">
            <button
              onClick={() => shiftPeriod(-1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Período
              </p>
              <p className="text-xs font-bold">{fmtDate(from)} → {fmtDate(to)}</p>
            </div>
            <button
              onClick={() => shiftPeriod(1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Total */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total do período
            </p>
            <PrivacyAmount value={total} className="text-xl font-bold font-display text-rose-500" />
          </div>
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : txs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
              <p className="text-sm text-muted-foreground">Nenhuma transação neste período.</p>
            </div>
          ) : (
            txs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-all">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tx.category?.name && `${tx.category.name} · `}
                    {fmtDate(tx.date)}
                  </p>
                </div>
                <PrivacyAmount value={Number(tx.amount)} className="text-sm font-bold text-rose-500 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card Chip ────────────────────────────────────────────────────────────────

function CardChip({ card, onClick }: { card: Card; onClick: () => void }) {
  const color = getBrandColor(card.brand);
  const limit = Number(card.creditLimit ?? 0);
  const balance = Number(card.account?.balance ?? 0);
  const used = limit > 0 ? Math.max(0, limit + balance) : 0;
  const available = limit > 0 ? limit - used : 0;
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <div
      onClick={onClick}
      className="card-premium p-5 cursor-pointer group hover:shadow-lg transition-all active:scale-[0.98]"
      style={{ background: `linear-gradient(135deg, ${color}15, transparent)` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <CreditCard className="w-5 h-5" />
        </div>
        {card.brand && (
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
          >
            {card.brand}
          </span>
        )}
      </div>

      <p className="text-base font-bold font-display">{card.name}</p>
      {card.lastFour && (
        <p className="text-xs text-muted-foreground mt-0.5">•••• •••• •••• {card.lastFour}</p>
      )}

      {limit > 0 && (
        <div className="mt-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Disponível
            </span>
            <PrivacyAmount value={available} className="text-[10px] font-bold text-emerald-500" />
          </div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">Usado</span>
            <PrivacyAmount value={used} className="text-[9px] text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {card.closingDay && (
          <span className="text-[9px] font-bold bg-muted/50 px-1.5 py-0.5 rounded">
            Fecha dia {card.closingDay}
          </span>
        )}
        {card.dueDay && (
          <span className="text-[9px] font-bold bg-muted/50 px-1.5 py-0.5 rounded">
            Vence dia {card.dueDay}
          </span>
        )}
      </div>

      <button className="mt-3 w-full py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all group-hover:border-primary/30">
        Ver Fatura
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CardsPage() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const res = await api.listCards<any>();
      return (Array.isArray(res) ? res : (res as any)?.data ?? []) as Card[];
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">Cartões</h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Visualize suas faturas e limites disponíveis.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : cards.length === 0 ? (
          <div className="card-premium flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground">
              <CreditCard className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Nenhum cartão cadastrado</p>
            <p className="text-xs text-muted-foreground/70">
              Adicione contas do tipo "Crédito" para ver seus cartões aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => (
              <CardChip key={card.id} card={card} onClick={() => setSelectedCard(card)} />
            ))}
          </div>
        )}
      </div>

      {selectedCard && (
        <StatementDrawer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  );
}
