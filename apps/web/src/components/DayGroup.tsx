import { typeClass, typeInitial, signPrefix, formatMoney } from '../lib/format'
import type { DayGroup } from '../lib/groupByDay'

interface Props {
  group: DayGroup
  onAdd: (date: string, type: string) => void
  onDelete: (id: string) => void
}

export default function DayGroupComponent({ group, onAdd, onDelete }: Props) {
  const { dateStr, label, transactions, netAmount } = group
  const hasTx = transactions.length > 0

  return (
    <div className="day-group">
      <div className="day-header">
        <span className="day-label">{label}</span>
        {netAmount !== 0 && (
          <span className={`day-net ${netAmount > 0 ? 'pos' : 'neg'}`}>
            {netAmount > 0 ? '+' : ''}{formatMoney(netAmount)}
          </span>
        )}
      </div>

      <div className={hasTx ? undefined : 'no-tx'}>
        {hasTx && (
          <div className="tx-card">
            {transactions.map(tx => {
              const isOptimistic = tx.id.startsWith('optimistic-')
              return (
                <div key={tx.id} className="tx-row" style={isOptimistic ? { opacity: 0.6 } : undefined}>
                  <div
                    className={`tx-icon ${typeClass(tx.type)}`}
                    style={tx.category?.color ? { background: tx.category.color } : undefined}
                  >
                    {typeInitial(tx.type)}
                  </div>
                  <span className="tx-desc">{tx.description}</span>
                  {tx.status === 'PENDING' && <span className="tx-badge pending">Pend.</span>}
                  <span className={`tx-amount ${typeClass(tx.type)}`}>
                    {signPrefix(tx.type)}{formatMoney(tx.amount)}
                  </span>
                  {!isOptimistic && (
                    <button
                      className="btn-del"
                      title="Remover"
                      onClick={() => { if (confirm('Remover?')) onDelete(tx.id) }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="quick-add">
          {[
            { type: 'EXPENSE',    cls: 'qa-expense',    label: 'D' },
            { type: 'INCOME',     cls: 'qa-income',     label: 'R' },
            { type: 'INVESTMENT', cls: 'qa-investment',  label: 'I' },
            { type: 'CREDIT',     cls: 'qa-credit',     label: 'C' },
          ].map(({ type, cls, label }) => (
            <button
              key={type}
              className={`qa-btn ${cls}`}
              title={type}
              onClick={() => onAdd(dateStr, type)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
