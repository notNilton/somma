import { useEffect, useState } from 'react';
import { X, Loader2, Tag, Palette } from 'lucide-react';
import { api } from '../lib/api';

export type CategoryType = 'INCOME' | 'EXPENSE';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  type: CategoryType;
  initialData?: {
    id: string;
    name: string;
    color?: string;
  } | null;
}

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'create',
  type,
  initialData,
}: CategoryModalProps) {
  const isEditing = mode === 'edit';

  const [name, setName] = useState(initialData?.name ?? '');
  const initialDefault = type === 'INCOME' ? '#22C55E' : '#EF4444';
  const [colorHex, setColorHex] = useState<string>(
    typeof initialData?.color === 'string' && initialData.color.startsWith('#')
      ? initialData.color
      : initialDefault,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName(initialData?.name ?? '');
      const nextDefault = type === 'INCOME' ? '#22C55E' : '#EF4444';
      const nextColor =
        typeof initialData?.color === 'string' && initialData.color.startsWith('#')
          ? initialData.color
          : nextDefault;
      setColorHex(nextColor);
    }
  }, [isOpen, initialData, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        type,
        color: colorHex || undefined,
      };

      if (!payload.name) {
        throw new Error('Informe um nome para a categoria.');
      }

      if (isEditing && initialData) {
        await api.patch(`/api/v1/categories/${initialData.id}`, payload);
      } else {
        await api.post('/api/v1/categories', payload);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabel = type === 'INCOME' ? 'Receita' : 'Despesa';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl shadow-primary/5 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-primary"
              style={{ backgroundColor: `${colorHex}20` }}
            >
              <Tag className="w-4 h-4" style={{ color: colorHex }} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display tracking-tight">
                {isEditing
                  ? `Editar categoria de ${typeLabel.toLowerCase()}`
                  : `Nova categoria de ${typeLabel.toLowerCase()}`}
              </h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                Nome e cor para destacar esta categoria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-smooth text-muted-foreground"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Nome da categoria
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  type === 'INCOME'
                    ? 'Ex: Salário, Rendimentos, Outros...'
                    : 'Ex: Mercado, Combustível, Moradia...'
                }
                className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Cor
              </label>
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => {
                    setColorHex(e.target.value);
                  }}
                  className="w-full h-[42px] bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth cursor-pointer"
                  aria-label="Selecionar cor"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 rounded-2xl border border-border font-bold text-sm hover:bg-muted transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-white font-bold text-sm shadow-lg transition-smooth hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 bg-primary shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                'Salvar alterações'
              ) : (
                'Criar categoria'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
