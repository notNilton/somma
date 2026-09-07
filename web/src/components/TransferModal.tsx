import { useState, type FormEvent } from 'react'
import type { Account, TransferInput } from '../types'

interface Props {
  accounts: Account[]
  onClose: () => void
  onSubmit: (input: TransferInput) => void
  error?: string
}

export default function TransferModal({ accounts, onClose, onSubmit, error }: Props) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) {
      setValidationError('Selecione as contas de origem e destino')
      return
    }
    if (fromAccountId === toAccountId) {
      setValidationError('A conta de origem e destino não podem ser iguais')
      return
    }
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setValidationError('Informe um valor válido maior que zero')
      return
    }
    setValidationError('')
    onSubmit({
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      date,
      description: description || undefined,
    })
  }

  return (
    <div className="budget-modal-backdrop" onClick={onClose}>
      <form
        className="budget-modal tx-modal"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="budget-modal-header">
          <div>
            <div className="budget-modal-kicker">Movimentação Neutra</div>
            <div className="budget-modal-title">Transferência entre Contas</div>
          </div>
          <button type="button" className="budget-modal-close" onClick={onClose}>×</button>
        </div>

        {(error || validationError) && (
          <div className="budget-modal-error">{error || validationError}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <label className="budget-field">
            <span className="budget-field-label">Origem (Saída)</span>
            <select
              className="budget-input"
              value={fromAccountId}
              onChange={e => setFromAccountId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (R$ {acc.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </label>

          <label className="budget-field">
            <span className="budget-field-label">Destino (Entrada)</span>
            <select
              className="budget-input"
              value={toAccountId}
              onChange={e => setToAccountId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (R$ {acc.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="budget-field">
          <span className="budget-field-label">Valor da Transferência</span>
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
          <span className="budget-field-label">Data</span>
          <input
            className="budget-input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </label>

        <label className="budget-field">
          <span className="budget-field-label">Observação / Motivo (Opcional)</span>
          <input
            className="budget-input"
            type="text"
            placeholder="Ex: Reserva mensal, Pagamento de dívida interna"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={120}
          />
        </label>

        <div className="budget-modal-actions">
          <button type="button" onClick={onClose} className="budget-modal-btn budget-modal-btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="budget-modal-btn budget-modal-btn-primary">
            Transferir
          </button>
        </div>
      </form>
    </div>
  )
}
