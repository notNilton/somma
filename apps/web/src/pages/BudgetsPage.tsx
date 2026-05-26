import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsApi, transactionsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n'
import { formatMoney } from '../lib/format'
import BudgetModal from '../components/BudgetModal'
import type { Budget, CreateBudgetInput } from '../types'

interface BudgetCardProps {
  budget: Budget
  onEdit: (b: Budget) => void
  onDelete: (id: string) => void
}

function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(false)

  const { data: txs = [] } = useQuery({
    queryKey: ['budget-transactions', budget.id],
    queryFn: () => transactionsApi.listByBudget(budget.id),
    enabled: expanded,
  })

  const progress = Math.min(budget.progress, 100)
  const overBudget = budget.spent > budget.allocatedAmount
  const remaining = Math.abs(budget.remaining)

  return (
    <div className={`budget-row${expanded ? ' is-open' : ''}${overBudget ? ' is-over' : ''}`}>
      <button
        type="button"
        className="budget-row-main"
        onClick={() => setExpanded(value => !value)}
      >
        <div className="budget-row-mark" aria-hidden="true">
          <span>{budget.name.trim().charAt(0).toUpperCase() || '•'}</span>
        </div>

        <div className="budget-row-copy">
          <div className="budget-row-headline">
            <span className="budget-row-name">{budget.name}</span>
            <span className={`budget-row-progress-pill${overBudget ? ' over' : ''}`}>
              {Math.round(progress)}%
            </span>
          </div>
          {budget.notes && <span className="budget-row-notes">{budget.notes}</span>}
        </div>
      </button>

      <div className="budget-row-meta">
        <div className="budget-row-stats">
          <span className={`budget-row-spent${overBudget ? ' over' : ''}`}>
            {formatMoney(budget.spent)}
          </span>
          <span className="budget-row-sep">/</span>
          <span className="budget-row-allocated">{formatMoney(budget.allocatedAmount)}</span>
        </div>

        <div className="budget-progress-bar-wrap" aria-hidden="true">
          <div
            className={`budget-progress-bar-fill${overBudget ? ' over' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="budget-row-remaining-wrap">
          <span className={`budget-row-remaining${overBudget ? ' over' : ''}`}>
            {overBudget ? '-' : ''}{formatMoney(remaining)}
          </span>
          <span className="budget-row-remaining-label">{t.budgets.remaining}</span>
        </div>
      </div>

      <div className="budget-row-actions">
        <button
          type="button"
          className="budget-action-btn"
          onClick={e => { e.stopPropagation(); onEdit(budget) }}
          title={t.budgets.editBudget}
        >
          ✎
        </button>
        <button
          type="button"
          className="budget-action-btn budget-action-del"
          onClick={e => {
            e.stopPropagation()
            if (confirm(t.budgets.confirmDelete)) onDelete(budget.id)
          }}
          title={t.budgets.confirmDelete}
        >
          ×
        </button>
        <button
          type="button"
          className="budget-expand-arrow"
          onClick={e => {
            e.stopPropagation()
            setExpanded(value => !value)
          }}
          aria-label={expanded ? 'Collapse budget' : 'Expand budget'}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div className="budget-row-detail">
          {txs.length === 0 ? (
            <div className="budget-txs-empty">{t.budgets.noTransactions}</div>
          ) : (
            txs.map(tx => (
              <div key={tx.id} className="budget-tx-row">
                <span className="budget-tx-date">{tx.date.slice(5, 10).replace('-', '/')}</span>
                <span className="budget-tx-desc">{tx.description || tx.category?.name || '—'}</span>
                <span className="budget-tx-amt">{formatMoney(tx.amount)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function BudgetsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Budget | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const { data: budgets = [], error } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.list(),
  })

  useEffect(() => {
    if ((error as Error)?.message === 'UNAUTHORIZED') {
      logout()
      navigate('/login', { replace: true })
    }
  }, [error, logout, navigate])

  const createMutation = useMutation({
    mutationFn: (input: CreateBudgetInput) => budgetsApi.create(input),
    onSuccess: () => closeModal(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateBudgetInput }) =>
      budgetsApi.update(id, input),
    onSuccess: () => closeModal(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['budgets'] })
      const previous = qc.getQueryData<Budget[]>(['budgets'])
      qc.setQueryData<Budget[]>(['budgets'], old => old?.filter(b => b.id !== id) ?? [])
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(['budgets'], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })

  function openCreate() {
    setEditTarget(null)
    setModalOpen(true)
    dialogRef.current?.showModal()
  }

  function openEdit(budget: Budget) {
    setEditTarget(budget)
    setModalOpen(true)
    dialogRef.current?.showModal()
  }

  function closeModal() {
    dialogRef.current?.close()
    setModalOpen(false)
    setEditTarget(null)
  }

  function handleSubmit(input: CreateBudgetInput) {
    const target = editTarget
    closeModal()
    if (target) {
      updateMutation.mutate({ id: target.id, input })
      return
    }
    createMutation.mutate(input)
  }

  const activeMutation = editTarget ? updateMutation : createMutation
  const mutationError = activeMutation.error?.message
  const isSaving = activeMutation.isPending
  const totalAllocated = budgets.reduce((sum, budget) => sum + budget.allocatedAmount, 0)
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0)
  const totalRemaining = totalAllocated - totalSpent
  const overBudgetCount = budgets.filter(budget => budget.spent > budget.allocatedAmount).length
  const budgetSummary = t.budgets.summary
    .replace('{count}', String(budgets.length))
    .replace('{overBudgetCount}', String(overBudgetCount))

  return (
    <>
      <div className="budget-page">
        <div className="budget-page-header">
          <div className="budget-page-copy">
            <h2 className="budget-page-title">{t.budgets.title}</h2>
            <p className="budget-page-subtitle">
              {budgets.length === 0 ? t.budgets.empty : budgetSummary}
            </p>
          </div>

          <button className="btn-new-budget" onClick={openCreate}>
            + {t.budgets.newBudget}
          </button>
        </div>

        <div className="budget-summary">
          <span className="budget-summary-item budget-summary-allocated">
            {formatMoney(totalAllocated)}
          </span>
          <span className="budget-summary-sep">·</span>
          <span className="budget-summary-item budget-summary-spent">
            -{formatMoney(totalSpent)}
          </span>
          <span className="budget-summary-spacer" />
          <span className={`budget-summary-net${totalRemaining >= 0 ? ' pos' : ' neg'}`}>
            {totalRemaining >= 0 ? '' : '-'}{formatMoney(Math.abs(totalRemaining))} {t.budgets.remaining}
          </span>
        </div>

        <div className="budget-table-header">
          <span className="bh-budget">Budget</span>
          <span className="bh-progress">Uso</span>
          <span className="bh-restante">Saldo</span>
        </div>

        {budgets.length === 0 ? (
          <div className="empty-state">{t.budgets.empty}</div>
        ) : (
          <div className="budget-list">
            {budgets.map(budget => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={openEdit}
                onDelete={id => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      <dialog
        className="budget-dialog"
        ref={dialogRef}
        onClick={e => { if (e.target === dialogRef.current) closeModal() }}
      >
        {modalOpen && (
          <BudgetModal
            budget={editTarget ?? undefined}
            onClose={closeModal}
            onSubmit={handleSubmit}
            error={mutationError}
            saving={isSaving}
          />
        )}
      </dialog>
    </>
  )
}
