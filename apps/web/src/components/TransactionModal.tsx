import { useState, type FormEvent } from 'react'
import { useLocale } from '../i18n'
import type { Budget, Category, CreateInput, Transaction, TxKind } from '../types'

interface Props {
  date: string
  kind: TxKind
  budgets: Budget[]
  categories: Category[]
  onClose: () => void
  onSubmit: (input: CreateInput) => void
  transaction?: Transaction
  error?: string
}

function txTypeForKind(kind: TxKind) {
  return kind === 'INCOME' ? 'INCOME' : 'EXPENSE'
}

function flattenCategories(cats: Category[], indent = false): Array<{ id: string; name: string; indent: boolean }> {
  const result: Array<{ id: string; name: string; indent: boolean }> = []
  for (const c of cats) {
    result.push({ id: c.id, name: c.name, indent })
    if (c.children?.length) result.push(...flattenCategories(c.children, true))
  }
  return result
}

export default function TransactionModal({ date, kind, budgets, categories, onClose, onSubmit, transaction, error }: Props) {
  const { t } = useLocale()
  const isEdit = !!transaction

  const [amount, setAmount] = useState(isEdit ? String(transaction!.amount) : '')
  const [description, setDescription] = useState(isEdit ? (transaction!.description ?? '') : '')
  const [categoryId, setCategoryId] = useState(isEdit ? (transaction!.categoryId ?? '') : '')
  const [budgetId, setBudgetId] = useState(isEdit ? (transaction!.budgetId ?? '') : '')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceFreq, setRecurrenceFreq] = useState('MONTHLY')
  const [recurrenceEnd, setRecurrenceEnd] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      type: txTypeForKind(kind),
      kind,
      amount: parseFloat(amount),
      description,
      date,
      categoryId: categoryId || undefined,
      budgetId: kind === 'BUDGET' ? budgetId : undefined,
      isRecurring: isEdit ? undefined : (isRecurring || undefined),
      recurrenceFreq: (!isEdit && isRecurring) ? recurrenceFreq : undefined,
      recurrenceEnd: (!isEdit && isRecurring && recurrenceEnd) ? recurrenceEnd : undefined,
    })
  }

  const [y, m, d] = date.split('-')
  const dateLabel = `${d}/${m}/${y}`

  const kindCategories = flattenCategories(
    categories.filter(c => c.type === txTypeForKind(kind))
  )

  return (
    <form className="budget-modal tx-modal" onSubmit={handleSubmit}>
      <div className="budget-modal-header">
        <div>
          <div className="budget-modal-kicker">{isEdit ? t.modal.editTitle : t.modal.title}</div>
          <div className="budget-modal-title">{t.kind[kind].label}</div>
          <div className="budget-modal-subtitle">{dateLabel}</div>
        </div>
        <button type="button" className="budget-modal-close" onClick={onClose}>×</button>
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

      {kindCategories.length > 0 && (
        <label className="budget-field">
          <span className="budget-field-label">{t.modal.categoryLabel}</span>
          <select
            className="budget-input"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">—</option>
            {kindCategories.map(c => (
              <option key={c.id} value={c.id}>
                {c.indent ? '  ' : ''}{c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === 'BUDGET' && (
        <label className="budget-field">
          <span className="budget-field-label">{t.kind.BUDGET.label}</span>
          <select
            className="budget-input"
            required
            value={budgetId}
            onChange={e => setBudgetId(e.target.value)}
          >
            <option value="">—</option>
            {budgets.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      )}

      {!isEdit && (
        <label className="budget-field tx-recurring-row">
          <span className="budget-field-label">{t.modal.recurring}</span>
          <input
            type="checkbox"
            className="tx-recurring-check"
            checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
          />
        </label>
      )}

      {!isEdit && isRecurring && (
        <>
          <label className="budget-field">
            <span className="budget-field-label">{t.modal.recurringFreq}</span>
            <select
              className="budget-input"
              value={recurrenceFreq}
              onChange={e => setRecurrenceFreq(e.target.value)}
            >
              <option value="DAILY">{t.modal.freqDaily}</option>
              <option value="WEEKLY">{t.modal.freqWeekly}</option>
              <option value="MONTHLY">{t.modal.freqMonthly}</option>
              <option value="YEARLY">{t.modal.freqYearly}</option>
            </select>
          </label>
          <label className="budget-field">
            <span className="budget-field-label">{t.modal.recurringEndLabel}</span>
            <input
              className="budget-input"
              type="date"
              value={recurrenceEnd}
              onChange={e => setRecurrenceEnd(e.target.value)}
            />
          </label>
        </>
      )}

      <div className="budget-modal-actions">
        <button type="button" onClick={onClose} className="budget-modal-btn budget-modal-btn-secondary">
          {t.modal.cancel}
        </button>
        <button type="submit" className="budget-modal-btn budget-modal-btn-primary">
          {isEdit ? t.modal.saveEdit : t.modal.save}
        </button>
      </div>
    </form>
  )
}
