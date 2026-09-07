import { useState } from 'react'
import { formatMoney } from '../lib/format'
import { useLocale } from '../i18n'
import type { DayGroup } from '../lib/groupByDay'
import type { Transaction, TxKind } from '../types'

const KIND_TONES: Record<TxKind, string> = {
  INCOME: 'income',
  EXPENSE: 'expense',
  CREDIT: 'credit',
}

const ALL_KINDS: TxKind[] = ['INCOME', 'EXPENSE', 'CREDIT']

interface Props {
  group: DayGroup
  filterType: 'ALL' | 'INCOME' | 'EXPENSE'
  isToday: boolean
  selectedTxIds?: Set<string>
  onToggleSelectTx?: (id: string) => void
  onAdd: (date: string, kind: TxKind) => void
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

  const visibleKinds = ALL_KINDS.filter(kind =>
    filterType === 'ALL' ? true :
    filterType === 'INCOME' ? kind === 'INCOME' :
    kind !== 'INCOME'
  )

  const saldoClass = group.runningBalance > 0 ? 'pos' : group.runningBalance < 0 ? 'neg' : 'zero'
  const totalClass = group.runningTotal > 0 ? 'pos' : group.runningTotal < 0 ? 'neg' : 'zero'

  function getEffectiveKind(tx: Transaction): TxKind {
    if (tx.kind === 'CREDIT') return 'CREDIT'
    if (tx.kind === 'INCOME') return 'INCOME'
    if (tx.kind === 'EXPENSE') return 'EXPENSE'
    return tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
  }

  function txsFor(kind: TxKind) {
    return group.transactions.filter(tx => getEffectiveKind(tx) === kind)
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
    <div className={`day-group${isToday ? ' is-today' : ''}`}>
      <div className="day-col">
        <span className="dia-num">{group.dayNum}</span>
        <span className="dia-sem">{new Date(group.dateStr + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
      </div>

      <div className="tx-kinds">
        {visibleKinds.map(kind => {
          const txs = txsFor(kind)
          const total = totalFor(kind)
          const isExp = expanded === kind
          const label = t.kind[kind].label

          return (
            <div key={kind} className={`tx-kind-block ${KIND_TONES[kind]}`}>
              <div
                className={`tx-kind-row ${KIND_TONES[kind]}${total === 0 ? ' is-empty' : ''}`}
                onClick={() => handleRowClick(kind)}
              >
                <span className="tx-kind-label">{label}</span>
                <span className="tx-kind-total">
                  {total > 0 ? formatMoney(total) : '—'}
                </span>
                {txs.length > 0 && (
                  <span className={`tx-kind-chevron ${isExp ? 'open' : ''}`}>›</span>
                )}
              </div>

              {isExp && txs.length > 0 && (
                <div className="tx-detail-list">
                  {txs.map(tx => {
                    const isSelected = selectedTxIds.has(tx.id)
                    return (
                      <div
                        key={tx.id}
                        className={`tx-detail-item ${isSelected ? 'tx-selected' : ''}`}
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
