import { useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '../api'
import { useLocale } from '../i18n'
import { groupByDay } from '../lib/groupByDay'
import DayGroupComponent from '../components/DayGroup'
import EmptyState from '../components/EmptyState'
import UndoToast from '../components/UndoToast'
import ShortcutsHint from '../components/ShortcutsHint'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import type { Transaction } from '../types'

type UiFilterType = 'ALL' | 'INCOME' | 'EXPENSE'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function TransactionsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [filterType, setFilterType] = useState<UiFilterType>('ALL')

  // Seleção múltipla para bulk actions
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set())

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const lastDay = new Date(year, month + 1, 0).getDate()
  const from = `${year}-${pad(month + 1)}-01`
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`
  const txKey = ['transactions', year, month]

  const { data: txs = [] } = useQuery({
    queryKey: txKey,
    queryFn: () => transactionsApi.list(from, to),
  })

  const prevMonthEnd = new Date(year, month, 0)
  const before = `${prevMonthEnd.getFullYear()}-${pad(prevMonthEnd.getMonth() + 1)}-${pad(prevMonthEnd.getDate())}`

  const { data: priorTxs = [] } = useQuery({
    queryKey: ['transactions-before', before],
    queryFn: () => transactionsApi.list('1970-01-01', before),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: txKey })
      const previous = qc.getQueryData<Transaction[]>(txKey)
      const deleted = previous?.find(tx => tx.id === id)
      qc.setQueryData<Transaction[]>(txKey, (old = []) => old.filter(tx => tx.id !== id))
      if (deleted) setUndoState({ id, label: deleted.description || 'Transação' })
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['transactions-before'] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.restore(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['transactions-before'] })
    },
  })

  // Bulk Actions
  async function handleBulkDelete() {
    if (selectedTxIds.size === 0) return
    if (!confirm(`Deseja excluir as ${selectedTxIds.size} transações selecionadas?`)) return
    const ids = Array.from(selectedTxIds)
    for (const id of ids) {
      await transactionsApi.remove(id).catch(() => {})
    }
    setSelectedTxIds(new Set())
    qc.invalidateQueries({ queryKey: txKey })
    qc.invalidateQueries({ queryKey: ['transactions-before'] })
  }

  const [undoState, setUndoState] = useState<{ id: string; label: string } | null>(null)

  useKeyboardShortcuts({
    onNewTransaction: () => {
      navigate('/app/new')
    },
    onToggleFilter: () => {
      setFilterType(current => {
        if (current === 'ALL') return 'INCOME'
        if (current === 'INCOME') return 'EXPENSE'
        return 'ALL'
      })
    },
  })

  function handleEdit(t: Transaction) {
    navigate(`/app/new?edit=${t.id}`)
  }

  function handleUndo() {
    if (!undoState) return
    restoreMutation.mutate(undoState.id)
    setUndoState(null)
  }

  const openingBalance = priorTxs.reduce(
    (sum, t) => t.status === 'CANCELED' ? sum : sum + (t.type === 'INCOME' ? t.amount : -t.amount),
    0
  )

  const groups = groupByDay(txs, year, month, openingBalance)
  // Só aparecem os dias com lançamento visível no filtro atual; novos lançamentos entram pelo botão flutuante.
  const visibleGroups = groups.filter(g =>
    g.transactions.some(tx =>
      filterType === 'ALL' ? true :
      filterType === 'INCOME' ? tx.type === 'INCOME' :
      tx.type !== 'INCOME'
    )
  )
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  return (
    <>
      <div className="tx-page">
        {/* Barra Superior Centralizada: Navegação de Mês */}
        <div className="tx-header-toolbar centralized">
          <div className="month-nav">
            <button className="today-chip" onClick={goToday} title="Ir para o dia de hoje">
              Hoje
            </button>
            <button className="month-arrow" onClick={prevMonth} title="Mês anterior">‹</button>
            <span className="month-label">{t.months[month]} <span className="month-year-badge">{year}</span></span>
            <button className="month-arrow" onClick={nextMonth} title="Próximo mês">›</button>
          </div>
        </div>

        {/* Barra de Ações em Lote (Bulk Actions) */}
        {selectedTxIds.size > 0 && (
          <div
            style={{
              padding: '0.6rem 1rem',
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              marginBottom: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {selectedTxIds.size} lançamento(s) selecionado(s)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-action-sm btn-action-danger"
                onClick={handleBulkDelete}
              >
                Excluir em Lote
              </button>
              <button
                type="button"
                className="btn-action-sm btn-action-ghost"
                onClick={() => setSelectedTxIds(new Set())}
              >
                Desmarcar
              </button>
            </div>
          </div>
        )}

        <div className="tx-table-header">
          <span className="th-dia">{t.table.day}</span>
          <span className="th-filter">
            <select
              className="type-filter-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value as UiFilterType)}
            >
              <option value="ALL">{t.filter.all}</option>
              <option value="INCOME">{t.filter.income}</option>
              <option value="EXPENSE">{t.filter.expense}</option>
            </select>
          </span>
          <span className="th-total">{t.table.total}</span>
        </div>

        {visibleGroups.map(g => (
          <DayGroupComponent
            key={g.dateStr}
            group={g}
            filterType={filterType}
            isToday={g.dateStr === todayStr}
            selectedTxIds={selectedTxIds}
            onToggleSelectTx={id => {
              setSelectedTxIds(prev => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
            onAdd={(date, kind) => navigate(`/app/new?date=${date}${kind ? `&kind=${kind}` : ''}`)}
            onDelete={id => deleteMutation.mutate(id)}
            onEdit={handleEdit}
          />
        ))}
        {visibleGroups.length === 0 && (
          <EmptyState
            title={t.emptyState.title}
            hint={t.emptyState.hint}
            action={{
              label: `+ ${t.modal.title}`,
              onClick: () => navigate('/app/new'),
            }}
          />
        )}

        <button
          type="button"
          className="fab-add"
          onClick={() => navigate('/app/new')}
          aria-label="Novo lançamento"
          title="Novo lançamento (Atalho: N)"
        >
          +
        </button>
      </div>

      {undoState && (
        <UndoToast
          message={`"${undoState.label}" removida`}
          onUndo={handleUndo}
          onDismiss={() => setUndoState(null)}
        />
      )}
      <ShortcutsHint />
      <Outlet />
    </>
  )
}
