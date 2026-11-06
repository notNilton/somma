import { useRef } from 'react'
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

interface Props {
  group: DayGroup
  filterType: 'ALL' | 'INCOME' | 'EXPENSE'
  isToday: boolean
  /** Categoria e conta ou cartão de cada lançamento. */
  detailFor?: (tx: Transaction) => string
  selectedTxIds?: Set<string>
  onToggleSelectTx?: (id: string) => void
  onAdd: (date: string, kind?: TxKind) => void
  onDelete: (tx: Transaction) => void
  onEdit: (tx: Transaction) => void
}

function effectiveKind(tx: Transaction): TxKind {
  if (tx.kind === 'CREDIT' || tx.kind === 'SAVING' || tx.kind === 'BUDGET') return tx.kind
  return tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
}

const LONG_PRESS_MS = 500

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${formatMoney(value)}`
}

function tone(value: number) {
  return value > 0 ? 'pos' : value < 0 ? 'neg' : 'zero'
}

export default function DayGroupComponent({
  group,
  filterType,
  isToday,
  detailFor,
  selectedTxIds = new Set(),
  onToggleSelectTx,
  onAdd,
  onDelete,
  onEdit,
}: Props) {
  const { t, locale } = useLocale()
  // No toque, segurar a linha seleciona; o clique que vem depois é ignorado.
  const pressTimer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)

  function startPress(id: string) {
    longPressed.current = false
    if (!onToggleSelectTx) return
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      onToggleSelectTx(id)
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    window.clearTimeout(pressTimer.current)
  }

  const txs = group.transactions.filter(tx =>
    filterType === 'ALL' ? true :
    filterType === 'INCOME' ? tx.type === 'INCOME' :
    tx.type !== 'INCOME'
  )
  const selecting = selectedTxIds.size > 0
  const weekday = new Date(`${group.dateStr}T12:00:00`).toLocaleDateString(locale, { weekday: 'long' })

  return (
    <section className={`day${isToday ? ' is-today' : ''}`}>
      <header className="day-head">
        <span className="day-num">{group.dayNum}</span>
        <span className="day-weekday">{isToday ? 'hoje' : weekday}</span>
        <button
          className="day-add"
          onClick={() => onAdd(group.dateStr)}
          title={t.dayGroup.addInline}
          aria-label={t.dayGroup.addInline}
        >
          +
        </button>
        <span className="day-totals">
          <span>Saldo <b className={tone(group.runningBalance)}>{signed(group.runningBalance)}</b></span>
          <span>Dia <b className={tone(group.runningTotal)}>{signed(group.runningTotal)}</b></span>
        </span>
      </header>

      {txs.map(tx => {
        const kind = effectiveKind(tx)
        const label = t.kind[kind].label
        const isSelected = selectedTxIds.has(tx.id)
        const isSaved = !tx.id.startsWith('optimistic-')
        const detail = detailFor?.(tx)

        return (
          <div
            key={tx.id}
            className={`day-tx${isSelected ? ' is-selected' : ''}`}
            onTouchStart={() => startPress(tx.id)}
            onTouchMove={cancelPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            onClick={() => {
              if (longPressed.current) longPressed.current = false
              else if (selecting && onToggleSelectTx) onToggleSelectTx(tx.id)
              else if (isSaved) onEdit(tx)
            }}
          >
            {onToggleSelectTx && (
              <input
                type="checkbox"
                className={`day-tx-check${selecting ? ' is-visible' : ''}`}
                checked={isSelected}
                onClick={e => e.stopPropagation()}
                onChange={() => onToggleSelectTx(tx.id)}
                aria-label="Selecionar lançamento"
              />
            )}
            <span className={`day-tx-kind ${KIND_TONES[kind]}`} title={label}>{t.kind[kind].letter}</span>
            <span className="day-tx-main">
              <span className="day-tx-title">
                <span className="day-tx-desc">{tx.description || label}</span>
                {tx.isInvoicePayment && <span className="day-tx-tag" title="Pagamento de fatura do cartão">fatura</span>}
                {tx.isRecurring && <span className="day-tx-tag" title="Repete todo mês">mensal</span>}
                {tx.status === 'PENDING' && <span className="day-tx-tag">{t.status.pending}</span>}
              </span>
              {detail && <span className="day-tx-detail">{detail}</span>}
            </span>
            <span className={`day-tx-amt${kind === 'INCOME' ? ' pos' : ''}`}>
              {kind === 'INCOME' ? '+' : ''}{formatMoney(tx.amount)}
            </span>
            {isSaved && (
              <button
                className="day-tx-del"
                title="Excluir"
                aria-label="Excluir lançamento"
                onClick={e => {
                  e.stopPropagation()
                  if (confirm(tx.isRecurring ? t.dayGroup.confirmDeleteRecurring : t.dayGroup.confirmDelete)) onDelete(tx)
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
    </section>
  )
}
