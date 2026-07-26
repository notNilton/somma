import { useState } from 'react'
import { formatMoney } from '../api/client'
import type { DayGroup } from '../lib/groupByDay'
import type { RefuelingLog } from '../types'

interface Props {
  group: DayGroup
  isToday: boolean
  onAdd: (date: string) => void
  onEdit: (log: RefuelingLog) => void
  onDelete: (id: string) => void
}

export default function DayGroupComponent({ group, isToday, onAdd, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasItems = group.refuelings.length > 0

  return (
    <div className={`veh-day-row${isToday ? ' is-today' : ''}`}>
      <div className={`veh-day-num${isToday ? ' today' : ''}`}>{group.dayNum}</div>

      <div className="tx-type-list">
        <div
          className={`veh-type-row${hasItems ? ' has-tx' : ' empty'}`}
          onClick={() => (hasItems ? setExpanded((p) => !p) : onAdd(group.dateStr))}
          title={hasItems ? 'Ver abastecimentos' : '+ Abastecimento'}
        >
          <span className={`veh-type-icon refuel${hasItems ? '' : ' dim'}`}>A</span>
          <span className="veh-type-label">Abastecimento</span>
          <span className={`veh-type-amt ${hasItems ? 'refuel' : 'zero'}`}>
            {hasItems ? formatMoney(group.totalCents) : 'R$ 0,00'}
          </span>
          {hasItems && <span className="veh-expand-arrow">{expanded ? '▴' : '▾'}</span>}
        </div>

        {expanded && (
          <div className="veh-type-detail">
            {group.refuelings.map((log) => (
              <div key={log.id} className="veh-detail-row">
                <span className="veh-detail-desc">
                  {log.vehicle_name || 'Veículo'} — {log.station || log.fuel_type}
                </span>
                <span className="veh-detail-amt">{formatMoney(log.total_amount_cents)}</span>
                <button
                  className="veh-detail-del"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(log)
                  }}
                  title="Editar"
                >
                  ✎
                </button>
                <button
                  className="veh-detail-del"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Excluir este abastecimento?')) onDelete(log.id)
                  }}
                  title="Excluir"
                >
                  ×
                </button>
              </div>
            ))}
            <button className="veh-add-inline" onClick={() => onAdd(group.dateStr)}>
              + abastecimento
            </button>
          </div>
        )}
      </div>

      <div className="veh-total">
        <div className="veh-total-head">
          <span className="veh-total-title">Total</span>
          <span className="veh-total-balance">
            {formatMoney(group.runningTotal)}
          </span>
        </div>
        <div className="veh-total-breakdown">
          <div className="veh-total-row">
            <span className="veh-total-label">Litros</span>
            <span className="veh-total-value">{group.totalLiters.toFixed(1)} L</span>
          </div>
        </div>
      </div>
    </div>
  )
}
