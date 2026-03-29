import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  Wallet,
  Building,
  PiggyBank,
  Banknote,
  User,
  Briefcase,
  ChevronDown,
  Save,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { api } from '../../lib/api';
import type { Account } from './index';

export const Route = createFileRoute('/accounts/crud-accounts')({
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

function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = ACCOUNT_TYPE_OPTIONS.find((o) => o.value === value);
  const Icon = selected?.icon ?? Wallet;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
      >
        <div className="flex items-center gap-2 font-medium">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>{selected?.label ?? 'Selecione'}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl shadow-primary/10 p-1 ring-1 ring-black/5">
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth hover:bg-muted/60 ${value === opt.value ? 'bg-primary/5 text-primary font-bold' : 'text-foreground'}`}
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
        className="w-10 h-9 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-smooth shrink-0"
        style={{ backgroundColor: value }}
      />
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-50 p-2 bg-card border border-border rounded-xl shadow-xl shadow-primary/10">
          <HexColorPicker color={value} onChange={onChange} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full text-xs text-center bg-muted/40 border border-border rounded-lg px-2 py-1 outline-none font-mono"
            maxLength={7}
          />
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block';

function CrudAccountsPage() {
  const { accountId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!accountId;

  const { data: initialAccount, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => api.get<Account>(`/api/v1/accounts/${accountId}`),
    enabled: !!accountId,
    staleTime: 0,
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
  const [hasCredit, setHasCredit] = useState(false);
  const [creditLimit, setCreditLimit] = useState('0');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
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
    const existingLimit = Number(initialAccount.creditLimit ?? 0);
    setHasCredit((initialAccount.hasCredit ?? false) || existingLimit > 0);
    setCreditLimit(existingLimit > 0 ? Math.floor(existingLimit * 100).toString() : '0');
    setClosingDay(initialAccount.closingDay ? String(initialAccount.closingDay) : '');
    setDueDay(initialAccount.dueDay ? String(initialAccount.dueDay) : '');
  }, [initialAccount]);

  const goBack = () => void navigate({ to: '/accounts' });

  const fmt = (cents: string) =>
    (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
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
        hasCredit,
        creditLimit: hasCredit ? Number(creditLimit) / 100 : null,
        closingDay: hasCredit && closingDay ? Number(closingDay) : null,
        dueDay: hasCredit && dueDay ? Number(dueDay) : null,
      };

      if (isEditing && accountId) {
        await api.patch(`/api/v1/accounts/${accountId}`, payload);
      } else {
        await api.post('/api/v1/accounts', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && isLoadingAccount) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="p-2.5 rounded-lg hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold">
                {isEditing ? 'Editar Conta' : 'Nova Conta'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                {isEditing
                  ? 'Atualize os dados da conta bancária ou carteira.'
                  : 'Preencha os dados da nova conta bancária ou carteira.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBack}
              className="hidden sm:flex px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition-smooth"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
            {error}
          </div>
        )}

        {/* Campos em grid de 3 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Identificação */}
          <div className="card-premium p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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

          {/* Titularidade */}
          <div className="card-premium p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Titularidade
            </p>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(['PERSONAL', 'BUSINESS'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOwnership(o)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-smooth ${
                    ownership === o
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted-foreground/5'
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

          {/* Métodos e saldo */}
          <div className="card-premium p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Métodos e Saldo
            </p>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(
                [
                  {
                    key: 'debit',
                    label: 'Débito',
                    active: hasDebit,
                    toggle: () => setHasDebit((v) => !v),
                  },
                  { key: 'pix', label: 'PIX', active: hasPix, toggle: () => setHasPix((v) => !v) },
                  {
                    key: 'credit',
                    label: 'Crédito',
                    active: hasCredit,
                    toggle: () => setHasCredit((v) => !v),
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={m.toggle}
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-smooth ${
                    m.active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted-foreground/5'
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

        {/* Seção de crédito — aparece abaixo quando ativo */}
        {hasCredit && (
          <div className="card-premium p-5 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cartão de Crédito
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className={labelCls}>Limite de Crédito</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmt(creditLimit)}
                  onChange={(e) => setCreditLimit(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-bold`}
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:gap-4 gap-3">
                <div className="sm:w-40">
                  <label className={labelCls}>Dia Fechamento</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={28}
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    placeholder="Ex: 3"
                    className={inputCls}
                  />
                </div>
                <div className="sm:w-40">
                  <label className={labelCls}>Dia Vencimento</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={28}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="Ex: 10"
                    className={inputCls}
                  />
                </div>
              </div>
              {closingDay && dueDay && (
                <p className="text-[11px] text-violet-500 font-medium sm:self-end sm:pb-2.5">
                  Fecha dia {closingDay} · Vence dia {dueDay}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
