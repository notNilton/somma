import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { RefuelingList } from '../components/RefuelingList'
import { AnalyticsSummary, RefuelingLog, Vehicle } from '../types'

interface DashboardPageProps {
  vehicles: Vehicle[]
  refuelings: RefuelingLog[]
  analytics: AnalyticsSummary | undefined
  loadingVehicles: boolean
  loadingRefuelings: boolean
  onOpenVehicleModal: (vehicle?: Vehicle) => void
  onOpenRefuelingModal: (vehicleId?: string, log?: RefuelingLog) => void
  onDeleteVehicle: (id: string) => void
  onDeleteRefueling: (id: string) => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  vehicles,
  refuelings,
  loadingRefuelings,
  onOpenVehicleModal,
  onOpenRefuelingModal,
  onDeleteRefueling,
}) => {
  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRefuelings = refuelings.filter((log) => {
    if (filterVehicleId && log.vehicle_id !== filterVehicleId) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        log.vehicle_name?.toLowerCase().includes(q) ||
        log.license_plate?.toLowerCase().includes(q) ||
        log.station?.toLowerCase().includes(q) ||
        log.fuel_type?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Calculate Monthly Averages for each vehicle
  const vehiclesMonthlyMetrics = useMemo(() => {
    return vehicles.map((v) => {
      const vLogs = refuelings.filter((r) => r.vehicle_id === v.id)

      if (vLogs.length === 0) {
        return {
          vehicle: v,
          avgSpentPerMonthCents: 0,
          avgKmPerMonth: 0,
          avgKmL: 0,
          avgCostPerKm: 0,
        }
      }

      // Group totals by YYYY-MM
      const monthsMap = new Map<string, { spentCents: number; liters: number }>()
      let minKm = vLogs[0].current_km
      let maxKm = vLogs[0].current_km

      vLogs.forEach((log) => {
        const monthKey = log.date ? log.date.slice(0, 7) : new Date().toISOString().slice(0, 7)
        const current = monthsMap.get(monthKey) || { spentCents: 0, liters: 0 }

        current.spentCents += log.total_amount_cents || 0
        current.liters += log.liters || 0
        if (log.current_km < minKm) minKm = log.current_km
        if (log.current_km > maxKm) maxKm = log.current_km

        monthsMap.set(monthKey, current)
      })

      const totalMonths = Math.max(monthsMap.size, 1)
      let totalSpentCents = 0
      let totalLiters = 0
      const totalKmDriven = maxKm > minKm ? maxKm - minKm : 0

      monthsMap.forEach((m) => {
        totalSpentCents += m.spentCents
        totalLiters += m.liters
      })

      const avgSpentPerMonthCents = Math.round(totalSpentCents / totalMonths)
      const avgKmPerMonth = totalKmDriven > 0 ? totalKmDriven / totalMonths : 0
      const avgKmL = totalKmDriven > 0 && totalLiters > 0 ? totalKmDriven / totalLiters : v.avg_km_l || 0
      const avgCostPerKm = totalKmDriven > 0 && totalSpentCents > 0 ? (totalSpentCents / 100) / totalKmDriven : v.avg_cost_per_km || 0

      return {
        vehicle: v,
        avgSpentPerMonthCents,
        avgKmPerMonth,
        avgKmL,
        avgCostPerKm,
      }
    })
  }, [vehicles, refuelings])

  return (
    <div className="animate-fade-in">
      {/* Minimalist Hero Card com Médias Mensuais por Veículo */}
      <div className="veh-hero-card">
        <div className="veh-hero-top-bar">
          <div className="veh-hero-title-group">
            <span className="veh-hero-title">Médias Mensuais</span>
            <button
              type="button"
              onClick={() => onOpenVehicleModal()}
              className="text-[11px] font-bold text-[#0284c7] hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
              title="Cadastrar novo veículo"
            >
              <span>+ Veículo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenRefuelingModal()}
            className="veh-hero-quick-btn"
            title="Lançar novo abastecimento"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Abastecimento</span>
          </button>
        </div>

        {vehiclesMonthlyMetrics.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] py-2">
            Nenhum veículo cadastrado para cálculo de médias.
          </div>
        ) : (
          <div className="veh-hero-vehicles-list">
            {vehiclesMonthlyMetrics.map((item) => (
              <div key={item.vehicle.id} className="veh-hero-vehicle-row">
                <div className="veh-hero-veh-info">
                  <span className="veh-hero-veh-name">{item.vehicle.name}</span>
                  {item.vehicle.license_plate && (
                    <span className="veh-hero-veh-plate">{item.vehicle.license_plate}</span>
                  )}
                </div>

                <div className="veh-hero-metrics-grid">
                  <div className="veh-hero-metric">
                    <span className="veh-hero-label">Gasto Médio / Mês</span>
                    <span className="veh-hero-val">
                      {item.avgSpentPerMonthCents > 0
                        ? (item.avgSpentPerMonthCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : 'R$ 0,00'}
                    </span>
                  </div>

                  <div className="veh-hero-metric">
                    <span className="veh-hero-label">Dirigido / Mês</span>
                    <span className="veh-hero-val">
                      {item.avgKmPerMonth > 0
                        ? `${Math.round(item.avgKmPerMonth).toLocaleString('pt-BR')} km/mês`
                        : '—'}
                    </span>
                  </div>

                  <div className="veh-hero-metric">
                    <span className="veh-hero-label">Consumo</span>
                    <span className="veh-hero-val">
                      {item.avgKmL > 0 ? `${item.avgKmL.toFixed(1)} km/L` : '—'}
                    </span>
                  </div>

                  <div className="veh-hero-metric">
                    <span className="veh-hero-label">Custo / km</span>
                    <span className="veh-hero-val">
                      {item.avgCostPerKm > 0 ? `R$ ${item.avgCostPerKm.toFixed(2)}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header Controls */}
      <div className="flex items-center justify-between gap-3 mt-6 mb-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
          Abastecimentos Recentes
        </h2>

        {vehicles.length > 1 && (
          <select
            value={filterVehicleId}
            onChange={(e) => setFilterVehicleId(e.target.value)}
            className="veh-select !h-8 !py-0 !text-xs w-44"
          >
            <option value="">Todos os veículos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Full Chronological Refueling List */}
      <RefuelingList
        refuelings={filteredRefuelings}
        vehicles={vehicles}
        onEdit={(log) => onOpenRefuelingModal(log.vehicle_id, log)}
        onDelete={onDeleteRefueling}
        loading={loadingRefuelings}
      />
    </div>
  )
}
