import { useState, type FormEvent } from 'react'
import { useLocale } from '../i18n'
import type { Account, Category, CreateInput, CreditCard, Transaction, TxKind } from '../types'

interface Props {
  date: string
  kind: TxKind
  categories: Category[]
  accounts?: Account[]
  cards?: CreditCard[]
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

export default function TransactionModal({
  date,
  kind,
  categories,
  accounts = [],
  cards = [],
  onClose,
  onSubmit,
  transaction,
  error,
}: Props) {
  const { t } = useLocale()
  const isEdit = !!transaction

  const [amount, setAmount] = useState(isEdit ? String(transaction!.amount) : '')
  const [description, setDescription] = useState(isEdit ? (transaction!.description ?? '') : '')
  const [categoryId, setCategoryId] = useState(isEdit ? (transaction!.categoryId ?? '') : '')
  const [selectedKind, setSelectedKind] = useState<TxKind>(isEdit ? transaction!.kind : kind)
  const [txDate, setTxDate] = useState(date)
  const [accountId, setAccountId] = useState(isEdit ? (transaction!.accountId ?? '') : '')
  const [cardId, setCardId] = useState(isEdit ? (transaction!.cardId ?? '') : '')
  const [installments, setInstallments] = useState(isEdit && transaction!.totalInstallments ? transaction!.totalInstallments : 1)

  // Multi-moeda & Câmbio
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL')
  const [foreignAmount, setForeignAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('5.50')
  const iofPct = '3.38'
  const spreadPct = '1.5'

  // Upload e pré-visualização de comprovante/recibo
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setReceiptPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Recalcular valor em BRL caso seja moeda estrangeira
  function handleForeignAmountChange(val: string) {
    setForeignAmount(val)
    const fAmt = parseFloat(val) || 0
    const rate = parseFloat(exchangeRate) || 1
    const iof = parseFloat(iofPct) || 0
    const spread = parseFloat(spreadPct) || 0
    const base = fAmt * rate
    const totalBrl = base + (base * (spread / 100)) + (base * (iof / 100))
    if (totalBrl > 0) {
      setAmount(totalBrl.toFixed(2))
    }
  }

  // Autocategorização inteligente por palavras-chave na descrição
  function handleDescriptionChange(desc: string) {
    setDescription(desc)
    if (!categoryId) {
      const lower = desc.toLowerCase()
      const found = categories.find(c => {
        const cName = c.name.toLowerCase()
        if (cName.includes('transporte') && (lower.includes('uber') || lower.includes('99') || lower.includes('posto') || lower.includes('combustivel'))) return true
        if (cName.includes('aliment') && (lower.includes('ifood') || lower.includes('mercado') || lower.includes('restaurante') || lower.includes('padaria'))) return true
        if (cName.includes('lazer') && (lower.includes('cinema') || lower.includes('bar') || lower.includes('jogo') || lower.includes('show'))) return true
        if (cName.includes('moradia') && (lower.includes('aluguel') || lower.includes('condominio') || lower.includes('luz') || lower.includes('energia') || lower.includes('agua'))) return true
        return false
      })
      if (found) {
        setCategoryId(found.id)
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      type: typeForKind(selectedKind),
      kind: selectedKind,
      amount: parseFloat(amount),
      description,
      date: txDate,
      categoryId: categoryId || undefined,
      accountId: selectedKind !== 'CREDIT' && accountId ? accountId : undefined,
      cardId: selectedKind === 'CREDIT' && cardId ? cardId : undefined,
      totalInstallments: selectedKind === 'CREDIT' && installments > 1 ? installments : undefined,
    })
  }

  const filteredCategories = flattenCategories(
    categories.filter(c => c.type === typeForKind(selectedKind))
  )

  return (
    <form className="budget-modal tx-modal" onSubmit={handleSubmit}>
      <div className="budget-modal-header">
        <div>
          <div className="budget-modal-kicker">{isEdit ? t.modal.editTitle : t.modal.title}</div>
          <div className="budget-modal-title">{t.kind[selectedKind].label}</div>
          <input
            className="budget-modal-subtitle budget-modal-date-input"
            type="date"
            value={txDate}
            onChange={e => setTxDate(e.target.value)}
            required
          />
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
            onClick={() => {
              setSelectedKind(k)
            }}
          >
            {t.kind[k].label}
          </button>
        ))}
      </div>

