import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsApi, transactionsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { groupByDay, computeSummary } from '../lib/groupByDay'
import { formatMoney } from '../lib/format'
import DayGroupComponent from '../components/DayGroup'
import TransactionModal from '../components/TransactionModal'
import type { Transaction, CreateInput, TxKind } from '../types'

const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface ModalState { open: boolean; date: string; kind: TxKind }
type UiFilterType = 'ALL' | 'INCOME' | 'EXPENSE'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function TransactionsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [filterType, setFilterType] = useState<UiFilterType>('ALL')

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
        },
      ])
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: txKey })
      const previous = qc.getQueryData<Transaction[]>(txKey)
      qc.setQueryData<Transaction[]>(txKey, (old = []) => old.filter(t => t.id !== id))
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(txKey, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: txKey }),
  })

  const [modal, setModal] = useState<ModalState>({ open: false, date: '', kind: 'EXPENSE' })
  const dialogRef = useRef<HTMLDialogElement>(null)

  function openModal(date: string, kind: TxKind) {
    setModal({ open: true, date, kind })
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

  const groups = groupByDay(txs, year, month)
  const summary = computeSummary(txs)
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  return (
    <>
      <div className="tx-page">
        <div className="month-nav">
          <button className="today-chip" onClick={goToday} title="Ir para hoje">
            {now.getDate()}
          </button>
          <button className="month-arrow" onClick={prevMonth}>‹</button>
          <span className="month-label">{PT_MONTHS[month]}/{String(year).slice(2)}</span>
          <button className="month-arrow" onClick={nextMonth}>›</button>
        </div>

        <div className="month-summary">
          <span className="ms-item income">+{formatMoney(summary.totalIncome)}</span>
          <span className="ms-sep">·</span>
          <span className="ms-item expense">-{formatMoney(summary.totalExpense)}</span>
          <span className="ms-spacer" />
          <span className={`ms-net ${summary.netBalance >= 0 ? 'pos' : 'neg'}`}>
            {summary.netBalance > 0 ? '+' : ''}{formatMoney(summary.netBalance)}
          </span>
        </div>

        <div className="tx-table-header">
          <span className="th-dia">Dia</span>
          <span className="th-filter">
            <select
              className="type-filter-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value as UiFilterType)}
            >
              <option value="ALL">⊙ Todas</option>
              <option value="INCOME">Renda</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </span>
          <span className="th-saldo">Saldo</span>
        </div>

        {groups.map(g => (
          <DayGroupComponent
            key={g.dateStr}
            group={g}
            filterType={filterType}
            isToday={g.dateStr === todayStr}
            onAdd={openModal}
            onDelete={id => deleteMutation.mutate(id)}
          />
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClick={e => { if (e.target === dialogRef.current) closeModal() }}
      >
        {modal.open && (
          <TransactionModal
            date={modal.date}
            kind={modal.kind}
            budgets={budgets}
            onClose={closeModal}
            onSubmit={handleCreate}
            error={createMutation.error?.message}
          />
        )}
      </dialog>
    </>
  )
}
