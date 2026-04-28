import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Loader2,
  Wallet,
  Building,
  PiggyBank,
  Banknote,
  User,
  Briefcase,
  ChevronDown,
  Save,
  Trash2,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import WalletShell from '../../../components/WalletShell';
import { SectionLoadingState } from '../../../components/SectionFeedback';
import SectionPageHeader from '../../../components/SectionPageHeader';
import { api, unwrapData, type ApiDataResponse } from '../../../lib/api';
import type { Account } from './index';

export const Route = createFileRoute('/wallet/accounts/crud-accounts')({
  validateSearch: (search: Record<string, unknown>) => ({
    accountId: typeof search.accountId === 'string' ? search.accountId : undefined,
  }),
  component: CrudAccountsPage,
});

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'CHECKING', label: 'Conta Corrente', icon: Building },
  { value: 'SAVINGS', label: 'Conta Poupança', icon: PiggyBank },
  { value: 'CASH', label: 'Dinheiro em Espécie', icon: Banknote },
  { value: 'WALLET', label: 'Carteira Digital', icon: Wallet },
  { value: 'INVESTMENT', label: 'Investimento', icon: Wallet },
];

interface Card {
  id: string;
  accountId: string;
  name: string;
  brand?: string;
  last4?: string;
  type: 'CREDIT' | 'DEBIT';
  creditLimit?: number;
  color?: string;
  icon?: string;
  closingDay?: number;
  dueDay?: number;
}

interface DraftCard {
  tempId: string;
  id?: string;
  name: string;
  brand: string;
  last4: string;
  type: 'CREDIT' | 'DEBIT';
  creditLimit: string;
  closingDay: string;
  dueDay: string;
}

const CARD_BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex'];

function makeTempId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function draftCardFromApi(card: Card): DraftCard {
  return {
    tempId: card.id,
    id: card.id,
    name: card.name,
    brand: card.brand ?? '',
    last4: card.last4 ?? '',
    type: card.type,
    creditLimit: Math.round(Number(card.creditLimit ?? 0) * 100).toString(),
    closingDay: card.closingDay ? String(card.closingDay) : '',
    dueDay: card.dueDay ? String(card.dueDay) : '',
  };
}

function defaultCreditCard(accountName: string, account?: Account): DraftCard {
  return {
    tempId: makeTempId(),
    name: `${accountName} - Crédito`,
    brand: '',
    last4: '',
    type: 'CREDIT',
    creditLimit: Math.round(Number(account?.creditLimit ?? 0) * 100).toString(),
    closingDay: account?.closingDay ? String(account.closingDay) : '',
    dueDay: account?.dueDay ? String(account.dueDay) : '',
  };
}

function emptyDraftCard(): DraftCard {
  return {
    tempId: makeTempId(),
    name: '',
    brand: '',
    last4: '',
    type: 'CREDIT',
    creditLimit: '0',
    closingDay: '',
    dueDay: '',
  };
}

