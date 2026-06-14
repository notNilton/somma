import { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { formatMoney } from '../lib/format'

export default function AlertsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    refetchInterval: 60_000,
  })

  const unread = alerts.filter(a => !a.isRead).length

  const markRead = useMutation({
    mutationFn: alertsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const clearRead = useMutation({
    mutationFn: alertsApi.clearRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    setOpen(o => !o)
    alerts.filter(a => !a.isRead).forEach(a => markRead.mutate(a.id))
  }

  return (
    <div className="alerts-wrap" ref={ref}>
      <button
        className={`alerts-bell${unread > 0 ? ' has-unread' : ''}`}
        onClick={handleOpen}
        title="Alertas de orçamento"
        aria-label={`${unread} alertas`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && <span className="alerts-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="alerts-panel">
          <div className="alerts-panel-header">
            <span className="alerts-panel-title">Alertas</span>
            {alerts.some(a => a.isRead) && (
              <button className="alerts-clear-btn" onClick={() => clearRead.mutate()}>
                Limpar lidos
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="alerts-empty">Nenhum alerta</div>
          ) : (
            <ul className="alerts-list">
              {alerts.map(a => (
                <li key={a.id} className={`alerts-item${a.isRead ? ' is-read' : ''}`}>
                  <div className="alerts-item-name">{a.budgetName}</div>
                  <div className="alerts-item-detail">
                    {a.percentUsed >= 100
                      ? `Limite estourado — gasto ${formatMoney(a.spent)} de ${formatMoney(a.allocated)}`
                      : `${Math.round(a.percentUsed)}% usado — gasto ${formatMoney(a.spent)} de ${formatMoney(a.allocated)}`}
                  </div>
                  <div className="alerts-item-pct" style={{ width: `${Math.min(a.percentUsed, 100)}%`, background: a.percentUsed >= 100 ? '#ef4444' : '#f59e0b' }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
