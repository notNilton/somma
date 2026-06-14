import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsApi, type Goal, type GoalInput } from '../api/goals'
import { useLocale } from '../i18n'
import EmptyState from '../components/EmptyState'
import { formatMoney } from '../lib/format'

const GOAL_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

interface GoalFormProps {
  initial?: Goal
  onSubmit: (v: GoalInput) => void
  onCancel: () => void
  isPending: boolean
  t: ReturnType<typeof useLocale>['t']
}

function GoalForm({ initial, onSubmit, onCancel, isPending, t }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.targetAmount) : '')
  const [color, setColor] = useState(initial?.color ?? '#3b82f6')
  const [date, setDate] = useState(initial?.targetDate ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')

  function handle(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      name,
      description: desc || undefined,
      targetAmount: parseFloat(target),
      color,
      targetDate: date || undefined,
    })
  }

  return (
    <form className="goal-form" onSubmit={handle}>
      <label className="budget-field">
        <span className="budget-field-label">{t.goals.name}</span>
        <input
          className="budget-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t.goals.namePlaceholder}
          required
          autoFocus
          maxLength={120}
        />
      </label>
      <label className="budget-field">
        <span className="budget-field-label">{t.goals.target}</span>
        <input
          className="budget-amount-input"
          type="number"
          step="0.01"
          min="0.01"
          value={target}
          onChange={e => setTarget(e.target.value)}
          required
        />
      </label>
      <label className="budget-field">
        <span className="budget-field-label">{t.goals.deadline}</span>
        <input
          className="budget-input"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </label>
      <label className="budget-field">
        <span className="budget-field-label">{t.goals.description}</span>
        <input
          className="budget-input"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder={t.goals.descPlaceholder}
          maxLength={255}
        />
      </label>
      <div className="goal-color-row">
        <span className="budget-field-label">{t.goals.color}</span>
        <div className="goal-color-swatches">
          {GOAL_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`goal-color-swatch${color === c ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="budget-modal-actions">
        <button type="button" className="budget-modal-btn budget-modal-btn-secondary" onClick={onCancel}>
          {t.modal.cancel}
        </button>
        <button type="submit" className="budget-modal-btn budget-modal-btn-primary" disabled={isPending}>
          {isPending ? '...' : (initial ? t.goals.save : t.goals.create)}
        </button>
      </div>
    </form>
  )
}

interface GoalCardProps {
  goal: Goal
  onEdit: (g: Goal) => void
  onDelete: (id: string) => void
  t: ReturnType<typeof useLocale>['t']
}

function GoalCard({ goal, onEdit, onDelete, t }: GoalCardProps) {
  const pct = Math.min(goal.progress, 100)
  const achieved = goal.savedAmount >= goal.targetAmount

  return (
    <div className={`goal-row${achieved ? ' goal-achieved' : ''}`}>
      <div className="goal-row-main">
        <div className="goal-row-mark" style={{ background: goal.color + '22', color: goal.color }}>
          {achieved ? '✓' : goal.name.charAt(0).toUpperCase()}
        </div>

        <div className="budget-row-copy">
          <div className="budget-row-headline">
            <span className="budget-row-name">{goal.name}</span>
            <span className={`budget-row-progress-pill${achieved ? ' achieved' : ''}`}>
              {Math.round(pct)}%
            </span>
          </div>
          {goal.targetDate && (
            <span className="budget-row-notes">
              {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          {goal.description && <span className="budget-row-notes">{goal.description}</span>}
        </div>
      </div>

      <div className="budget-row-meta">
        <div className="budget-row-stats">
          <span className="goal-row-saved">{formatMoney(goal.savedAmount)}</span>
          <span className="budget-row-sep">/</span>
          <span className="budget-row-allocated">{formatMoney(goal.targetAmount)}</span>
        </div>

        <div className="budget-progress-bar-wrap" aria-hidden="true">
          <div
            className={`goal-progress-fill${achieved ? ' achieved' : ''}`}
            style={{ width: `${pct}%`, ...(achieved ? {} : { background: goal.color }) }}
          />
        </div>

        <div className="budget-row-remaining-wrap">
          <span className={`budget-row-remaining${achieved ? ' achieved' : ''}`}>
            {achieved ? t.goals.achieved : formatMoney(goal.remaining)}
          </span>
          <span className="budget-row-remaining-label">
            {achieved ? '' : t.goals.remaining}
          </span>
        </div>
      </div>

      <div className="budget-row-actions">
        <button
          type="button"
          className="budget-action-btn"
          onClick={() => onEdit(goal)}
          title={t.goals.save}
        >
          ✎
        </button>
        <button
          type="button"
          className="budget-action-btn budget-action-del"
          onClick={() => onDelete(goal.id)}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (v: GoalInput) => goalsApi.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setShowForm(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: string; v: GoalInput }) => goalsApi.update(id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setDeleteConfirm(null) },
  })

  const active = goals.filter(g => !g.isAchieved)
  const achieved = goals.filter(g => g.isAchieved)

  return (
    <div className="goals-page">
      <div className="goals-header">
        <h2 className="goals-title">{t.goals.title}</h2>
        {!showForm && !editing && (
          <button className="btn-action-sm" onClick={() => setShowForm(true)}>
            + {t.goals.newGoal}
          </button>
        )}
      </div>

      {showForm && (
        <div className="goal-form-wrap">
          <GoalForm
            onSubmit={v => createMutation.mutate(v)}
            onCancel={() => setShowForm(false)}
            isPending={createMutation.isPending}
            t={t}
          />
        </div>
      )}

      {editing && (
        <div className="goal-form-wrap">
          <GoalForm
            initial={editing}
            onSubmit={v => updateMutation.mutate({ id: editing.id, v })}
            onCancel={() => setEditing(null)}
            isPending={updateMutation.isPending}
            t={t}
          />
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <EmptyState
          icon="🎯"
          title={t.goals.empty}
          hint="Defina uma meta de economia e acompanhe seu progresso"
          action={{ label: t.goals.newGoal, onClick: () => setShowForm(true) }}
        />
      )}

      {deleteConfirm && (
        <div className="goal-delete-confirm">
          <span>{t.goals.confirmDelete}</span>
          <button className="btn-action-sm btn-action-danger" onClick={() => deleteMutation.mutate(deleteConfirm)}>
            {t.goals.confirmYes}
          </button>
          <button className="btn-action-sm btn-action-ghost" onClick={() => setDeleteConfirm(null)}>
            {t.modal.cancel}
          </button>
        </div>
      )}

      {active.length > 0 && (
        <div className="goals-grid">
          {active.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              t={t}
              onEdit={g => setEditing(g)}
              onDelete={id => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      {achieved.length > 0 && (
        <>
          <h3 className="goals-section-label">{t.goals.achieved}</h3>
          <div className="goals-grid">
            {achieved.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                t={t}
                onEdit={g => setEditing(g)}
                onDelete={id => setDeleteConfirm(id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
