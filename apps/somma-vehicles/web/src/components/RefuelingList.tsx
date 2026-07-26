import React from 'react'
import { Droplet, Edit2, Trash2 } from 'lucide-react'
import { RefuelingLog, Vehicle } from '../types'
import { formatMoney, formatKm } from '../api/client'

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
      <div className="veh-card animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-[var(--border)] rounded-xl" />
        ))}
      </div>
    )
  }

  if (refuelings.length === 0) {
    return (
      <div className="veh-card text-center py-10">
        <Droplet className="w-10 h-10 text-[var(--text-faint)] mx-auto mb-3" />
        <div className="veh-empty-title">Nenhum abastecimento encontrado</div>
        <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto mt-1">
          Lance seu primeiro abastecimento para registrar o consumo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {refuelings.map((log) => {
        const dateFormatted = new Date(log.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
        const pricePerLiter = log.price_per_liter_cents
          ? (log.price_per_liter_cents / 100).toFixed(3)
          : '—'

        return (
          <div
            key={log.id}
            className="veh-card flex items-center gap-3 py-3 px-4"
          >
            <div className="w-10 h-10 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center text-[#0ea5e9] shrink-0">
              <Droplet className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-strong)] text-sm truncate">
                  {log.vehicle_name || 'Veículo'}
                </span>
                {log.license_plate && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">
                    {log.license_plate}
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {dateFormatted} · {log.station || log.fuel_type} · {log.liters.toFixed(1)} L · R$ {pricePerLiter}/L
                {log.calculated_km_l && log.calculated_km_l > 0 && (
                  <span className="ml-2 text-[#059669]">{log.calculated_km_l.toFixed(1)} km/L</span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-bold text-[var(--text-strong)] text-sm">
                {formatMoney(log.total_amount_cents)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {formatKm(log.current_km)}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(log)}
                className="veh-card-action"
                title="Editar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(log.id)}
                className="veh-card-action danger"
                title="Excluir"
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
