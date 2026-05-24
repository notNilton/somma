import { useState } from 'react'
import { formatMoney } from '../lib/format'
import type { DayGroup } from '../lib/groupByDay'
import type { TxKind } from '../types'

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE'

const ROW_TYPES: { kind: TxKind; letter: string; label: string; tone: string }[] = [
  { kind: 'INCOME', letter: 'R', label: 'Renda', tone: 'income' },
  { kind: 'EXPENSE', letter: 'D', label: 'Despesa', tone: 'expense' },
  { kind: 'CREDIT', letter: 'C', label: 'Credito', tone: 'credit' },
  { kind: 'SAVING', letter: 'E', label: 'Economia', tone: 'saving' },
  { kind: 'BUDGET', letter: 'O', label: 'Orcamento', tone: 'budget' },
]

interface Props {
  group: DayGroup
  filterType: FilterType
  isToday: boolean
  onAdd: (date: string, kind: TxKind) => void
  onDelete: (id: string) => void
}

export default function DayGroupComponent({ group, filterType, isToday, onAdd, onDelete }: Props) {
  const [expanded, setExpanded] = useState<TxKind | null>(null)

  const visibleTypes = filterType === 'ALL'
    ? ROW_TYPES
    : ROW_TYPES.filter(row => filterType === 'INCOME' ? row.kind === 'INCOME' : row.kind !== 'INCOME')
  const saldoClass = group.runningBalance > 0 ? 'pos' : group.runningBalance < 0 ? 'neg' : 'zero'

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
        {visibleTypes.map(({ kind, letter, label, tone }) => {
          const total = totalFor(kind)
          const hasItems = total > 0
          const isOpen = expanded === kind
          const txs = txsFor(kind)

          return (
            <div key={kind}>
              <div
                className={`tx-type-row${hasItems ? ' has-tx' : ' empty'}`}
                onClick={() => handleRowClick(kind)}
                title={hasItems ? `${label}: ${formatMoney(total)}` : `Adicionar ${label}`}
              >
                <span className={`tx-type-icon ${tone}${hasItems ? '' : ' dim'}`}>
                  {letter}
                </span>
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
                      {tx.status === 'PENDING' && <span className="tx-badge pending">Pend.</span>}
                      <span className="tx-detail-amt">{formatMoney(tx.amount)}</span>
                      {!tx.id.startsWith('optimistic-') && (
                        <button
                          className="tx-detail-del"
                          onClick={e => {
                            e.stopPropagation()
                            if (confirm('Remover?')) onDelete(tx.id)
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
                    + adicionar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className={`tx-saldo ${saldoClass}`}>
        {group.runningBalance !== 0 ? formatMoney(group.runningBalance) : ''}
      </div>
    </div>
  )
}
