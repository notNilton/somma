import { useState } from 'react'
import { formatMoney } from '../lib/format'
import { useLocale } from '../i18n'
import type { DayGroup } from '../lib/groupByDay'
import type { TxKind } from '../types'

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE'

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
  filterType: FilterType
  isToday: boolean
  onAdd: (date: string, kind: TxKind) => void
  onDelete: (id: string) => void
}

export default function DayGroupComponent({ group, filterType, isToday, onAdd, onDelete }: Props) {
  const [expanded, setExpanded] = useState<TxKind | null>(null)
  const { t } = useLocale()

  const visibleKinds = ALL_KINDS.filter(kind =>
    filterType === 'ALL' ? true :
    filterType === 'INCOME' ? kind === 'INCOME' :
    kind !== 'INCOME'
  )

  const saldoClass = group.runningBalance > 0 ? 'pos' : group.runningBalance < 0 ? 'neg' : 'zero'
  const totalClass = group.runningTotal > 0 ? 'pos' : group.runningTotal < 0 ? 'neg' : 'zero'

  function txsFor(kind: TxKind) {
    return group.transactions.filter(tx => tx.kind === kind)
  }

  function totalFor(kind: TxKind) {
    return txsFor(kind).reduce((sum, tx) => sum + tx.amount, 0)
  }

  function handleRowClick(kind: TxKind) {
    if (totalFor(kind) > 0) {
      setExpanded(prev => prev === kind ? null : kind)
      return
    }
    onAdd(group.dateStr, kind)
  }

  return (
    <div className={`tx-day-row${isToday ? ' is-today' : ''}`}>
      <div className={`tx-day-num${isToday ? ' today' : ''}`}>
        {group.dayNum}
      </div>

      <div className="tx-type-list">
        {visibleKinds.map(kind => {
          const { letter, label } = t.kind[kind]
          const tone = KIND_TONES[kind]
          const total = totalFor(kind)
          const hasItems = total > 0
          const isOpen = expanded === kind
          const txs = txsFor(kind)

          return (
            <div key={kind}>
              <div
                className={`tx-type-row${hasItems ? ' has-tx' : ' empty'}`}
                onClick={() => handleRowClick(kind)}
                title={hasItems ? `${label}: ${formatMoney(total)}` : `+ ${label}`}
              >
                <span className={`tx-type-icon ${tone}${hasItems ? '' : ' dim'}`}>
                  {letter}
                </span>
                <span className="tx-type-label">{label}</span>
                <span className={`tx-type-amt ${hasItems ? tone : 'zero'}`}>
                  {hasItems ? formatMoney(total) : 'R$ 0,00'}
                </span>
                {hasItems && <span className="tx-expand-arrow">{isOpen ? '▴' : '▾'}</span>}
              </div>

              {isOpen && (
                <div className="tx-type-detail">
                  {txs.map(tx => (
                    <div
                      key={tx.id}
                      className="tx-detail-row"
                      style={tx.id.startsWith('optimistic-') ? { opacity: 0.5 } : undefined}
                    >
                      <span className="tx-detail-desc">
                        {tx.category?.name || tx.description || label}
                      </span>
                      {tx.status === 'PENDING' && (
                        <span className="tx-badge pending">{t.status.pending}</span>
                      )}
                      <span className="tx-detail-amt">{formatMoney(tx.amount)}</span>
                      {!tx.id.startsWith('optimistic-') && (
                        <button
                          className="tx-detail-del"
                          onClick={e => {
                            e.stopPropagation()
                            if (confirm(t.dayGroup.confirmDelete)) onDelete(tx.id)
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="tx-add-inline"
                    onClick={e => {
                      e.stopPropagation()
                      onAdd(group.dateStr, kind)
                    }}
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
          <div className="tx-total-row budget">
            <span className="tx-total-label">{t.kind.BUDGET.label}</span>
            <span className="tx-total-value budget">-{formatMoney(group.runningBudget)}</span>
          </div>
          <div className="tx-total-row saving">
            <span className="tx-total-label">{t.kind.SAVING.label}</span>
            <span className="tx-total-value saving">-{formatMoney(group.runningInvestment)}</span>
          </div>
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
