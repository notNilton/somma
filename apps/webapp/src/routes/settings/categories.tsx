import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Loader2, Pencil, Trash2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { CategoryModal } from '../../components/CategoryModal';

interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
}

export const Route = createFileRoute('/settings/categories')({
  component: CategoriesSettingsPage,
});

function CategoriesSettingsPage() {
  const queryClient = useQueryClient();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalType, setCategoryModalType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['settings-categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 5,
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const incomeCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === 'INCOME' &&
          (!normalizedSearch ||
            c.name.toLowerCase().includes(normalizedSearch) ||
            (c.description ?? '').toLowerCase().includes(normalizedSearch)),
      ),
    [categories, normalizedSearch],
  );

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === 'EXPENSE' &&
          (!normalizedSearch ||
            c.name.toLowerCase().includes(normalizedSearch) ||
            (c.description ?? '').toLowerCase().includes(normalizedSearch)),
      ),
    [categories, normalizedSearch],
  );

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-categories'] });
    },
  });

  const openCategoryModal = (type: 'INCOME' | 'EXPENSE') => {
    setEditingCategory(null);
    setCategoryModalType(type);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryModalType(cat.type);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (cat: Category) => {
    if (!window.confirm(`Excluir a categoria "${cat.name}"?`)) return;
    deleteCategoryMutation.mutate(cat.id);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Categorias</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Centralize a organização das suas categorias de receitas e despesas.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Receitas
              </p>
              <p className="text-[11px] text-muted-foreground">
                Categorias usadas para entradas de dinheiro.
              </p>
            </div>
          </div>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
            </div>
          ) : incomeCategories.length === 0 ? (
            <div className="flex flex-col gap-3 py-4">
              <p className="text-xs text-muted-foreground">
                Nenhuma categoria de receita encontrada.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/60 transition-smooth disabled:opacity-60"
                onClick={() => openCategoryModal('INCOME')}
              >
                <Plus className="w-3 h-3" />
                Nova categoria de receita
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 self-start mb-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/60 transition-smooth disabled:opacity-60"
                onClick={() => openCategoryModal('INCOME')}
              >
                <Plus className="w-3 h-3" />
                Nova categoria de receita
              </button>
              <ul className="space-y-1 pr-1">
                {incomeCategories.map((cat) => (
                  <li
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/60 group"
                  >
                    <span className="text-xs font-medium truncate flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-border/60"
                        style={{ backgroundColor: cat.color ?? 'var(--muted-foreground)' }}
                      />
                      <span className="truncate">
                        {cat.name}
                        {cat.description ? (
                          <span className="text-[10px] text-muted-foreground truncate ml-2">
                            {cat.description}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-smooth">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          openEditCategoryModal(cat);
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-smooth"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteCategory(cat);
                        }}
                        disabled={deleteCategoryMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-smooth disabled:opacity-40"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card-premium p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Despesas
              </p>
              <p className="text-[11px] text-muted-foreground">
                Categorias usadas para saídas de dinheiro.
              </p>
            </div>
          </div>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
            </div>
          ) : expenseCategories.length === 0 ? (
            <div className="flex flex-col gap-3 py-4">
              <p className="text-xs text-muted-foreground">
                Nenhuma categoria de despesa encontrada.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/60 transition-smooth disabled:opacity-60"
                onClick={() => openCategoryModal('EXPENSE')}
              >
                <Plus className="w-3 h-3" />
                Nova categoria de despesa
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 self-start mb-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/60 transition-smooth disabled:opacity-60"
                onClick={() => openCategoryModal('EXPENSE')}
              >
                <Plus className="w-3 h-3" />
                Nova categoria de despesa
              </button>
              <ul className="space-y-1 pr-1">
                {expenseCategories.map((cat) => (
                  <li
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/60 group"
                  >
                    <span className="text-xs font-medium truncate flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-border/60"
                        style={{ backgroundColor: cat.color ?? 'var(--muted-foreground)' }}
                      />
                      <span className="truncate">
                        {cat.name}
                        {cat.description ? (
                          <span className="text-[10px] text-muted-foreground truncate ml-2">
                            {cat.description}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-smooth">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          openEditCategoryModal(cat);
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-smooth"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteCategory(cat);
                        }}
                        disabled={deleteCategoryMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-smooth disabled:opacity-40"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['settings-categories'] })}
        type={categoryModalType}
        mode={editingCategory ? 'edit' : 'create'}
        initialData={
          editingCategory
            ? { id: editingCategory.id, name: editingCategory.name, color: editingCategory.color }
            : null
        }
      />
    </div>
  );
}
