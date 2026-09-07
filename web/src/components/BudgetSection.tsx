import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsApi } from '../api'
import type { Budget, CreateBudgetInput } from '../types'

interface Props {
  totalIncomeMonth: number
  totalExpenseMonth: number
}

export default function BudgetSection({ totalIncomeMonth, totalExpenseMonth }: Props) {
  const qc = useQueryClient()
  const [openNew, setOpenNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [allocatedAmount, setAllocatedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateBudgetInput) => budgetsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateBudgetInput> }) =>
      budgetsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })

  function resetForm() {
    setName('')
    setAllocatedAmount('')
    setNotes('')
    setError('')
    setOpenNew(false)
    setEditingId(null)
  }

  function handleStartEdit(b: Budget) {
    setEditingId(b.id)
    setName(b.name)
    setAllocatedAmount(String(b.allocatedAmount))
    setNotes(b.notes ?? '')
    setOpenNew(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nome do orçamento é obrigatório')
      return
    }
    const amt = parseFloat(allocatedAmount)
    if (isNaN(amt) || amt < 0) {
      setError('Valor deve ser positivo')
      return
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        input: { name, allocatedAmount: amt, notes: notes || undefined },
      })
    } else {
      createMutation.mutate({
        name,
        allocatedAmount: amt,
        notes: notes || undefined,
      })
    }
  }

  // Metodologia 50/30/20 baseada na renda mensal
  // 50% Necessidades, 30% Desejos/Estilo de vida, 20% Futuro/Investimentos
  const baseIncome = totalIncomeMonth > 0 ? totalIncomeMonth : totalExpenseMonth
  const target50 = baseIncome * 0.50
  const target30 = baseIncome * 0.30
  const target20 = baseIncome * 0.20

  return (
    <div className="budget-section-wrapper" style={{ marginBottom: '2rem' }}>
      {/* Bloco da Regra 50/30/20 */}
      <div
        className="budget-503020-card"
        style={{
          padding: '1.2rem',
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '10px',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              Metodologia Orçamentária 50 / 30 / 20
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Distribuição ideal calculada sobre sua base de renda mensal (R$ {baseIncome.toFixed(2)})
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.8rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3b82f6' }}>50% — Necessidades Essenciais</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.2rem 0' }}>R$ {target50.toFixed(2)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Moradia, contas básicas, mercado e saúde</div>
          </div>

          <div style={{ padding: '0.8rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>30% — Desejos & Estilo de Vida</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.2rem 0' }}>R$ {target30.toFixed(2)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Restaurantes, hobbies, lazer e compras</div>
          </div>

          <div style={{ padding: '0.8rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>20% — Futuro & Poupança</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.2rem 0' }}>R$ {target20.toFixed(2)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reserva, investimentos e metas</div>
          </div>
        </div>
      </div>

      {/* Envelopes e Limites de Orçamento Mensais */}
      <div
        className="budgets-card"
        style={{
          padding: '1.2rem',
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Envelopes & Limites Mensais</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Acompanhamento de gastos e alertas de teto orçamentário
            </span>
          </div>
          {!openNew && (
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => { resetForm(); setOpenNew(true) }}
            >
              + Novo Envelope
            </button>
          )}
        </div>

        {openNew && (
          <form className="config-pwd-form" onSubmit={handleSubmit} style={{ marginBottom: '1.2rem', background: 'var(--bg-subtle, #f8fafc)' }}>
            <h4>{editingId ? 'Editar Envelope' : 'Criar Envelope de Orçamento'}</h4>
            {error && <div className="config-form-error">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <label className="budget-field">
                <span className="budget-field-label">Nome do Envelope / Categoria</span>
                <input
                  className="config-inline-input"
                  placeholder="Ex: Alimentação & Delivery, Lazer, Transporte"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label className="budget-field">
                <span className="budget-field-label">Limite Mensal (R$)</span>
                <input
                  className="config-inline-input"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={allocatedAmount}
                  onChange={e => setAllocatedAmount(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="budget-field">
              <span className="budget-field-label">Observações (opcional)</span>
              <input
                className="config-inline-input"
                placeholder="Ex: Teto máximo para refeições fora"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>

            <div className="config-form-actions">
              <button type="button" className="btn-action-sm btn-action-ghost" onClick={resetForm}>
                Cancelar
              </button>
              <button type="submit" className="btn-action-sm" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Salvar Envelope' : 'Cadastrar Envelope'}
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando orçamentos...
          </div>
        ) : budgets.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum envelope de orçamento configurado ainda. Crie envelopes para limitar seus gastos.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {budgets.map(b => {
              const isOver = b.progress >= 100
              const isWarning = b.progress >= 80 && !isOver
              const barColor = isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981'

              return (
                <div
                  key={b.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    background: 'var(--bg-subtle, #f8fafc)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{b.name}</strong>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        type="button"
                        className="btn-action-sm btn-action-ghost"
                        style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                        onClick={() => handleStartEdit(b)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn-action-sm btn-action-danger"
                        style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          if (confirm(`Remover envelope "${b.name}"?`)) removeMutation.mutate(b.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div style={{ margin: '0.6rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>Gasto: <strong>R$ {b.spent.toFixed(2)}</strong></span>
                      <span>Teto: R$ {b.allocatedAmount.toFixed(2)}</span>
                    </div>

                    {/* Barra de Progresso */}
                    <div
                      style={{
                        height: '8px',
                        width: '100%',
                        background: 'var(--border-color, #e2e8f0)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: '0.35rem',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, b.progress)}%`,
                          background: barColor,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{b.progress.toFixed(0)}% utilizado</span>
                    <span style={{ color: b.remaining < 0 ? '#ef4444' : 'inherit', fontWeight: b.remaining < 0 ? 600 : 400 }}>
                      {b.remaining >= 0 ? `Resta R$ ${b.remaining.toFixed(2)}` : `Estourado em R$ ${Math.abs(b.remaining).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
