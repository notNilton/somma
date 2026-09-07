import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsApi } from '../api'
import type { Goal, CreateGoalInput } from '../types'

export default function GoalsSection() {
  const qc = useQueryClient()
  const [openNew, setOpenNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [color, setColor] = useState('#10b981')
  const [error, setError] = useState('')

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateGoalInput) => goalsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateGoalInput> }) =>
      goalsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })

  function resetForm() {
    setName('')
    setTargetAmount('')
    setDescription('')
    setTargetDate('')
    setColor('#10b981')
    setError('')
    setOpenNew(false)
    setEditingId(null)
  }

  function handleStartEdit(g: Goal) {
    setEditingId(g.id)
    setName(g.name)
    setTargetAmount(String(g.targetAmount))
    setDescription(g.description ?? '')
    setTargetDate(g.targetDate ?? '')
    setColor(g.color || '#10b981')
    setOpenNew(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nome da meta é obrigatório')
      return
    }
    const amt = parseFloat(targetAmount)
    if (isNaN(amt) || amt <= 0) {
      setError('Valor alvo deve ser maior que zero')
      return
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        input: {
          name,
          targetAmount: amt,
          description: description || undefined,
          targetDate: targetDate || undefined,
          color,
        },
      })
    } else {
      createMutation.mutate({
        name,
        targetAmount: amt,
        description: description || undefined,
        targetDate: targetDate || undefined,
        color,
      })
    }
  }

  return (
    <div
      className="goals-section-card"
      style={{
        padding: '1.2rem',
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '10px',
        marginBottom: '2rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            Caixinhas & Metas de Poupança
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Acompanhe o acúmulo financeiro para seus objetivos e sonhos
          </span>
        </div>
        {!openNew && (
          <button
            type="button"
            className="btn-action-sm"
            onClick={() => { resetForm(); setOpenNew(true) }}
          >
            + Nova Meta
          </button>
        )}
      </div>

      {openNew && (
        <form className="config-pwd-form" onSubmit={handleSubmit} style={{ marginBottom: '1.2rem', background: 'var(--bg-subtle, #f8fafc)' }}>
          <h4>{editingId ? 'Editar Meta' : 'Cadastrar Nova Meta / Caixinha'}</h4>
          {error && <div className="config-form-error">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Nome da Meta</span>
              <input
                className="config-inline-input"
                placeholder="Ex: Viagem de Férias, Entrada do Apartamento, Reserva"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Valor Alvo (R$)</span>
              <input
                className="config-inline-input"
                type="number"
                step="0.01"
                placeholder="5000.00"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Descrição / Motivo (opcional)</span>
              <input
                className="config-inline-input"
                placeholder="Ex: Meta planejada para o fim do ano"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Data Alvo</span>
              <input
                className="config-inline-input"
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Cor Identificadora</span>
              <input
                className="config-inline-input"
                type="color"
                style={{ height: '36px', padding: '2px' }}
                value={color}
                onChange={e => setColor(e.target.value)}
              />
            </label>
          </div>

          <div className="config-form-actions">
            <button type="button" className="btn-action-sm btn-action-ghost" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="btn-action-sm" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Salvar Alterações' : 'Criar Meta'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando metas...
        </div>
      ) : goals.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhuma meta ou caixinha cadastrada. Crie uma para começar a acumular!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {goals.map(g => {
            const isCompleted = g.progress >= 100 || g.isAchieved

            return (
              <div
                key={g.id}
                style={{
                  padding: '1rem',
                  border: `1px solid ${g.color || 'var(--border-color, #e2e8f0)'}`,
                  borderLeft: `5px solid ${g.color || '#10b981'}`,
                  borderRadius: '8px',
                  background: 'var(--bg-subtle, #f8fafc)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{g.name}</strong>
                    {isCompleted && (
                      <span className="pill pill-positive" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                        ✓ Conquistada
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      className="btn-action-sm btn-action-ghost"
                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                      onClick={() => handleStartEdit(g)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm btn-action-danger"
                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        if (confirm(`Remover meta "${g.name}"?`)) removeMutation.mutate(g.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div style={{ margin: '0.6rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Guardado: <strong>R$ {g.savedAmount.toFixed(2)}</strong></span>
                    <span>Alvo: R$ {g.targetAmount.toFixed(2)}</span>
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
                        width: `${Math.min(100, g.progress)}%`,
                        background: g.color || '#10b981',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{g.progress.toFixed(0)}% alcançado</span>
                  <span>
                    {g.targetDate ? `Até ${g.targetDate}` : `Falta R$ ${Math.max(0, g.remaining).toFixed(2)}`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
