import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PrivacyAmount from '../../components/PrivacyAmount';
import Fab from '../../components/Fab';
import {
  Plus,
  Wallet,
  Building,
  PiggyBank,
  Banknote,
  Edit2,
  Trash2,
  Loader2,
  CreditCard,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api, unwrapData, type ApiDataResponse } from '../../lib/api';

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
});

// ─── Card types & helpers ─────────────────────────────────────────────────────

interface Card {
  id: string;
  name: string;
  lastFour?: string;
  brand?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  account?: { name: string; balance: number };
}

interface StatementTx {
  id: string;
  description?: string;
  amount: number;
  date: string;
  category?: { name: string; color?: string };
}

interface Statement {
  transactions: StatementTx[];
  totalAmount: number;
}

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

function StatementDrawer({ card, onClose }: { card: Card; onClose: () => void }) {
  const period = currentPeriod(card.closingDay);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);

  const { data: statement, isLoading } = useQuery({
    queryKey: ['card-statement', card.id, from, to],
    queryFn: () => api.getCardStatement<Statement>(card.id, from, to),
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

  const color = getBrandColor(card.brand);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-full overflow-hidden z-10">
        <div className="p-5 flex flex-col gap-3" style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20`, color }}>
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold">{card.name}</p>
                {card.lastFour && <p className="text-[10px] text-muted-foreground">•••• {card.lastFour}</p>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between bg-muted/30 rounded-xl p-2">
            <button onClick={() => shiftPeriod(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Período</p>
              <p className="text-xs font-bold">{fmtDate(from)} → {fmtDate(to)}</p>
            </div>
            <button onClick={() => shiftPeriod(1)} className="p-1.5 rounded-lg hover:bg-muted transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
            <PrivacyAmount value={total} className="text-xl font-bold font-display text-rose-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : txs.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">Nenhuma transação neste período.</p>
          ) : (
            txs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-all">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.category?.name && `${tx.category.name} · `}{fmtDate(tx.date)}</p>
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
      className="card-premium p-4 cursor-pointer group hover:shadow-lg transition-all active:scale-[0.98] flex flex-col gap-2"
      style={{ background: `linear-gradient(135deg, ${color}10, transparent)` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20`, color }}>
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold">{card.name}</p>
            {card.lastFour && <p className="text-[10px] text-muted-foreground">•••• {card.lastFour}</p>}
          </div>
        </div>
        {card.brand && (
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
          >
            {card.brand}
          </span>
        )}
      </div>
      {limit > 0 && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Disponível</span>
            <PrivacyAmount value={available} className="text-[10px] font-bold text-emerald-500" />
          </div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        {card.closingDay && <span className="text-[9px] font-bold bg-muted/50 px-1.5 py-0.5 rounded">Fecha dia {card.closingDay}</span>}
        {card.dueDay && <span className="text-[9px] font-bold bg-muted/50 px-1.5 py-0.5 rounded">Vence dia {card.dueDay}</span>}
        <span className="ml-auto text-[9px] font-bold text-primary group-hover:underline">Ver fatura →</span>
      </div>
    </div>
  );
}

