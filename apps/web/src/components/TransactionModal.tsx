import { useState, type FormEvent } from 'react'
import type { Budget, CreateInput, TxKind } from '../types'

interface Props {
  date: string
  kind: TxKind
  budgets: Budget[]
  onClose: () => void
  onSubmit: (input: CreateInput) => void
  error?: string
}

function txTypeForKind(kind: TxKind) {
  return kind === 'INCOME' ? 'INCOME' : 'EXPENSE'
}

function titleForKind(kind: TxKind) {
  switch (kind) {
    case 'INCOME': return 'Nova renda'
    case 'CREDIT': return 'Novo pagamento de credito'
    case 'SAVING': return 'Nova economia'
    case 'BUDGET': return 'Novo lancamento de orcamento'
    default: return 'Nova despesa'
  }
}

export default function TransactionModal({ date, kind, budgets, onClose, onSubmit, error }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [budgetId, setBudgetId] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      type: txTypeForKind(kind),
      kind,
      amount: parseFloat(amount),
      description,
      date,
      budgetId: kind === 'BUDGET' ? budgetId : undefined,
    })
  }

  const [y, m, d] = date.split('-')
  const dateLabel = `${d}/${m}/${y}`

  return (
    <div className="tx-modal">
      <div className="tx-modal-header">
        <div>
          <div className="tx-modal-title">{titleForKind(kind)}</div>
          <div className="tx-modal-date">{dateLabel}</div>
        </div>
        <button className="tx-modal-close" onClick={onClose}>×</button>
      </div>

      {error && <div className="tx-modal-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="tx-modal-main-field">
          <input
            className="tx-amount-input"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            required
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <input
          className="tx-modal-input"
          type="text"
          placeholder="Descrição (opcional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={255}
        />

        {kind === 'BUDGET' && (
          <select
            className="tx-modal-select"
            required
            value={budgetId}
            onChange={e => setBudgetId(e.target.value)}
          >
            <option value="">Selecione um orcamento</option>
            {budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name}
              </option>
            ))}
          </select>
        )}

        <div className="tx-modal-actions">
          <button type="button" onClick={onClose} className="tx-modal-btn tx-modal-btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="tx-modal-btn tx-modal-btn-primary">
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}
