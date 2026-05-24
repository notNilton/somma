import { useState } from 'react'
import { formatMoney } from '../lib/format'
import type { DayGroup } from '../lib/groupByDay'
import type { TxType } from '../types'

const ROW_TYPES: { type: TxType; letter: string; label: string }[] = [
  { type: 'EXPENSE',    letter: 'D', label: 'Despesa'      },
  { type: 'INCOME',     letter: 'R', label: 'Renda'        },
  { type: 'INVESTMENT', letter: 'I', label: 'Investimento' },
  { type: 'CREDIT',     letter: 'E', label: 'Economia'     },
  { type: 'RETURN',     letter: 'T', label: 'Retorno'      },
]

interface Props {
  group: DayGroup
  filterType: TxType | 'ALL'
  isToday: boolean
  onAdd: (date: string, type: string) => void
  onDelete: (id: string) => void
}

export default function DayGroupComponent({ group, filterType, isToday, onAdd, onDelete }: Props) {
  const [expanded, setExpanded] = useState<TxType | null>(null)

  const visibleTypes = filterType === 'ALL' ? ROW_TYPES : ROW_TYPES.filter(r => r.type === filterType)
  const saldoClass = group.runningBalance > 0 ? 'pos' : group.runningBalance < 0 ? 'neg' : 'zero'

  function handleRowClick(type: TxType) {
    if (group.typeTotals[type]) {
      setExpanded(prev => prev === type ? null : type)
    } else {
      onAdd(group.dateStr, type)
    }
  }

  return (
    <div className={`tx-day-row${isToday ? ' is-today' : ''}`}>
      <div className={`tx-day-num${isToday ? ' today' : ''}`}>
        {group.dayNum}
      </div>

      <div className="tx-type-list">
        {visibleTypes.map(({ type, letter, label }) => {
          const total = group.typeTotals[type] ?? 0
          const hasItems = total > 0
          const isExp = expanded === type
          const txsOfType = group.transactions.filter(t => t.type === type)

          return (
            <div key={type}>
              <div
                className={`tx-type-row${hasItems ? ' has-tx' : ' empty'}`}
                onClick={() => handleRowClick(type)}
                title={hasItems ? `${label}: ${formatMoney(total)}` : `Adicionar ${label}`}
              >
                <span className={`tx-type-icon ${type.toLowerCase()}${hasItems ? '' : ' dim'}`}>
                  {letter}
                </span>
                <span className={`tx-type-amt ${hasItems ? type.toLowerCase() : 'zero'}`}>
                  {hasItems ? formatMoney(total) : 'R$ 0,00'}
                </span>
                {hasItems && (
                  <span className="tx-expand-arrow">{isExp ? '▴' : '▾'}</span>
                )}
              </div>

              {isExp && (
                <div className="tx-type-detail">
                  {txsOfType.map(tx => (
                    <div
                      key={tx.id}
                      className="tx-detail-row"
                      style={tx.id.startsWith('optimistic-') ? { opacity: 0.5 } : undefined}
                    >
                      <span className="tx-detail-desc">{tx.description || '—'}</span>
                      {tx.status === 'PENDING' && <span className="tx-badge pending">Pend.</span>}
                      <span className="tx-detail-amt">{formatMoney(tx.amount)}</span>
                      {!tx.id.startsWith('optimistic-') && (
                        <button
                          className="tx-detail-del"
                          onClick={e => {
                            e.stopPropagation()
                            if (confirm('Remover?')) onDelete(tx.id)
                          }}
                        >×</button>
                      )}
                    </div>
                  ))}
                  <button
                    className="tx-add-inline"
                    onClick={e => { e.stopPropagation(); onAdd(group.dateStr, type) }}
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
