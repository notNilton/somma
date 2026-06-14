import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsApi, categoriesApi, transactionsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import { groupByDay } from '../lib/groupByDay'
import DayGroupComponent from '../components/DayGroup'
import TransactionModal from '../components/TransactionModal'
import EmptyState from '../components/EmptyState'
import UndoToast from '../components/UndoToast'
import ShortcutsHint from '../components/ShortcutsHint'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import type { Category, CreateInput, Transaction, TxKind, UpdateInput } from '../types'

interface ModalState {
  open: boolean
  date: string
  kind: TxKind
  transaction?: Transaction
}
type UiFilterType = 'ALL' | 'INCOME' | 'EXPENSE'

function pad(n: number) { return String(n).padStart(2, '0') }

function flattenCategories(cats: Category[]): Category[] {
  return cats.flatMap(c => [c, ...(c.children ? flattenCategories(c.children) : [])])
}

export default function TransactionsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [filterType, setFilterType] = useState<UiFilterType>('ALL')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

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

  const { data: txs = [], error: txError } = useQuery({
    queryKey: txKey,
    queryFn: () => transactionsApi.list(from, to),
  })
  const { data: budgets = [], error: budgetsError } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.list(),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if ((txError as Error)?.message === 'UNAUTHORIZED' || (budgetsError as Error)?.message === 'UNAUTHORIZED') {
      logout()
      navigate('/login', { replace: true })
    }
  }, [budgetsError, txError, logout, navigate])

  const createMutation = useMutation({
    mutationFn: (input: CreateInput) => transactionsApi.create(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: txKey })
      const previous = qc.getQueryData<Transaction[]>(txKey)
      qc.setQueryData<Transaction[]>(txKey, (old = []) => [
        ...old,
        {
          id: 'optimistic-' + Date.now(),
          type: input.type,
          kind: input.kind ?? (input.type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
          status: input.status ?? 'COMPLETED',
          amount: input.amount,
          description: input.description,
          date: input.date + 'T00:00:00Z',
          budgetId: input.budgetId,
          categoryId: input.categoryId,
        },
      ])
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInput }) =>
      transactionsApi.update(id, input),
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
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
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.restore(id),
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
  })

  const [undoState, setUndoState] = useState<{ id: string; label: string } | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, date: '', kind: 'EXPENSE' })
  const dialogRef = useRef<HTMLDialogElement>(null)

  useKeyboardShortcuts({
    onNewTransaction: () => {
      const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      openModal(todayDate, 'EXPENSE')
    },
  })

  function openModal(date: string, kind: TxKind, transaction?: Transaction) {
    setModal({ open: true, date, kind, transaction })
    dialogRef.current?.showModal()
  }

  function closeModal() {
    dialogRef.current?.close()
    setModal(m => ({ ...m, open: false }))
  }

  function handleCreate(input: CreateInput) {
    closeModal()
    createMutation.mutate(input)
  }

  function handleEdit(tx: Transaction) {
    const dateStr = tx.date.slice(0, 10)
    openModal(dateStr, tx.kind, tx)
  }

  function handleUndo() {
    if (!undoState) return
    restoreMutation.mutate(undoState.id)
    setUndoState(null)
  }

  function handleUpdate(input: CreateInput) {
    if (!modal.transaction) return
    closeModal()
    updateMutation.mutate({
      id: modal.transaction.id,
      input: {
        amount: input.amount,
        description: input.description,
        categoryId: input.categoryId,
        budgetId: input.budgetId,
      },
    })
  }

  const filtered = txs.filter(tx => {
    if (search && !tx.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && tx.categoryId !== filterCategory) return false
    return true
  })
  const groups = groupByDay(filtered, year, month)
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  return (
    <>
      <div className="tx-page">
        <div className="month-nav">
          <button className="today-chip" onClick={goToday} title="hoje">
            {now.getDate()}
          </button>
          <button className="month-arrow" onClick={prevMonth}>‹</button>
          <span className="month-label">{t.months[month]}/{String(year).slice(2)}</span>
          <button className="month-arrow" onClick={nextMonth}>›</button>
        </div>

        <div className="tx-search-row">
          <input
            className="tx-search-input"
            type="search"
            placeholder={t.search.placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="tx-category-filter"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Categoria</option>
            {flattenCategories(categories).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

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

        {groups.map(g => (
          <DayGroupComponent
            key={g.dateStr}
            group={g}
            filterType={filterType}
            isToday={g.dateStr === todayStr}
            onAdd={openModal}
            onDelete={id => deleteMutation.mutate(id)}
            onEdit={handleEdit}
          />
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon="💸"
            title="Nenhuma transação"
            hint="Adicione sua primeira transação clicando em qualquer dia"
          />
        )}
      </div>

      <dialog
        className="budget-dialog"
        ref={dialogRef}
        onClick={e => { if (e.target === dialogRef.current) closeModal() }}
      >
        {modal.open && (
          <TransactionModal
            date={modal.date}
            kind={modal.kind}
            budgets={budgets}
            categories={categories}
            transaction={modal.transaction}
            onClose={closeModal}
            onSubmit={modal.transaction ? handleUpdate : handleCreate}
            error={createMutation.error?.message ?? updateMutation.error?.message}
          />
        )}
      </dialog>
      {undoState && (
        <UndoToast
          message={`"${undoState.label}" removida`}
          onUndo={handleUndo}
          onDismiss={() => setUndoState(null)}
        />
      )}
      <ShortcutsHint />
    </>
  )
}