      {/* Seletor de Moeda e Multi-moeda */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {(['BRL', 'USD', 'EUR'] as const).map(m => (
          <button
            key={m}
            type="button"
            className={`pill neutral${currency === m ? ' active-neutral' : ''}`}
            onClick={() => setCurrency(m)}
          >
            {m === 'BRL' ? '🇧🇷 BRL (R$)' : m === 'USD' ? '🇺🇸 USD ($)' : '🇪🇺 EUR (€)'}
          </button>
        ))}
      </div>

      {currency !== 'BRL' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', background: 'var(--bg-subtle, #f8fafc)', padding: '0.6rem', borderRadius: '6px' }}>
          <label className="budget-field">
            <span className="budget-field-label">Valor em {currency}</span>
            <input
              className="budget-amount-input"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={foreignAmount}
              onChange={e => handleForeignAmountChange(e.target.value)}
              required
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">Cotação (R$)</span>
            <input
              className="budget-input"
              type="number"
              step="0.0001"
              value={exchangeRate}
              onChange={e => {
                setExchangeRate(e.target.value)
                handleForeignAmountChange(foreignAmount)
              }}
            />
          </label>
          <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total convertido com IOF ({iofPct}%) e Spread ({spreadPct}%): <strong>R$ {amount || '0,00'}</strong>
          </div>
        </div>
      ) : (
        <label className="budget-field">
          <span className="budget-field-label">Valor (R$)</span>
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
      )}

      <label className="budget-field">
        <span className="budget-field-label">Descrição</span>
        <input
          className="budget-input"
          type="text"
          placeholder={t.modal.descPlaceholder}
          value={description}
          onChange={e => handleDescriptionChange(e.target.value)}
          maxLength={255}
        />
      </label>

      {/* Conta Bancária para Débito / Renda */}
      {selectedKind !== 'CREDIT' && accounts.length > 0 && (
        <label className="budget-field">
          <span className="budget-field-label">Conta Bancária / Carteira</span>
          <select
            className="budget-input"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
          >
            <option value="">— Sem conta vinculada —</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (R$ {acc.balance.toFixed(2)})
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Cartão de Crédito e Parcelamento para Crédito */}
      {selectedKind === 'CREDIT' && (
        <>
          {cards.length > 0 && (
            <label className="budget-field">
              <span className="budget-field-label">Cartão de Crédito</span>
              <select
                className="budget-input"
                value={cardId}
                onChange={e => setCardId(e.target.value)}
              >
                <option value="">— Selecione o cartão —</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.last4 ? `(final ${c.last4})` : ''} - Disp: R$ {c.availableLimit.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isEdit && (
            <label className="budget-field">
              <span className="budget-field-label">Parcelamento</span>
              <select
                className="budget-input"
                value={installments}
                onChange={e => setInstallments(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map(n => {
                  const amt = parseFloat(amount) || 0
                  const parcelVal = amt > 0 ? (amt / n).toFixed(2) : '0,00'
                  return (
                    <option key={n} value={n}>
                      {n === 1 ? '1x à vista' : `${n}x de R$ ${parcelVal}`}
                    </option>
                  )
                })}
              </select>
            </label>
          )}
        </>
      )}

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

      {/* Upload e Pré-visualização de Comprovante */}
      <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
          📎 Anexar Comprovante / Recibo (opcional)
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleReceiptChange}
          style={{ fontSize: '0.8rem' }}
        />
        {receiptPreview && (
          <div style={{ marginTop: '0.5rem' }}>
            <img
              src={receiptPreview}
              alt="Pré-visualização do comprovante"
              style={{ maxHeight: '100px', borderRadius: '4px', border: '1px solid var(--border-color, #e2e8f0)' }}
            />
          </div>
        )}
      </div>

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
