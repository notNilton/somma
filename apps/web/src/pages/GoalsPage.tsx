import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsApi, type Goal, type GoalInput } from '../api/goals'
import { useLocale } from '../i18n'
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
    <div className={`goal-card${achieved ? ' goal-achieved' : ''}`}>
      <div className="goal-card-top">
        <div className="goal-icon" style={{ background: goal.color + '22', color: goal.color }}>
          {achieved ? '✓' : goal.name.charAt(0).toUpperCase()}
        </div>
        <div className="goal-card-info">
          <span className="goal-card-name">{goal.name}</span>
          {goal.targetDate && (
            <span className="goal-card-date">
              {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          {goal.description && <span className="goal-card-desc">{goal.description}</span>}
        </div>
        <div className="goal-card-actions">
          <button className="btn-action-sm btn-action-ghost" onClick={() => onEdit(goal)}>✎</button>
          <button className="btn-action-sm btn-action-danger" onClick={() => onDelete(goal.id)}>×</button>
        </div>
      </div>

      <div className="goal-progress-bar-wrap">
        <div
          className={`goal-progress-bar-fill${achieved ? ' achieved' : ''}`}
          style={{ width: `${pct}%`, background: goal.color }}
        />
      </div>

      <div className="goal-card-footer">
        <span className="goal-saved">{formatMoney(goal.savedAmount)}</span>
        <span className="goal-pct">{Math.round(pct)}%</span>
        <span className="goal-target">{formatMoney(goal.targetAmount)}</span>
      </div>

      {!achieved && goal.remaining > 0 && (
        <span className="goal-remaining">
          {formatMoney(goal.remaining)} {t.goals.remaining}
        </span>
      )}
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
        <p className="goals-empty">{t.goals.empty}</p>
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
