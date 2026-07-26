import React, { useState, useMemo } from 'react'
import { RefuelingList } from '../components/RefuelingList'
import { RefuelingLog, Vehicle } from '../types'
import { Plus } from 'lucide-react'

interface RefuelingsPageProps {
  refuelings: RefuelingLog[]
  vehicles: Vehicle[]
  loading: boolean
  onOpenRefuelingModal: (vehicleId?: string, log?: RefuelingLog) => void
  onDeleteRefueling: (id: string) => void
}

export const RefuelingsPage: React.FC<RefuelingsPageProps> = ({
  refuelings,
  vehicles,
  loading,
  onOpenRefuelingModal,
  onDeleteRefueling,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return refuelings.filter((log) => {
      if (selectedVehicleId && log.vehicle_id !== selectedVehicleId) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          log.vehicle_name?.toLowerCase().includes(q) ||
          log.station?.toLowerCase().includes(q) ||
          log.fuel_type?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [refuelings, selectedVehicleId, search])

  return (
    <div className="animate-fade-in">
      <div className="veh-section-header">
        <div>
          <h2 className="veh-section-title">Abastecimentos</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => onOpenRefuelingModal()} className="btn-primary text-xs">
          <Plus className="w-4 h-4" />
          <span>Novo</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar posto, veículo..."
          className="veh-input text-sm flex-1"
        />
        <select
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          className="veh-select text-sm sm:w-48"
        >
          <option value="">Todos os veículos</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <RefuelingList
        refuelings={filtered}
        vehicles={vehicles}
        onEdit={(log) => onOpenRefuelingModal(log.vehicle_id, log)}
        onDelete={onDeleteRefueling}
        loading={loading}
      />
    </div>
  )
}
