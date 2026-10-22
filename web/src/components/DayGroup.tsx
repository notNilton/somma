import { useState } from 'react'
import { formatMoney } from '../lib/format'
import { useLocale } from '../i18n'
import type { DayGroup } from '../lib/groupByDay'
import type { Transaction, TxKind } from '../types'

const KIND_TONES: Record<TxKind, string> = {
  INCOME: 'income',
  EXPENSE: 'expense',
  CREDIT: 'credit',
  SAVING: 'saving',
  BUDGET: 'budget',
}

const ALL_KINDS: TxKind[] = ['INCOME', 'EXPENSE', 'CREDIT', 'SAVING', 'BUDGET']

interface Props {
  group: DayGroup
  filterType: 'ALL' | 'INCOME' | 'EXPENSE'
  isToday: boolean
  selectedTxIds?: Set<string>
  onToggleSelectTx?: (id: string) => void
  onAdd: (date: string, kind?: TxKind) => void
  onDelete: (id: string) => void
  onEdit: (tx: Transaction) => void
}

export default function DayGroupComponent({
  group,
  filterType,
  isToday,
  selectedTxIds = new Set(),
  onToggleSelectTx,
  onAdd,
  onDelete,
  onEdit,
}: Props) {
  const [expanded, setExpanded] = useState<TxKind | null>(null)
  const { t } = useLocale()

  const allowedKinds = ALL_KINDS.filter(kind =>
    filterType === 'ALL' ? true :
    filterType === 'INCOME' ? kind === 'INCOME' :
    kind !== 'INCOME'
  )
  // Só aparecem as linhas dos tipos que têm lançamento no dia.
  const visibleKinds = allowedKinds.filter(kind => txsFor(kind).length > 0)

  const saldoClass = group.runningBalance > 0 ? 'pos' : group.runningBalance < 0 ? 'neg' : 'zero'
  const totalClass = group.runningTotal > 0 ? 'pos' : group.runningTotal < 0 ? 'neg' : 'zero'

  function getEffectiveKind(tx: Transaction): TxKind {
    if (tx.kind === 'CREDIT' || tx.kind === 'SAVING' || tx.kind === 'BUDGET') return tx.kind
    return tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
  }

  function txsFor(kind: TxKind) {
    return group.transactions.filter(tx => getEffectiveKind(tx) === kind)
  }

  function totalFor(kind: TxKind) {
    return txsFor(kind).reduce((sum, tx) => sum + tx.amount, 0)
  }

  function handleRowClick(kind: TxKind) {
    setExpanded(prev => prev === kind ? null : kind)
  }

  return (
    <div className={`tx-day-row${isToday ? ' is-today' : ''}`}>
      <div className={`tx-day-num${isToday ? ' today' : ''}`}>
        {group.dayNum}
      </div>

      <div>
        {visibleKinds.map(kind => {
          const txs = txsFor(kind)
          const total = totalFor(kind)
          const isExp = expanded === kind
          const label = t.kind[kind].label
          const tone = KIND_TONES[kind]
          const hasItems = txs.length > 0

          return (
            <div key={kind}>
              <div
                className="tx-type-row"
                onClick={() => handleRowClick(kind)}
                title={hasItems ? `${label}: ${formatMoney(total)}` : label}
              >
                <span className={`tx-type-icon ${tone}${hasItems ? '' : ' dim'}`}>
                  {t.kind[kind].letter}
                </span>
                <span className="tx-type-label">{label}</span>
                <span className={`tx-type-amt ${hasItems ? tone : 'zero'}`}>
                  {total > 0 ? formatMoney(total) : '—'}
                </span>
                {hasItems && (
                  <span className="tx-expand-arrow">{isExp ? '▴' : '▾'}</span>
                )}
              </div>

              {isExp && hasItems && (
                <div className="tx-type-detail">
                  {txs.map(tx => {
                    const isSelected = selectedTxIds.has(tx.id)
                    return (
                      <div
                        key={tx.id}
                        className={`tx-detail-row${isSelected ? ' tx-selected' : ''}`}
                        onClick={e => {
                          if (onToggleSelectTx) {
                            e.stopPropagation()
                            onToggleSelectTx(tx.id)
                          }
                        }}
                      >
                        {onToggleSelectTx && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ marginRight: '0.4rem' }}
                          />
                        )}
                        <span className="tx-detail-desc">
                          {tx.category?.name || tx.description || label}
                        </span>
                        {tx.isInvoicePayment && (
                          <span className="tx-badge recurring" title="Pagamento de fatura do cartão">fatura</span>
                        )}
                        {tx.isRecurring && (
                          <span className="tx-badge recurring" title="Repete todo mês">mensal</span>
                        )}
                        {tx.status === 'PENDING' && (
                          <span className="tx-badge pending">{t.status.pending}</span>
                        )}
                        <span className="tx-detail-amt">{formatMoney(tx.amount)}</span>
                        {!tx.id.startsWith('optimistic-') && (
                          <>
                            <button
                              className="tx-detail-edit"
                              onClick={e => { e.stopPropagation(); onEdit(tx) }}
                              title="Editar"
                            >
                              ✎
                            </button>
                            <button
                              className="tx-detail-del"
                              onClick={e => {
                                e.stopPropagation()
                                if (confirm(t.dayGroup.confirmDelete)) onDelete(tx.id)
                              }}
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                  <button
                    className="tx-add-inline"
                    onClick={e => { e.stopPropagation(); onAdd(group.dateStr, kind) }}
                  >
                    {t.dayGroup.addInline}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className={`tx-total ${saldoClass}`}>
        <div className="tx-total-head">
          <span className="tx-total-title">{t.dayGroup.balance}</span>
          <span className={`tx-total-balance ${saldoClass}`}>
            {group.runningBalance > 0 ? '+' : ''}{formatMoney(group.runningBalance)}
          </span>
        </div>

        <div className="tx-total-breakdown">
          <div className="tx-total-row total">
            <span className="tx-total-label">{t.table.total}</span>
            <span className={`tx-total-value total ${totalClass}`}>
              {group.runningTotal > 0 ? '+' : ''}{formatMoney(group.runningTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
