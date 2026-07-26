import { useState, type FormEvent } from 'react'
import { useLocale } from '../i18n'
import type { Category, CreateInput, Transaction, TxKind } from '../types'

interface Props {
  date: string
  kind: TxKind
  categories: Category[]
  onClose: () => void
  onSubmit: (input: CreateInput) => void
  transaction?: Transaction
  error?: string
}

function flattenCategories(cats: Category[], indent = false): Array<{ id: string; name: string; indent: boolean }> {
  const result: Array<{ id: string; name: string; indent: boolean }> = []
  for (const c of cats) {
    result.push({ id: c.id, name: c.name, indent })
    if (c.children?.length) result.push(...flattenCategories(c.children, true))
  }
  return result
}

function typeForKind(kind: TxKind): 'INCOME' | 'EXPENSE' {
  return kind === 'INCOME' ? 'INCOME' : 'EXPENSE'
}

export default function TransactionModal({ date, kind, categories, onClose, onSubmit, transaction, error }: Props) {
  const { t } = useLocale()
  const isEdit = !!transaction

  const [amount, setAmount] = useState(isEdit ? String(transaction!.amount) : '')
  const [description, setDescription] = useState(isEdit ? (transaction!.description ?? '') : '')
  const [categoryId, setCategoryId] = useState(isEdit ? (transaction!.categoryId ?? '') : '')
  const [selectedKind, setSelectedKind] = useState<TxKind>(isEdit ? transaction!.kind : kind)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      type: typeForKind(selectedKind),
      kind: selectedKind,
      amount: parseFloat(amount),
      description,
      date,
      categoryId: categoryId || undefined,
    })
  }

  const [y, m, d] = date.split('-')
  const dateLabel = `${d}/${m}/${y}`

  const filteredCategories = flattenCategories(
    categories.filter(c => c.type === typeForKind(selectedKind))
  )

  return (
    <form className="budget-modal tx-modal" onSubmit={handleSubmit}>
      <div className="budget-modal-header">
        <div>
          <div className="budget-modal-kicker">{isEdit ? t.modal.editTitle : t.modal.title}</div>
          <div className="budget-modal-title">{t.kind[selectedKind].label}</div>
          <div className="budget-modal-subtitle">{dateLabel}</div>
        </div>
        <button type="button" className="budget-modal-close" onClick={onClose}>×</button>
      </div>

      {error && <div className="budget-modal-error">{error}</div>}

      <div className="tx-modal-type-switch">
        {(['INCOME', 'EXPENSE', 'CREDIT'] as TxKind[]).map(k => (
          <button
            key={k}
            type="button"
            className={`tx-modal-btn ${selectedKind === k ? 'tx-modal-btn-primary' : 'tx-modal-btn-secondary'}`}
            onClick={() => setSelectedKind(k)}
          >
            {t.kind[k].label}
          </button>
        ))}
      </div>

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

      {filteredCategories.length > 0 && (
        <label className="budget-field">
          <span className="budget-field-label">{t.modal.categoryLabel}</span>
          <select
            className="budget-input"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">—</option>
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>
                {c.indent ? '  ' : ''}{c.name}
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
          {isEdit ? t.modal.saveEdit : t.modal.save}
        </button>
      </div>
    </form>
  )
}
