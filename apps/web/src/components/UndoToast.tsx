import { useEffect } from 'react'

interface Props {
  message: string
  onUndo: () => void
  onDismiss: () => void
  durationMs?: number
}

export default function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(t)
  }, [onDismiss, durationMs])

  return (
    <div className="undo-toast">
      <span className="undo-toast-msg">{message}</span>
      <button className="undo-toast-btn" onClick={onUndo}>Desfazer</button>
    </div>
  )
}
