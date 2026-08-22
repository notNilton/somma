import React from 'react'
import { Fuel, Edit2, Trash2 } from 'lucide-react'
import { RefuelingLog, Vehicle } from '../types'
import { formatMoney } from '../api/client'

interface RefuelingListProps {
  refuelings: RefuelingLog[]
  vehicles: Vehicle[]
  onEdit: (log: RefuelingLog) => void
  onDelete: (id: string) => void
  loading?: boolean
}

export const RefuelingList: React.FC<RefuelingListProps> = ({
  refuelings,
  onEdit,
  onDelete,
  loading,
}) => {
  if (loading) {
    return (
      <div className="refuel-list">
        {[1, 2, 3].map((i) => (
          <div key={i} className="refuel-row animate-pulse" style={{ height: 64 }} />
        ))}
      </div>
    )
  }

  if (refuelings.length === 0) {
    return (
      <div className="veh-empty">
        <Fuel className="w-10 h-10 veh-empty-icon" />
        <div className="veh-empty-title">Nenhum abastecimento encontrado</div>
        <p className="text-xs text-[var(--text-muted)]">
          Lance seu primeiro abastecimento para calcular as médias de consumo.
        </p>
      </div>
    )
  }

  return (
    <div className="refuel-list">
      {refuelings.map((log) => {
        const d = new Date(log.date)
        const day = d.toLocaleDateString('pt-BR', { day: '2-digit' })
        const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
        const pricePerLiter = log.price_per_liter_cents
          ? `R$ ${(log.price_per_liter_cents / 100).toFixed(2)}/L`
          : ''

        return (
          <div key={log.id} className="refuel-row">
            <div className="refuel-date-badge">
              <span className="refuel-date-day">{day}</span>
              <span className="refuel-date-month">{month}</span>
            </div>

            <div className="refuel-details">
              <div className="refuel-title-line">
                <span className="refuel-veh-name">{log.vehicle_name || 'Veículo'}</span>
                {log.license_plate && (
                  <span className="refuel-tag">{log.license_plate}</span>
                )}
                {log.calculated_km_l && log.calculated_km_l > 0 ? (
                  <span className="refuel-tag-km-l">{log.calculated_km_l.toFixed(1)} km/L</span>
                ) : null}
              </div>

              <div className="refuel-meta-line">
                <span>{log.station || log.fuel_type}</span>
                <span className="refuel-bullet">•</span>
                <span>{log.liters.toFixed(1)}L</span>
                {pricePerLiter && (
                  <>
                    <span className="refuel-bullet">•</span>
                    <span>{pricePerLiter}</span>
                  </>
                )}
              </div>
            </div>

            <div className="refuel-right">
              <div className="refuel-amount">{formatMoney(log.total_amount_cents)}</div>
              <div className="refuel-odometer">
                {log.current_km ? `${log.current_km.toLocaleString('pt-BR')} km` : '—'}
              </div>
            </div>

            <div className="refuel-actions">
              <button
                type="button"
                onClick={() => onEdit(log)}
                className="refuel-btn-action"
                title="Editar abastecimento"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(log.id)}
                className="refuel-btn-action danger"
                title="Excluir abastecimento"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
