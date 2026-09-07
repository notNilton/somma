import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cardsApi, accountsApi } from '../api'
import type { CreditCard } from '../types'
import CardInvoicesModal from './CardInvoicesModal'
import FutureInstallmentsModal from './FutureInstallmentsModal'

export default function CardsSettingsSection() {
  const qc = useQueryClient()
  const [openNew, setOpenNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewInvoicesCard, setViewInvoicesCard] = useState<CreditCard | null>(null)
  const [openFutureTimeline, setOpenFutureTimeline] = useState(false)

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [last4, setLast4] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [closingDay, setClosingDay] = useState('5')
  const [dueDay, setDueDay] = useState('15')
  const [error, setError] = useState('')

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: cardsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => cardsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      resetForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: cardsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  })

  function resetForm() {
    setName('')
    setBrand('')
    setLast4('')
    setCreditLimit('')
    setClosingDay('5')
    setDueDay('15')
    setError('')
    setOpenNew(false)
    setEditingId(null)
  }

  function handleStartEdit(card: CreditCard) {
    setEditingId(card.id)
    setName(card.name)
    setBrand(card.brand ?? '')
    setLast4(card.last4 ?? '')
    setCreditLimit(String(card.creditLimit))
    setClosingDay(String(card.closingDay))
    setDueDay(String(card.dueDay))
    setOpenNew(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }
    const cDay = parseInt(closingDay, 10)
    const dDay = parseInt(dueDay, 10)
    if (cDay < 1 || cDay > 31 || dDay < 1 || dDay > 31) {
      setError('Dias de fechamento e vencimento devem ser entre 1 e 31')
      return
    }
    const limitNum = parseFloat(creditLimit) || 0

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        input: {
          name,
          brand: brand || undefined,
          last4: last4 || undefined,
          creditLimit: limitNum,
          closingDay: cDay,
          dueDay: dDay,
        },
      })
    } else {
      createMutation.mutate({
        name,
        brand: brand || undefined,
        last4: last4 || undefined,
        creditLimit: limitNum,
        closingDay: cDay,
        dueDay: dDay,
      })
    }
  }

  return (
    <section className="config-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="config-section-title">Cartões de Crédito</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-action-sm btn-action-ghost"
            title="Visualizar parcelamentos futuros dos cartões"
            onClick={() => setOpenFutureTimeline(true)}
          >
            📅 Linha do Tempo Futura
          </button>
          {!openNew && (
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => { resetForm(); setOpenNew(true) }}
            >
              + Novo Cartão
            </button>
          )}
        </div>
      </div>

      {openNew && (
        <form className="config-pwd-form" onSubmit={handleSubmit} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <h4>{editingId ? 'Editar Cartão' : 'Cadastrar Cartão de Crédito'}</h4>
          {error && <div className="config-form-error">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Nome do Cartão</span>
              <input
                className="config-inline-input"
                placeholder="Ex: Nubank Ultravioleta, Itaú Black"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Bandeira (opcional)</span>
              <input
                className="config-inline-input"
                placeholder="Mastercard, Visa"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Últimos 4 dígitos</span>
              <input
                className="config-inline-input"
                placeholder="1234"
                maxLength={4}
                value={last4}
                onChange={e => setLast4(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Limite Total (R$)</span>
              <input
                className="config-inline-input"
                type="number"
                step="0.01"
                placeholder="5000.00"
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
                required
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Dia Fechamento</span>
              <input
                className="config-inline-input"
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={e => setClosingDay(e.target.value)}
                required
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Dia Vencimento</span>
              <input
                className="config-inline-input"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="config-form-actions">
            <button type="button" className="btn-action-sm btn-action-ghost" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="btn-action-sm" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Cartão'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Carregando cartões...</div>
      ) : cards.length === 0 ? (
        <div style={{ padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Nenhum cartão de crédito cadastrado. Cadastre seu cartão para controlar faturas, cortes e limites.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {cards.map(card => (
            <div
              key={card.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.6rem 0.8rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '6px',
              }}
            >
              <div>
                <strong>💳 {card.name}</strong>
                {card.last4 && (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    •••• {card.last4}
                  </span>
                )}
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Limite: <strong>R$ {card.creditLimit.toFixed(2)}</strong> | Disponível:{' '}
                  <strong style={{ color: 'var(--color-ok, #10b981)' }}>R$ {card.availableLimit.toFixed(2)}</strong>
                  <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                    (Fecha dia {card.closingDay} • Vence dia {card.dueDay})
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-action-sm"
                  onClick={() => setViewInvoicesCard(card)}
                >
                  Faturas & Fechamentos
                </button>
                <button
                  type="button"
                  className="btn-action-sm btn-action-ghost"
                  onClick={() => handleStartEdit(card)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-action-sm btn-action-danger"
                  onClick={() => {
                    if (confirm(`Deseja realmente remover o cartão "${card.name}"?`)) {
                      removeMutation.mutate(card.id)
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewInvoicesCard && (
        <CardInvoicesModal
          card={viewInvoicesCard}
          accounts={accounts}
          onClose={() => setViewInvoicesCard(null)}
        />
      )}

      {openFutureTimeline && (
        <FutureInstallmentsModal
          onClose={() => setOpenFutureTimeline(false)}
        />
      )}
    </section>
  )
}
