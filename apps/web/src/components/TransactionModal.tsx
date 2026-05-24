import { useState, FormEvent } from 'react'
import { typeClass, typeLabel } from '../lib/format'
import type { CreateInput, FlatCategory, TxType } from '../types'

interface Props {
  date: string
  type: string
  categories: FlatCategory[]
  onClose: () => void
  onSubmit: (input: CreateInput) => void
  error?: string
}

const TX_TYPES: { value: TxType; cls: string }[] = [
  { value: 'EXPENSE',    cls: 'expense' },
  { value: 'INCOME',     cls: 'income' },
  { value: 'INVESTMENT', cls: 'investment' },
  { value: 'CREDIT',     cls: 'credit' },
]

const CHANNELS = ['PIX', 'BANK', 'CARD_DEBIT', 'CARD_CREDIT']
const CHANNEL_LABELS: Record<string, string> = { PIX: 'Pix', BANK: 'Banco', CARD_DEBIT: 'Débito', CARD_CREDIT: 'Crédito' }

export default function TransactionModal({ date, type: initialType, categories, onClose, onSubmit, error }: Props) {
  const [txType, setTxType] = useState(initialType || 'EXPENSE')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [channel, setChannel] = useState('PIX')
  const [categoryId, setCategoryId] = useState('')
  const [pending, setPending] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const paymentMethod = channel === 'CARD_CREDIT' ? 'CREDIT' : 'DEBIT'
    onSubmit({
      type: txType,
      amount: parseFloat(amount),
      description,
      date,
      status: pending ? 'PENDING' : 'COMPLETED',
      paymentMethod,
      channel,
      categoryId: categoryId || undefined,
    })
  }

  return (
    <div style={{ padding: '1.1rem 1.25rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>Nova transação</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem', lineHeight: 1, padding: '0.1rem 0.3rem' }}>×</button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {initialType ? (
          <div style={{ marginBottom: '0.75rem' }}>
            <span className={`pill active-${typeClass(txType as TxType)}`}>{typeLabel(txType)}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {TX_TYPES.map(({ value, cls }) => (
              <span
                key={value}
                className={`pill ${cls}${txType === value ? ` active-${cls}` : ''}`}
                onClick={() => setTxType(value)}
              >
                {typeLabel(value)}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <input
            type="number" step="0.01" min="0.01" placeholder="0,00" required autoFocus
            value={amount} onChange={e => setAmount(e.target.value)}
            style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}
          />
          <input
            type="text" placeholder="Descrição" maxLength={255} required
            value={description} onChange={e => setDescription(e.target.value)}
            style={{ margin: 0, fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          {CHANNELS.map(ch => (
            <span
              key={ch}
              className={`pill neutral${channel === ch ? ' active-neutral' : ''}`}
              onClick={() => setChannel(ch)}
            >
              {CHANNEL_LABELS[ch]}
            </span>
          ))}
        </div>

        {categories.length > 0 && (
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ margin: '0 0 0.5rem', fontSize: '0.83rem', height: '34px' }}>
            <option value="">Categoria (opcional)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.indent ? '  - ' : ''}{c.name}</option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6b7280' }}>
            <input type="checkbox" checked={pending} onChange={e => setPending(e.target.checked)} style={{ margin: 0, width: 'auto' }} />
            Pendente
          </label>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={{ margin: 0, padding: '0.4rem 0.9rem', fontSize: '0.8rem', borderRadius: '99px', background: 'none', border: '1px solid #e5e7eb', cursor: 'pointer', color: '#6b7280' }}>
            Cancelar
          </button>
          <button type="submit" style={{ margin: 0, padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '99px' }}>
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}