export interface Account {
  id: string;
  name: string;
  balance: number | string;
  creditLimit?: number | string | null;
  closingDay?: number | null;
  dueDay?: number | null;
  type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'WALLET' | 'INVESTMENT';
  color: string;
  icon: string;
  ownership?: string;
  bankName?: string;
  cpf?: string;
  cnpj?: string;
  hasDebit?: boolean;
  hasPix?: boolean;
  hasCredit?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Corrente',
  SAVINGS: 'Poupança',
  CASH: 'Dinheiro',
  WALLET: 'Carteira',
  INVESTMENT: 'Invest.',
};

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  Building,
  PiggyBank,
  Banknote,
};

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: Account;
  onEdit: (a: Account) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = ICON_MAP[account.icon] ?? Wallet;
  const creditLimitValue = Number(account.creditLimit ?? 0);
  const hasCredit = creditLimitValue > 0;

  return (
    <div
      onClick={() => onEdit(account)}
      className="card-premium p-4 group relative flex flex-col gap-3 cursor-pointer active:bg-muted/20 transition-smooth"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-lg border shrink-0"
            style={{
              backgroundColor: `${account.color}15`,
              color: account.color,
              borderColor: `${account.color}30`,
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{account.name}</p>
            {account.bankName && (
              <p className="text-[10px] text-muted-foreground/60 leading-tight">
                {account.bankName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {TYPE_LABELS[account.type] ?? account.type}
          </span>
          {/* Ações: sempre visíveis no mobile, hover no desktop */}
          <div className="flex gap-0.5 ml-1 sm:opacity-0 sm:group-hover:opacity-100 transition-smooth">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(account);
              }}
              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-smooth"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(account.id);
              }}
              className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-smooth"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">Saldo</p>
          <p className="text-xl font-bold font-display tracking-tight">
            <PrivacyAmount value={Number(account.balance)} />
          </p>
          {hasCredit && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Limite:{' '}
              <PrivacyAmount
                value={creditLimitValue}
                className="inline font-bold text-violet-600"
              />
            </p>
          )}
          {hasCredit && (account.closingDay || account.dueDay) && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {account.closingDay ? `Fecha dia ${account.closingDay}` : ''}
              {account.closingDay && account.dueDay ? ' · ' : ''}
              {account.dueDay ? `Vence dia ${account.dueDay}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {(account.hasDebit ?? true) && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Déb
            </span>
          )}
          {(account.hasPix ?? true) && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
              PIX
            </span>
          )}
          {hasCredit && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 border border-violet-500/20">
              Cred
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: '/accounts/' });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/api/v1/accounts'),
  });

  const { data: creditSummary } = useQuery({
    queryKey: ['accounts', 'credit-summary'],
    queryFn: () =>
      api.get<{ totalCreditLimit: number; creditUsed: number; availableCredit: number }>(
        '/api/v1/accounts/credit-summary',
      ),
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const res = await api.listCards<Card[] | ApiDataResponse<Card[]>>();
      return unwrapData(res, []);
    },
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const totalBalance = accounts.reduce((acc, a) => acc + Math.max(0, Number(a.balance)), 0);
  const hasCreditSummary = (creditSummary?.totalCreditLimit ?? 0) > 0;

  const handleCreate = () =>
    void navigate({ to: '/accounts/crud-accounts', search: { accountId: undefined } });

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta conta? As transações vinculadas serão mantidas.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Contas</h1>
        <button
          onClick={handleCreate}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Conta
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="card-premium p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Patrimônio total
              </p>
              <PrivacyAmount
                value={totalBalance}
                className="text-xl sm:text-2xl font-bold font-display tracking-tight"
              />
            </div>
            {hasCreditSummary && (
              <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Limite
                  </p>
                  <PrivacyAmount
                    value={creditSummary!.totalCreditLimit}
                    className="text-sm font-bold text-violet-600 block"
                  />
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Usado
                  </p>
                  <PrivacyAmount
                    value={creditSummary!.creditUsed}
                    className="text-sm font-bold text-rose-500 block"
                  />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Disponível
                  </p>
                  <PrivacyAmount
                    value={creditSummary!.availableCredit}
                    className="text-sm font-bold text-emerald-600 block"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={(a) =>
                  void navigate({ to: '/accounts/crud-accounts', search: { accountId: a.id } })
                }
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Cartões de crédito */}
          {cards.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" />
                Cartões de Crédito
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cards.map((card) => (
                  <CardChip key={card.id} card={card} onClick={() => setSelectedCard(card)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* FAB mobile */}
      <Fab label="Nova conta" onClick={handleCreate} />

      {/* Statement drawer */}
      {selectedCard && (
        <StatementDrawer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
}
