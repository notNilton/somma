import { useState, type FormEvent } from 'react'
import { useLocale } from '../i18n'
import type { Budget, CreateBudgetInput } from '../types'

interface Props {
  budget?: Budget
  onClose: () => void
  onSubmit: (input: CreateBudgetInput) => void
  error?: string
  saving?: boolean
}

export default function BudgetModal({ budget, onClose, onSubmit, error, saving = false }: Props) {
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
    <form className="budget-modal" onSubmit={handleSubmit}>
      <div className="budget-modal-header">
        <div>
          <div className="budget-modal-kicker">Orçamento</div>
          <div className="budget-modal-title">
            {budget ? t.budgets.editBudget : t.budgets.newBudget}
          </div>
          <div className="budget-modal-subtitle">
            Reserve um valor para uma meta específica.
          </div>
        </div>
        <button type="button" className="budget-modal-close" onClick={onClose}>
          ×
        </button>
      </div>

      {error && <div className="budget-modal-error">{error}</div>}

      <label className="budget-field">
        <span className="budget-field-label">{t.budgets.namePlaceholder}</span>
        <input
          className="budget-input"
          type="text"
          placeholder={t.budgets.namePlaceholder}
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={120}
          autoFocus
        />
      </label>

      <label className="budget-field">
        <span className="budget-field-label">Valor reservado</span>
        <input
          className="budget-amount-input"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          required
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </label>

      <label className="budget-field">
        <span className="budget-field-label">{t.budgets.notesPlaceholder}</span>
        <input
          className="budget-input"
          type="text"
          placeholder={t.budgets.notesPlaceholder}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={255}
        />
      </label>

      <div className="budget-modal-actions">
        <button type="button" onClick={onClose} className="budget-modal-btn budget-modal-btn-secondary">
          {t.modal.cancel}
        </button>
        <button type="submit" className="budget-modal-btn budget-modal-btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : t.modal.save}
        </button>
      </div>
    </form>
  )
}
