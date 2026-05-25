import { useState, type FormEvent } from 'react'
import { useLocale } from '../i18n'
import type { Budget, CreateBudgetInput } from '../types'

interface Props {
  budget?: Budget
  onClose: () => void
  onSubmit: (input: CreateBudgetInput) => void
  error?: string
}

export default function BudgetModal({ budget, onClose, onSubmit, error }: Props) {
  const { t } = useLocale()
  const [name, setName] = useState(budget?.name ?? '')
  const [amount, setAmount] = useState(budget ? String(budget.allocatedAmount) : '')
  const [notes, setNotes] = useState(budget?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      name,
      allocatedAmount: parseFloat(amount),
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="tx-modal">
      <div className="tx-modal-header">
        <div className="tx-modal-title">
          {budget ? t.budgets.editBudget : t.budgets.newBudget}
        </div>
        <button className="tx-modal-close" onClick={onClose}>×</button>
      </div>

      {error && <div className="tx-modal-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          className="tx-modal-input"
          type="text"
          placeholder={t.budgets.namePlaceholder}
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={120}
          autoFocus
        />

        <div className="tx-modal-main-field">
          <input
            className="tx-amount-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <input
          className="tx-modal-input"
          type="text"
          placeholder={t.budgets.notesPlaceholder}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={255}
        />

        <div className="tx-modal-actions">
          <button type="button" onClick={onClose} className="tx-modal-btn tx-modal-btn-secondary">
            {t.modal.cancel}
          </button>
          <button type="submit" className="tx-modal-btn tx-modal-btn-primary">
            {t.modal.save}
          </button>
        </div>
      </form>
    </div>
  )
}
