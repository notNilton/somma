import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrapData, type ApiDataResponse } from '../../../lib/api';
import PrivacyAmount from '../../../components/PrivacyAmount';
import Fab from '../../../components/Fab';
import WalletShell from '../../../components/WalletShell';
import { SectionEmptyState, SectionLoadingState } from '../../../components/SectionFeedback';
import SectionPageHeader from '../../../components/SectionPageHeader';
import {
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit2,
  Loader2,
  Plus,
  Receipt,
  Save,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

export const Route = createFileRoute('/wallet/cards/')({
  component: CardsPage,
});

interface Card {
  id: string;
  accountId: string;
  name: string;
  last4?: string;
  brand?: string;
  color?: string;
  type: 'CREDIT' | 'DEBIT';
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

interface AccountOption {
  id: string;
  name: string;
}

interface StatementTx {
  id: string;
  description?: string;
  amount: number;
  date: string;
  category?: { name?: string; color?: string };
  classification?: string;
  type?: string;
}

interface StatementResponse {
  periodFrom?: string;
  periodTo?: string;
  total?: number;
  totalAmount?: number;
  invoicePayments?: number;
  realExpenses?: number;
  transactions?: StatementTx[];
}

const BRAND_COLORS: Record<string, string> = {
  VISA: '#1A1F71',
  MASTERCARD: '#EB001B',
  ELO: '#FFD700',
  AMEX: '#007BC1',
};

const CARD_BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex'];

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

function getBrandColor(brand?: string) {
  return brand ? (BRAND_COLORS[brand.toUpperCase()] ?? '#6366f1') : '#6366f1';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function currentPeriod(closingDay = 1) {
  const now = new Date();
  const day = now.getDate();
  let from: Date;
  let to: Date;
  if (day <= closingDay) {
    from = new Date(now.getFullYear(), now.getMonth() - 1, closingDay + 1);
    to = new Date(now.getFullYear(), now.getMonth(), closingDay);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), closingDay + 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
  }
  const fmt = (date: Date) => date.toISOString().split('T')[0];
  return { from: fmt(from), to: fmt(to) };
}

function normalizeStatement(statement: StatementResponse | null | undefined) {
  const txs = Array.isArray(statement?.transactions) ? statement.transactions : [];
  return {
    txs,
    total: Number(statement?.total ?? statement?.totalAmount ?? 0),
    invoicePayments: Number(statement?.invoicePayments ?? 0),
    realExpenses: Number(statement?.realExpenses ?? 0),
  };
}

function CardFormModal({
  accounts,
  card,
  isSaving,
  error,
  onClose,
  onSubmit,
}: {
  accounts: AccountOption[];
  card?: Card | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    accountId: string;
    name: string;
    brand?: string;
    last4?: string;
    type: 'CREDIT' | 'DEBIT';
    creditLimit?: number | null;
    closingDay?: number | null;
    dueDay?: number | null;
  }) => Promise<void>;
}) {
  const [accountId, setAccountId] = useState(card?.accountId ?? accounts[0]?.id ?? '');
  const [name, setName] = useState(card?.name ?? '');
  const [brand, setBrand] = useState(card?.brand ?? '');
  const [last4, setLast4] = useState(card?.last4 ?? '');
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>(card?.type ?? 'CREDIT');
  const [creditLimit, setCreditLimit] = useState(
    card?.creditLimit ? Math.round(Number(card.creditLimit) * 100).toString() : '0',
  );
  const [closingDay, setClosingDay] = useState(card?.closingDay ? String(card.closingDay) : '');
  const [dueDay, setDueDay] = useState(card?.dueDay ? String(card.dueDay) : '');

  const isCredit = type === 'CREDIT';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit({
      accountId,
      name: name.trim(),
      brand: brand.trim() || undefined,
      last4: last4.trim() || undefined,
      type,
      creditLimit: isCredit ? Number(creditLimit || '0') / 100 : null,
      closingDay: isCredit && closingDay ? Number(closingDay) : null,
      dueDay: isCredit && dueDay ? Number(dueDay) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold font-display">
                {card ? 'Editar cartão' : 'Novo cartão'}
              </p>
              <p className="text-xs text-muted-foreground">
                Cadastre cartões de crédito ou débito vinculados às suas contas.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Conta</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={inputCls}
                required
              >
                <option value="" disabled>
                  Selecione
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'CREDIT' | 'DEBIT')}
                className={inputCls}
              >
                <option value="CREDIT">Crédito</option>
                <option value="DEBIT">Débito</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome do cartão</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Ex: Nubank Roxinho"
              />
            </div>
            <div>
              <label className={labelCls}>Bandeira</label>
              <input
                list="card-brand-options"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={inputCls}
                placeholder="Ex: Visa"
              />
              <datalist id="card-brand-options">
                {CARD_BRANDS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Últimos 4 dígitos</label>
              <input
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={inputCls}
                inputMode="numeric"
                placeholder="1234"
              />
            </div>
          </div>

          {isCredit && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Limite</label>
                <input
                  value={(Number(creditLimit || '0') / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                  onChange={(e) => setCreditLimit(e.target.value.replace(/\D/g, ''))}
                  className={inputCls}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className={labelCls}>Fechamento</label>
                <input
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="3"
                />
              </div>
              <div>
                <label className={labelCls}>Vencimento</label>
                <input
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="10"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {card ? 'Salvar alterações' : 'Criar cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PayInvoiceModal({
  card,
  total,
  accounts,
  isSaving,
  error,
  onClose,
  onSubmit,
}: {
  card: Card;
  total: number;
  accounts: AccountOption[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    accountId: string;
    amount: number;
    date: string;
    description: string;
  }) => Promise<void>;
}) {
  const [accountId, setAccountId] = useState(card.accountId || accounts[0]?.id || '');
  const [amount, setAmount] = useState(Math.round(Math.max(total, 0) * 100).toString());
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(`Pagamento da fatura ${card.name}`);

  const canSubmit = Number(amount) > 0 && accountId;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold font-display">Pagar fatura</p>
            <p className="text-xs text-muted-foreground">{card.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total da fatura
          </p>
          <PrivacyAmount value={total} className="text-xl font-bold font-display text-rose-500" />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
            {error}
          </div>
        )}

        <div>
          <label className={labelCls}>Conta pagadora</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Selecione
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Valor pago</label>
          <input
            value={(Number(amount || '0') / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            className={inputCls}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelCls}>Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Descrição</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit || isSaving}
            onClick={() =>
              void onSubmit({
                accountId,
                amount: Number(amount) / 100,
                date,
                description: description.trim() || `Pagamento da fatura ${card.name}`,
              })
            }
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            Confirmar pagamento
          </button>
        </div>
      </div>
    </div>
  )
}

function StatementDrawer({
  card,
  accounts,
  onClose,
}: {
  card: Card;
  accounts: AccountOption[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const period = currentPeriod(card.closingDay);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: statement, isLoading } = useQuery({
    queryKey: ['card-statement', card.id, from, to],
    queryFn: () => api.getCardStatement<StatementResponse>(card.id, from, to),
    staleTime: 1000 * 60,
  });

  const payInvoiceMutation = useMutation({
    mutationFn: (payload: {
      accountId: string;
      amount: number;
      date: string;
      description: string;
    }) =>
      api.post('/api/v1/transactions', {
        accountId: payload.accountId,
        cardId: card.id,
        amount: payload.amount,
        date: payload.date,
        description: payload.description,
        type: 'INCOME',
        classification: 'TRANSFER',
        paymentMethod: 'DEBIT',
        channel: 'BANK',
        status: 'COMPLETED',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['card-statement', card.id] }),
        queryClient.invalidateQueries({ queryKey: ['cards'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      setPaymentError(null);
      setShowPayModal(false);
    },
    onError: (error) => {
      setPaymentError(error instanceof Error ? error.message : 'Erro ao registrar pagamento.');
    },
  });

  const shiftPeriod = (dir: -1 | 1) => {
    const date = new Date(from);
    date.setMonth(date.getMonth() + dir);
    const closing = card.closingDay ?? 1;
    const newFrom = new Date(date.getFullYear(), date.getMonth(), closing + 1);
    const newTo = new Date(date.getFullYear(), date.getMonth() + 1, closing);
    const fmt = (value: Date) => value.toISOString().split('T')[0];
    setFrom(fmt(newFrom));
    setTo(fmt(newTo));
  };

  const normalized = normalizeStatement(statement);
  const color = card.color ?? getBrandColor(card.brand);

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border bg-card shadow-2xl">
          <div
            className="flex flex-col gap-3 p-5"
            style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg p-2" style={{ backgroundColor: "${color}20", color }}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">{card.name}</p>
                  {card.last4 && <p className="text-[10px] text-muted-foreground">•••• {card.last4}</p>}
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-2">
              <button onClick={() => shiftPeriod(-1)} className="rounded-lg p-1.5 hover:bg-muted">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Período
                </p>
                <p className="text-xs font-bold">
                  {fmtDate(from)} → {fmtDate(to)}
                </p>
              </div>
              <button onClick={() => shiftPeriod(1)} className="rounded-lg p-1.5 hover:bg-muted">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/25 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Total
                </p>
                <PrivacyAmount value={normalized.total} className="text-sm font-bold text-rose-500" />
              </div>
              <div className="rounded-xl bg-muted/25 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Compras
                </p>
                <PrivacyAmount value={normalized.realExpenses} className="text-sm font-bold" />
              </div>
              <div className="rounded-xl bg-muted/25 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Pagamentos
                </p>
                <PrivacyAmount value={normalized.invoicePayments} className="text-sm font-bold text-emerald-500" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPaymentError(null);
                setShowPayModal(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20"
            >
              <Receipt className="w-4 h-4" />
              Pagar fatura
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : normalized.txs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
                <p className="text-sm text-muted-foreground">Nenhuma transação neste período.</p>
              </div>
            ) : (
              normalized.txs.map((tx) => {
                const isPayment = tx.classification === 'TRANSFER' || tx.type === 'INCOME';
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isPayment
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      <ArrowDownLeft className={`w-3.5 h-3.5 ${isPayment ? `rotate-180` : ``}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{tx.description ?? "—"}</p>
                        {isPayment && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500">
                            pagamento
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {tx.category?.name ? `${tx.category.name} · ` : ``}
                        {fmtDate(tx.date)}
                      </p>
                    </div>
                    <PrivacyAmount
                      value={Number(tx.amount)}
                      className={`shrink-0 text-sm font-bold ${isPayment ? `text-emerald-500` : `text-rose-500`}`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showPayModal && (
        <PayInvoiceModal
          card={card}
          total={normalized.total}
          accounts={accounts}
          isSaving={payInvoiceMutation.isPending}
          error={paymentError}
          onClose={() => setShowPayModal(false)}
          onSubmit={(payload) => payInvoiceMutation.mutateAsync(payload)}
        />
      )}
    </>
  );
}

function CardChip({
  card,
  onOpen,
  onEdit,
  onDelete,
}: {
  card: Card;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = card.color ?? getBrandColor(card.brand);
  const limit = Number(card.creditLimit ?? 0);

  return (
    <div
      onClick={onOpen}
      className="card-premium group cursor-pointer p-5 transition-all active:scale-[0.98] hover:shadow-lg"
      style={{ background: `linear-gradient(135deg, ${color}15, transparent)` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "${color}20", color }}>
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base font-bold font-display">{card.name}</p>
            <p className="text-xs text-muted-foreground">
              {card.last4 ? `•••• ${card.last4}` : `Sem final informado`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {card.brand && (
            <span
              className="rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest"
              style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
            >
              {card.brand}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tipo
          </p>
          <p className="text-sm font-semibold">{card.type === "CREDIT" ? "Crédito" : "Débito"}</p>
        </div>
        {limit > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Limite
            </p>
            <PrivacyAmount value={limit} className="text-sm font-bold text-violet-600" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {card.closingDay && (
          <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold">
            Fecha dia {card.closingDay}
          </span>
        )}
        {card.dueDay && (
          <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold">
            Vence dia {card.dueDay}
          </span>
        )}
      </div>

      <button className="mt-4 w-full rounded-xl border border-border py-2 text-xs font-bold text-muted-foreground transition-all group-hover:border-primary/30 group-hover:bg-muted group-hover:text-foreground">
        Ver fatura
      </button>
    </div>
  );
}

function CardsPage() {
  const queryClient = useQueryClient();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const res = await api.listCards<Card[] | ApiDataResponse<Card[]>>();
      return unwrapData(res, []);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountOption[]>('/api/v1/accounts'),
    staleTime: 1000 * 60 * 5,
  });

  const saveCardMutation = useMutation({
    mutationFn: (payload: {
      cardId?: string;
      accountId: string;
      name: string;
      brand?: string;
      last4?: string;
      type: 'CREDIT' | 'DEBIT';
      creditLimit?: number | null;
      closingDay?: number | null;
      dueDay?: number | null;
    }) => {
      const body = {
        accountId: payload.accountId,
        name: payload.name,
        brand: payload.brand,
        last4: payload.last4,
        type: payload.type,
        creditLimit: payload.creditLimit,
        closingDay: payload.closingDay,
        dueDay: payload.dueDay,
      };
      if (payload.cardId) {
        return api.patch(`/api/v1/cards/${payload.cardId}`, body);
      }
      return api.post('/api/v1/cards', body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      setFormError(null);
      setEditingCard(null);
      setShowCreateModal(false);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Erro ao salvar cartão.');
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => api.delete(`/api/v1/cards/${cardId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      if (selectedCard) setSelectedCard(null);
    },
  });

  const orderedCards = useMemo(
    () => [...cards].sort((a, b) => Number(b.creditLimit ?? 0) - Number(a.creditLimit ?? 0)),
    [cards],
  );

  const openCreate = () => {
    setFormError(null);
    setEditingCard(null);
    setShowCreateModal(true);
  };

  return (
    <>
      <WalletShell>
        <SectionPageHeader
          title="Cartoes"
          description="Gerencie cartoes e acompanhe faturas por periodo."
          actions={
            <button
              onClick={openCreate}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo cartao
            </button>
          }
        />

        {isLoading ? (
          <SectionLoadingState message="Carregando cartoes..." />
        ) : orderedCards.length === 0 ? (
          <SectionEmptyState
            icon={Wallet}
            title="Nenhum cartao cadastrado"
            description="Cadastre o primeiro cartao para acompanhar limites e faturas."
            action={
              <button
                onClick={openCreate}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Cadastrar primeiro cartao
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {orderedCards.map((card) => (
              <CardChip
                key={card.id}
                card={card}
                onOpen={() => setSelectedCard(card)}
                onEdit={() => {
                  setFormError(null);
                  setEditingCard(card);
                }}
                onDelete={() => {
                  if (confirm(`Excluir o cartao "${card.name}"?`)) {
                    deleteCardMutation.mutate(card.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </WalletShell>

      <Fab label="Novo cartão" onClick={openCreate} />

      {selectedCard && (
        <StatementDrawer
          card={selectedCard}
          accounts={accounts}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {(showCreateModal || editingCard) && (
        <CardFormModal
          accounts={accounts}
          card={editingCard}
          isSaving={saveCardMutation.isPending}
          error={formError}
          onClose={() => {
            setEditingCard(null);
            setShowCreateModal(false);
          }}
          onSubmit={(payload) =>
            saveCardMutation.mutateAsync({
              ...payload,
              cardId: editingCard?.id,
            })
          }
        />
      )}
    </>
  );
}
