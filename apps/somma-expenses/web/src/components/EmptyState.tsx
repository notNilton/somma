interface Props {
  icon: string
  title: string
  hint?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, hint, action }: Props) {
  return (
    <div className="empty-state-card">
      <span className="empty-state-icon">{icon}</span>
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action && (
        <button className="empty-state-btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
