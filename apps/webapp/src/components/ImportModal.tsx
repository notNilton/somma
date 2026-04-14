import { useEffect, useMemo, useState } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';

type CardType = 'CREDIT' | 'DEBIT';

interface Card {
  id: string;
  accountId: string;
  name: string;
  type: CardType;
}

interface Account {
  id: string;
  name: string;
  cards?: Card[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  skippedInvalid: number;
  skippedDuplicate: number;
  errors: string[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onImported: () => void;
}

type ImportTargetMode = 'account' | 'card';

export function ImportModal({ isOpen, onClose, accounts, onImported }: ImportModalProps) {
  const [mode, setMode] = useState<ImportTargetMode>('account');
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const cards = useMemo(() => {
    const out: Array<{ card: Card; accountName: string }> = [];
    for (const a of accounts) {
      for (const c of a.cards ?? []) out.push({ card: c, accountName: a.name });
    }
    return out;
  }, [accounts]);

  const selectedCard = useMemo(
    () => cards.find((x) => x.card.id === cardId)?.card ?? null,
    [cards, cardId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setResult(null);
    setIsLoading(false);
    setFile(null);
    setAccountId('');
    setCardId('');
    setMode('account');
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit =
    !!file && ((mode === 'account' && !!accountId) || (mode === 'card' && !!cardId));

  const submit = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append('file', file as File);
      if (mode === 'account') form.append('accountId', accountId);
      if (mode === 'card') form.append('cardId', cardId);

      const data = await api.postForm<ImportResult>('/transactions/import', form);
      setResult(data);
      onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao importar arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const targetHint =
    mode === 'account'
      ? 'Importa direto para a conta selecionada.'
      : selectedCard?.type === 'DEBIT'
        ? 'Cartão de débito: afeta o saldo da conta mãe.'
        : selectedCard?.type === 'CREDIT'
          ? 'Cartão de crédito: afeta o limite/dívida do cartão (não mexe no saldo da conta mãe).'
          : 'Selecione um cartão.';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl shadow-primary/5 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display tracking-tight">Importar arquivo</h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                Selecione destino e envie o arquivo
              </p>
            </div>
          </div>
          <button
            onClick={isLoading ? undefined : onClose}
            className="p-2 rounded-xl hover:bg-muted transition-smooth text-muted-foreground disabled:opacity-50"
            type="button"
            disabled={isLoading}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-1 bg-muted rounded-2xl w-fit border border-border mb-4">
          <button
            type="button"
            onClick={() => setMode('account')}
            className={`px-4 py-2 text-xs font-bold rounded-xl uppercase tracking-wider transition-smooth ${
              mode === 'account'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Conta
          </button>
          <button
            type="button"
            onClick={() => setMode('card')}
            className={`px-4 py-2 text-xs font-bold rounded-xl uppercase tracking-wider transition-smooth ${
              mode === 'card'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Cartão
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Arquivo
            </label>
            <input
              type="file"
              accept=".csv,.tsv,.json,text/csv,text/tab-separated-values,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm"
              disabled={isLoading}
            />
          </div>

          {mode === 'account' ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Conta
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted transition-smooth outline-none cursor-pointer"
                disabled={isLoading}
              >
                <option value="">Selecione</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Cartão
              </label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted transition-smooth outline-none cursor-pointer"
                disabled={isLoading}
              >
                <option value="">Selecione</option>
                {cards.map(({ card, accountName }) => (
                  <option key={card.id} value={card.id}>
                    {card.name} ({card.type === 'CREDIT' ? 'Crédito' : 'Débito'} · {accountName})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">{targetHint}</p>

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-11 px-4 rounded-2xl border border-border bg-card hover:bg-muted transition-smooth font-bold text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isLoading}
            className="h-11 px-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth font-bold text-sm disabled:opacity-60 inline-flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Enviar
          </button>
        </div>

        {!canSubmit && !result ? (
          <div className="text-[11px] text-muted-foreground mt-3">
            Selecione {file ? '' : 'um arquivo CSV'}
            {!file && ((mode === 'account' && !accountId) || (mode === 'card' && !cardId))
              ? ' e '
              : ''}
            {mode === 'account' ? (accountId ? '' : 'uma conta') : cardId ? '' : 'um cartão'} para
            habilitar o envio.
          </div>
        ) : null}

        {result ? (
          <div className="text-xs text-muted-foreground mt-4">
            Criadas: <b>{result.created}</b> · Ignoradas: <b>{result.skipped}</b>
            {' · '}
            Duplicadas: <b>{result.skippedDuplicate}</b> · Inválidas: <b>{result.skippedInvalid}</b>
            {result.errors?.length ? (
              <div className="mt-2 text-rose-500">
                {result.errors.slice(0, 5).map((e, idx) => (
                  <div key={idx}>{e}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <div className="text-xs text-rose-500 mt-3">{error}</div> : null}
      </div>
    </div>
  );
}
