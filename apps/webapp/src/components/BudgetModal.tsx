import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Modal from './ui/Modal';
import { cleanNumeric } from '../lib/formatters';
import type { BudgetPlan } from '../lib/budgets';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBudget: BudgetPlan | null;
}

type BudgetItemDraft = {
  name: string;
};

type BudgetFormState = {
  name: string;
  targetDate: string;
  items: BudgetItemDraft[];
};

function makeDefaultItem(name = ''): BudgetItemDraft {
  return { name };
}

function makeDefaultForm(): BudgetFormState {
  const target = new Date();
  target.setMonth(target.getMonth() + 1);
  return {
    name: '',
    targetDate: target.toISOString().split('T')[0],
    items: [makeDefaultItem('Hospedagem'), makeDefaultItem('Alimentação'), makeDefaultItem('Transporte')],
  };
}

export function BudgetModal({ isOpen, onClose, editingBudget }: BudgetModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BudgetFormState>(makeDefaultForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingBudget) {
        setForm({
          name: editingBudget.name,
          targetDate: editingBudget.targetDate.slice(0, 10),
          items: editingBudget.items.map((item) => ({ name: item.name })),
        });
      } else {
        setForm(makeDefaultForm());
      }
      setError(null);
    }
  }, [isOpen, editingBudget]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        targetDate: form.targetDate,
        items: form.items
          .filter((item) => item.name.trim() !== '')
          .map((item, index) => ({
            name: item.name.trim(),
            sortOrder: index,
          })),
      };

      if (editingBudget) {
        return api.patchBudgets<BudgetPlan>(editingBudget.id, payload);
      }
      return api.postBudgets<BudgetPlan>(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento.');
    },
  });

  const addItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, makeDefaultItem()] }));
  };

  const updateItem = (index: number, patch: Partial<BudgetItemDraft>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, idx) => idx !== index),
    }));
  };

  const title = editingBudget ? 'Editar orçamento' : 'Novo orçamento';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      eyebrow="Budget planning"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="transactions-action w-full px-4 py-3 text-sm font-semibold sm:w-auto sm:py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => upsertMutation.mutate()}
            disabled={upsertMutation.isPending}
            className="transactions-primary inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editingBudget ? 'Salvar' : 'Criar'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="grid gap-4">
          <label>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Nome do Orçamento
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
              placeholder="Ex: Viagem para São Paulo"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Data alvo
            </span>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((current) => ({ ...current, targetDate: e.target.value }))}
              className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-slate-300/70 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Itens</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              O valor de cada item será calculado via transações.
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="transactions-action inline-flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Item
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {form.items.map((item, index) => (
            <div key={`${index}`} className="flex gap-2">
              <input
                value={item.name}
                onChange={(e) => updateItem(index, { name: e.target.value })}
                className="transactions-input flex-1 border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
                placeholder="Nome do item (ex: Hospedagem)"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="transactions-action inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-500"
                aria-label="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="semantic-expense px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
