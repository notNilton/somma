import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PrivacyAmount from '../../components/PrivacyAmount';
import {
  Plus,
  Wallet,
  Building,
  PiggyBank,
  Banknote,
  Edit2,
  Trash2,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
});

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
    <div className="card-premium p-4 group relative flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-lg border"
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
          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-smooth ml-1">
            <button
              onClick={() => onEdit(account)}
              className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-smooth"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-smooth"
            >
              <Trash2 className="w-3 h-3" />
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

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts'),
  });

  const { data: creditSummary } = useQuery({
    queryKey: ['accounts', 'credit-summary'],
    queryFn: () =>
      api.get<{ totalCreditLimit: number; creditUsed: number; availableCredit: number }>(
        '/accounts/credit-summary',
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const totalBalance = accounts.reduce((acc, a) => acc + Math.max(0, Number(a.balance)), 0);

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta conta? As transações vinculadas serão mantidas.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Contas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie suas contas e carteiras.</p>
        </div>
        <button
          onClick={() => void navigate({ to: '/accounts/crud-accounts' })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-smooth"
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
          {/* Resumo compacto */}
          <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-muted/30 rounded-xl border border-border">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Patrimônio
              </p>
              <PrivacyAmount
                value={totalBalance}
                className="text-2xl font-bold font-display tracking-tight block"
              />
            </div>
            {(creditSummary?.totalCreditLimit ?? 0) > 0 && (
              <>
                <div className="border-l border-border pl-6">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">
                    Limite total
                  </p>
                  <PrivacyAmount
                    value={creditSummary!.totalCreditLimit}
                    className="text-violet-600 font-bold text-base block"
                  />
                </div>
                <div className="border-l border-border pl-6">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">
                    Crédito usado
                  </p>
                  <PrivacyAmount
                    value={creditSummary!.creditUsed}
                    className="text-rose-500 font-bold text-base block"
                  />
                </div>
                <div className="border-l border-border pl-6">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Disponível</p>
                  <PrivacyAmount
                    value={creditSummary!.availableCredit}
                    className="text-emerald-600 font-bold text-base block"
                  />
                </div>
              </>
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
        </>
      )}
    </div>
  );
}
