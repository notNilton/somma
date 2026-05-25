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

  return (
    <div className="budget-card">
      <div className="budget-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="budget-card-info">
          <span className="budget-card-name">{budget.name}</span>
          {budget.notes && <span className="budget-card-notes">{budget.notes}</span>}
        </div>
        <div className="budget-card-actions">
          <button
            className="budget-action-btn"
            onClick={e => { e.stopPropagation(); onEdit(budget) }}
            title={t.budgets.editBudget}
          >
            ✎
          </button>
          <button
            className="budget-action-btn budget-action-del"
            onClick={e => {
              e.stopPropagation()
              if (confirm(t.budgets.confirmDelete)) onDelete(budget.id)
            }}
          >
            ×
          </button>
          <span className="budget-expand-arrow">{expanded ? '▴' : '▾'}</span>
        </div>
      </div>

      <div className="budget-progress-bar-wrap">
        <div
          className={`budget-progress-bar-fill${overBudget ? ' over' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="budget-stats">
        <span className={`budget-stat-spent${overBudget ? ' over' : ''}`}>
          {formatMoney(budget.spent)}
        </span>
        <span className="budget-stat-sep">/</span>
        <span className="budget-stat-allocated">{formatMoney(budget.allocatedAmount)}</span>
        <span className="budget-stat-spacer" />
        <span className={`budget-stat-remaining${overBudget ? ' over' : ''}`}>
          {overBudget ? '-' : ''}{formatMoney(Math.abs(budget.remaining))} {t.budgets.remaining}
        </span>
      </div>

      {expanded && (
        <div className="budget-txs">
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
    onSettled: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateBudgetInput }) =>
      budgetsApi.update(id, input),
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
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, input })
    } else {
      createMutation.mutate(input)
    }
    closeModal()
  }

  const mutationError = (editTarget ? updateMutation : createMutation).error?.message

  return (
    <>
      <div className="budget-page">
        <div className="budget-page-header">
          <h2 className="budget-page-title">{t.budgets.title}</h2>
          <button className="btn-new-budget" onClick={openCreate}>
            + {t.budgets.newBudget}
          </button>
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
        ref={dialogRef}
        onClick={e => { if (e.target === dialogRef.current) closeModal() }}
      >
        {modalOpen && (
          <BudgetModal
            budget={editTarget ?? undefined}
            onClose={closeModal}
            onSubmit={handleSubmit}
            error={mutationError}
          />
        )}
      </dialog>
    </>
  )
}
