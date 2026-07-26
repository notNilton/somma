import React from 'react'
import { VehicleCard } from '../components/VehicleCard'
import { Vehicle } from '../types'
import { Plus } from 'lucide-react'

interface VehiclesPageProps {
  vehicles: Vehicle[]
  loading: boolean
  onOpenVehicleModal: (vehicle?: Vehicle) => void
  onOpenRefuelingModal: (vehicleId: string) => void
  onDeleteVehicle: (id: string) => void
}

export const VehiclesPage: React.FC<VehiclesPageProps> = ({
  vehicles,
  loading,
  onOpenVehicleModal,
  onOpenRefuelingModal,
  onDeleteVehicle,
}) => {
  return (
    <div className="animate-fade-in">
      <div className="veh-section-header">
        <div>
          <h2 className="veh-section-title">Veículos</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {vehicles.length} cadastrado{vehicles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => onOpenVehicleModal()} className="btn-primary text-xs">
          <Plus className="w-4 h-4" />
          <span>Adicionar</span>
        </button>
      </div>

      {vehicles.length === 0 && !loading ? (
        <div className="veh-card text-center py-12">
          <div className="veh-empty-icon">🚗</div>
          <div className="veh-empty-title">Nenhum veículo cadastrado</div>
          <p className="text-[var(--text-muted)] max-w-sm mx-auto mt-1 mb-4">
            Cadastre seu carro para começar a registrar abastecimentos.
          </p>
          <button onClick={() => onOpenVehicleModal()} className="btn-primary text-xs">
            <Plus className="w-4 h-4" />
            <span>Cadastrar Veículo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onEdit={() => onOpenVehicleModal(v)}
              onDelete={onDeleteVehicle}
              onSelectRefuel={(veh) => onOpenRefuelingModal(veh.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
