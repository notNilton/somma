import { useState, type FormEvent } from 'react'
import { useLocale } from '../i18n'
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

export default function TransactionModal({ date, kind, budgets, onClose, onSubmit, error }: Props) {
  const { t } = useLocale()
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
    <form className="budget-modal tx-modal" onSubmit={handleSubmit}>
      <div className="budget-modal-header">
        <div>
          <div className="budget-modal-kicker">Lançamento</div>
          <div className="budget-modal-title">{t.kind[kind].label}</div>
          <div className="budget-modal-subtitle">{dateLabel}</div>
        </div>
        <button type="button" className="budget-modal-close" onClick={onClose}>
          ×
        </button>
      </div>

      {error && <div className="budget-modal-error">{error}</div>}

      <label className="budget-field">
        <span className="budget-field-label">Valor</span>
        <input
          className="budget-amount-input"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          required
          autoFocus
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </label>

      <label className="budget-field">
        <span className="budget-field-label">Descrição</span>
        <input
          className="budget-input"
          type="text"
          placeholder={t.modal.descPlaceholder}
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={255}
        />
      </label>

      {kind === 'BUDGET' && (
        <label className="budget-field">
          <span className="budget-field-label">{t.kind.BUDGET.label}</span>
          <select
            className="budget-input"
            required
            value={budgetId}
            onChange={e => setBudgetId(e.target.value)}
          >
            <option value="">{t.kind.BUDGET.label}</option>
            {budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="budget-modal-actions">
        <button type="button" onClick={onClose} className="budget-modal-btn budget-modal-btn-secondary">
          {t.modal.cancel}
        </button>
        <button type="submit" className="budget-modal-btn budget-modal-btn-primary">
          {t.modal.save}
        </button>
      </div>
    </form>
  )
}