function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = ACCOUNT_TYPE_OPTIONS.find((o) => o.value === value);
  const Icon = selected?.icon ?? Wallet;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left border border-slate-300/80 bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none transition-smooth"
      >
        <div className="flex items-center gap-2 font-medium">
          <Icon className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{selected?.label ?? 'Selecione'}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 border border-slate-300/80 bg-white/95 p-1 shadow-xl shadow-slate-900/10 ring-1 ring-black/5">
            {ACCOUNT_TYPE_OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-smooth hover:bg-slate-100 ${value === opt.value ? 'bg-sky-500/10 text-sky-700 font-bold' : 'text-slate-700'}`}
                >
                  <OptIcon className="w-4 h-4 shrink-0" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const ICON_BY_TYPE: Record<string, string> = {
  CHECKING: 'Building',
  SAVINGS: 'PiggyBank',
  CASH: 'Banknote',
  WALLET: 'Wallet',
  INVESTMENT: 'Wallet',
};

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-9 border border-slate-300/80 focus:ring-2 focus:ring-sky-500/20 outline-none transition-smooth shrink-0"
        style={{ backgroundColor: value }}
      />
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-50 border border-slate-300/80 bg-white/95 p-2 shadow-xl shadow-slate-900/10">
          <HexColorPicker color={value} onChange={onChange} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full border border-slate-300/80 bg-white/70 px-2 py-1 text-xs text-center outline-none font-mono text-slate-700"
            maxLength={7}
          />
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300/80 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-sky-500/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-1 block';

function CrudAccountsPage() {
  const { accountId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!accountId;

  const { data: initialAccount, isLoading: isLoadingAccount, isError: isAccountError } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => api.get<Account>(`/api/v1/accounts/${accountId}`),
    enabled: !!accountId,
    staleTime: 0,
  });

  const { data: allCards = [], isLoading: isLoadingCards } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const res = await api.listCards<Card[] | ApiDataResponse<Card[]>>();
      return unwrapData(res, []);
    },
    staleTime: 1000 * 60 * 5,
  });

  const [name, setName] = useState('');
  const [type, setType] = useState('CHECKING');
  const [ownership, setOwnership] = useState<'PERSONAL' | 'BUSINESS'>('PERSONAL');
  const [bankName, setBankName] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [balance, setBalance] = useState('0');
  const [color, setColor] = useState('#6366f1');
  const [hasDebit, setHasDebit] = useState(true);
  const [hasPix, setHasPix] = useState(true);
  const [cardDrafts, setCardDrafts] = useState<DraftCard[]>([]);
  const [formHydrated, setFormHydrated] = useState(false);
  const [cardsHydrated, setCardsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialAccount) return;
    setName(initialAccount.name);
    setType(initialAccount.type);
    setOwnership((initialAccount.ownership as 'PERSONAL' | 'BUSINESS') ?? 'PERSONAL');
    setBankName(initialAccount.bankName ?? '');
    setCpf(initialAccount.cpf ?? '');
    setCnpj(initialAccount.cnpj ?? '');
    setBalance(Math.floor(Math.abs(Number(initialAccount.balance)) * 100).toString());
    setColor(initialAccount.color ?? '#6366f1');
    setHasDebit(initialAccount.hasDebit ?? true);
    setHasPix(initialAccount.hasPix ?? true);
    setFormHydrated(true);
  }, [initialAccount]);

  useEffect(() => {
    if (cardsHydrated) return;
    if (!isEditing) {
      setCardsHydrated(true);
      return;
    }
    if (!initialAccount || isLoadingCards) return;

    const accountCards = allCards
      .filter((card) => card.accountId === accountId)
      .map(draftCardFromApi);

    if (accountCards.length > 0) {
      setCardDrafts(accountCards);
    } else if (Number(initialAccount.creditLimit ?? 0) > 0 || initialAccount.hasCredit) {
      setCardDrafts([defaultCreditCard(initialAccount.name, initialAccount)]);
    }

    setCardsHydrated(true);
  }, [accountId, allCards, cardsHydrated, initialAccount, isEditing, isLoadingCards]);

  useEffect(() => {
    if (formHydrated) return;
    if (!isEditing) {
      setFormHydrated(true);
    }
  }, [formHydrated, isEditing]);

  const goBack = () => void navigate({ to: '/wallet/accounts' });

  const fmt = (cents: string) =>
    (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const updateCard = (tempId: string, patch: Partial<DraftCard>) => {
    setCardDrafts((prev) => prev.map((card) => (card.tempId === tempId ? { ...card, ...patch } : card)));
  };

  const addCard = () => {
    setCardDrafts((prev) => [...prev, emptyDraftCard()]);
  };

  const removeCard = (tempId: string) => {
    setCardDrafts((prev) => prev.filter((card) => card.tempId !== tempId));
  };

  const cardPayloadFromDraft = (card: DraftCard) => ({
    name: card.name.trim(),
    brand: card.brand.trim() || undefined,
    last4: card.last4.trim() || undefined,
    type: card.type,
    creditLimit: card.type === 'CREDIT' ? Number(card.creditLimit || '0') / 100 : null,
    closingDay: card.type === 'CREDIT' && card.closingDay ? Number(card.closingDay) : null,
    dueDay: card.type === 'CREDIT' && card.dueDay ? Number(card.dueDay) : null,
    color: color,
    icon: card.type === 'CREDIT' ? 'CreditCard' : 'Wallet',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const creditCards = cardDrafts.filter((card) => card.type === 'CREDIT');
      const accountCreditLimit = creditCards.reduce(
        (sum, card) => sum + Number(card.creditLimit || '0'),
        0,
      );
      const accountClosingDay = creditCards.find((card) => card.closingDay)?.closingDay;
      const accountDueDay = creditCards.find((card) => card.dueDay)?.dueDay;
      const payload = {
        name,
        type,
        ownership,
        bankName: bankName || undefined,
        cpf: ownership === 'PERSONAL' && cpf ? cpf : undefined,
        cnpj: ownership === 'BUSINESS' && cnpj ? cnpj : undefined,
        balance: Number(balance) / 100,
        color,
        icon: ICON_BY_TYPE[type] ?? 'Wallet',
        hasDebit,
        hasPix,
        hasCredit: creditCards.length > 0,
        creditLimit: creditCards.length > 0 ? accountCreditLimit / 100 : null,
        closingDay: accountClosingDay ? Number(accountClosingDay) : null,
        dueDay: accountDueDay ? Number(accountDueDay) : null,
      };

      let savedAccountId = accountId;
      if (isEditing && accountId) {
        const updated = await api.patch<Account>(`/api/v1/accounts/${accountId}`, payload);
        savedAccountId = updated.id ?? accountId;
      } else {
        const created = await api.post<Account>('/api/v1/accounts', payload);
        savedAccountId = created.id;
      }

      if (savedAccountId) {
        const existingCards = allCards.filter((card) => card.accountId === savedAccountId);
        const currentIds = new Set<string>();

        for (const card of cardDrafts) {
          const body = {
            accountId: savedAccountId,
            ...cardPayloadFromDraft(card),
          };
          if (card.id) {
            currentIds.add(card.id);
            await api.patch(`/api/v1/cards/${card.id}`, body);
          } else {
            await api.post('/api/v1/cards', body);
          }
        }

        for (const card of existingCards) {
          if (!currentIds.has(card.id)) {
            await api.delete(`/api/v1/cards/${card.id}`);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && !isAccountError && (isLoadingAccount || !formHydrated || (!cardsHydrated && isLoadingCards))) {
    return (
      <WalletShell contentClassName="wallet-starfield flex-1 justify-center">
        <SectionLoadingState message="Carregando conta..." />
      </WalletShell>
    );
  }

  if (isEditing && isAccountError) {
    return (
      <WalletShell contentClassName="wallet-starfield">
        <div className="card-premium wallet-panel-surface p-4 text-sm text-slate-700">
          Não foi possível carregar esta conta para edição.
        </div>
      </WalletShell>
    );
  }

  return (
    <WalletShell contentClassName="wallet-starfield">
      <form onSubmit={handleSubmit} className="grid gap-3">
        <SectionPageHeader
          title={isEditing ? 'Editar Conta' : 'Nova Conta'}
          description={isEditing
            ? 'Atualize os dados da conta bancária ou carteira.'
            : 'Preencha os dados da nova conta bancária ou carteira.'}
          backTo="/wallet/accounts"
          actions={<div className="flex gap-2">
            <button
              type="button"
              onClick={goBack}
              className="wallet-sci-button px-4 py-2 text-sm font-semibold hover:scale-[1.02] active:scale-95 transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="wallet-sci-button flex items-center gap-1.5 px-4 py-2 text-sm font-semibold hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition-smooth"
              style={{
                backgroundColor: '#0369a1',
                borderColor: '#0369a1',
                color: '#ffffff',
              }}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar
            </button>
          </div>}
        />

        {error && (
          <div className="card-premium wallet-panel-surface border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card-premium wallet-panel-surface p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Identificação
            </p>
            <div>
              <label className={labelCls}>Nome</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Banco / Instituição</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: Itaú"
                className={inputCls}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelCls}>Tipo</label>
                <TypeSelect value={type} onChange={setType} />
              </div>
              <div>
                <label className={labelCls}>Cor</label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </div>
          </div>

          <div className="card-premium wallet-panel-surface p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Titularidade
            </p>
            <div className="flex gap-1 p-1 border border-slate-300/70 bg-white/60">
              {(['PERSONAL', 'BUSINESS'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOwnership(o)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-smooth ${
                    ownership === o
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100/70'
                  }`}
                >
                  {o === 'PERSONAL' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Briefcase className="w-3 h-3" />
                  )}
                  {o === 'PERSONAL' ? 'Pessoal' : 'Empresarial'}
                </button>
              ))}
            </div>
            <div>
              <label className={labelCls}>{ownership === 'PERSONAL' ? 'CPF' : 'CNPJ'}</label>
              <input
                type="text"
                value={ownership === 'PERSONAL' ? cpf : cnpj}
                onChange={(e) =>
                  ownership === 'PERSONAL' ? setCpf(e.target.value) : setCnpj(e.target.value)
                }
                placeholder={ownership === 'PERSONAL' ? '000.000.000-00' : '00.000.000/0000-00'}
                maxLength={ownership === 'PERSONAL' ? 14 : 18}
                className={inputCls}
              />
            </div>
          </div>

          <div className="card-premium wallet-panel-surface p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Métodos e Saldo
            </p>
            <div className="flex gap-1 p-1 border border-slate-300/70 bg-white/60">
              {(
                [
                  {
                    key: 'debit',
                    label: 'Débito',
                    active: hasDebit,
                    toggle: () => setHasDebit((v) => !v),
                  },
                  { key: 'pix', label: 'PIX', active: hasPix, toggle: () => setHasPix((v) => !v) },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={m.toggle}
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-smooth ${
                    m.active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100/70'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {(hasDebit || hasPix) && (
              <div>
                <label className={labelCls}>Saldo Atual</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={fmt(balance)}
                  onChange={(e) => setBalance(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-bold`}
                />
              </div>
            )}
          </div>
        </div>

        <div className="card-premium wallet-panel-surface p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Cartões vinculados
              </p>
              <h3 className="text-sm font-bold text-slate-900">Cartões desta conta</h3>
            </div>
            <button
              type="button"
              onClick={addCard}
              className="wallet-sci-button shrink-0 px-2.5 py-1.5 text-[11px] font-semibold transition-smooth"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo cartão
            </button>
          </div>

          <datalist id="card-brand-options">
            {CARD_BRANDS.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>

          {cardDrafts.length === 0 ? (
            <div className="rounded-none border border-dashed border-slate-300/80 bg-white/55 px-4 py-6 text-sm text-slate-500">
              Adicione cartões de débito ou crédito para esta conta. Eles serão salvos junto com a conta.
            </div>
          ) : (
            <div className="grid gap-3">
              {cardDrafts.map((card, index) => (
                <div key={card.tempId} className="card-premium wallet-panel-surface p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
                        Cartão {index + 1}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {card.name || 'Cartão sem nome'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCard(card.tempId)}
                      className="rounded-none border border-slate-300/70 bg-white/70 p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 transition-smooth"
                      title="Remover cartão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className={labelCls}>Nome do cartão</label>
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) => updateCard(card.tempId, { name: e.target.value })}
                        placeholder="Ex: Nubank Roxinho"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Tipo</label>
                      <select
                        value={card.type}
                        onChange={(e) =>
                          updateCard(card.tempId, { type: e.target.value as DraftCard['type'] })
                        }
                        className={inputCls}
                      >
                        <option value="CREDIT">Crédito</option>
                        <option value="DEBIT">Débito</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Bandeira</label>
                      <input
                        list="card-brand-options"
                        type="text"
                        value={card.brand}
                        onChange={(e) => updateCard(card.tempId, { brand: e.target.value })}
                        placeholder="Ex: Visa"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Últimos 4 dígitos</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={card.last4}
                        onChange={(e) =>
                          updateCard(card.tempId, {
                            last4: e.target.value.replace(/\D/g, '').slice(0, 4),
                          })
                        }
                        placeholder="1234"
                        className={inputCls}
                      />
                    </div>
                    {card.type === 'CREDIT' && (
                      <>
                        <div>
                          <label className={labelCls}>Limite</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={fmt(card.creditLimit)}
                            onChange={(e) =>
                              updateCard(card.tempId, {
                                creditLimit: e.target.value.replace(/\D/g, ''),
                              })
                            }
                            className={`${inputCls} font-bold`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Fechamento</label>
                            <input
                              type="number"
                              min={1}
                              max={28}
                              value={card.closingDay}
                              onChange={(e) =>
                                updateCard(card.tempId, { closingDay: e.target.value })
                              }
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Vencimento</label>
                            <input
                              type="number"
                              min={1}
                              max={28}
                              value={card.dueDay}
                              onChange={(e) => updateCard(card.tempId, { dueDay: e.target.value })}
                              className={inputCls}
                            />
                          </div>
                        </div>
                        {card.closingDay && card.dueDay && (
                          <p className="text-[11px] text-sky-700 font-medium">
                            Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </WalletShell>
  )
}
