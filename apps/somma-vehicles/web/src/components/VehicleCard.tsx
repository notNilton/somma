import React from 'react'
import { Car, Fuel, Gauge, Edit2, Trash2, Droplet } from 'lucide-react'
import { Vehicle } from '../types'
import { formatMoney, formatKm } from '../api/client'

interface VehicleCardProps {
  vehicle: Vehicle
  onEdit: (vehicle: Vehicle) => void
  onDelete: (id: string) => void
  onSelectRefuel: (vehicle: Vehicle) => void
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onEdit,
  onDelete,
  onSelectRefuel,
}) => {
  return (
    <div className="veh-card">
      <div className="veh-card-header">
        <div>
          <h3 className="veh-card-title">{vehicle.name}</h3>
          <p className="veh-card-subtitle">
            {vehicle.brand} {vehicle.model} {vehicle.year > 0 ? `(${vehicle.year})` : ''}
            {vehicle.license_plate && ` · ${vehicle.license_plate}`}
          </p>
        </div>
        <div className="veh-card-actions">
          <button
            onClick={() => onEdit(vehicle)}
            className="veh-card-action"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(vehicle.id)}
            className="veh-card-action danger"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="veh-card-grid">
        <div className="veh-card-metric">
          <div className="veh-card-metric-label">Total Gasto</div>
          <div className="veh-card-metric-value">{formatMoney(vehicle.total_spent_cents || 0)}</div>
        </div>
        <div className="veh-card-metric">
          <div className="veh-card-metric-label">Consumo Médio</div>
          <div className="veh-card-metric-value">
            {vehicle.avg_km_l && vehicle.avg_km_l > 0 ? `${vehicle.avg_km_l.toFixed(1)} km/L` : '—'}
          </div>
        </div>
        <div className="veh-card-metric">
          <div className="veh-card-metric-label">Odômetro</div>
          <div className="veh-card-metric-value">{formatKm(vehicle.odometer_km)}</div>
        </div>
        <div className="veh-card-metric">
          <div className="veh-card-metric-label">Combustível</div>
          <div className="veh-card-metric-value">{vehicle.fuel_type}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <button
          onClick={() => onSelectRefuel(vehicle)}
          className="btn-primary text-xs w-full justify-center"
        >
          <Droplet className="w-3.5 h-3.5" />
          <span>Abastecer</span>
        </button>
      </div>
    </div>
  )
}
