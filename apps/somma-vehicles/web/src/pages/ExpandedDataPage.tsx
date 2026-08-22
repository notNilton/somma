import React, { useState } from 'react'
import { Activity } from 'lucide-react'
import { AnalyticsSummary, RefuelingLog, Vehicle } from '../types'
import { useVehicleAnalytics } from '../hooks/useVehicleAnalytics'
import { BiKpiTicker } from '../components/bi/BiKpiTicker'
import { BiConsumptionChart } from '../components/bi/BiConsumptionChart'
import { BiFuelMatrixChart } from '../components/bi/BiFuelMatrixChart'
import { BiMonthlyCharts } from '../components/bi/BiMonthlyCharts'
import { BiStationAudit } from '../components/bi/BiStationAudit'
import { BiRecentImpactStrip } from '../components/bi/BiRecentImpactStrip'

interface ExpandedDataPageProps {
  vehicles: Vehicle[]
  refuelings: RefuelingLog[]
  analytics: AnalyticsSummary | undefined
  loading: boolean
}

export const ExpandedDataPage: React.FC<ExpandedDataPageProps> = ({
  vehicles,
  refuelings,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')

  const {
    filteredLogs,
    logsWithEfficiencyImpact,
    efficiencyTimelineData,
    monthlyBreakdown,
    fuelTypeDistribution,
    stationInsights,
    totalSpent,
    totalDistance,
    totalLiters,
    overallKmL,
    overallCostKm,
  } = useVehicleAnalytics(refuelings, vehicles, selectedVehicleId)

  return (
    <div className="bi-dashboard animate-fade-in">
      {/* Header com Filtro de Veículo */}
      <div className="bi-header">
        <div>
          <div className="bi-header-title">
            <Activity className="w-5 h-5 text-[#0284c7]" />
            <h1>BI & Análise de Consumo</h1>
          </div>
          <div className="bi-header-subtitle">
            {filteredLogs.length} abastecimentos analisados ·{' '}
            {Math.round(totalDistance).toLocaleString('pt-BR')} km computados
          </div>
        </div>

        {vehicles.length > 1 && (
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="veh-select !h-9 !py-0 !text-xs w-48"
          >
            <option value="">Todos os veículos ({vehicles.length})</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 1. KPI Ticker */}
      <BiKpiTicker
        totalSpent={totalSpent}
        totalDistance={totalDistance}
        totalLiters={totalLiters}
        overallKmL={overallKmL}
        overallCostKm={overallCostKm}
      />

      {/* 2. Grid Principal: Curva de Consumo + Matriz Energética */}
      <div className="bi-grid-2">
        <BiConsumptionChart data={efficiencyTimelineData} />
        <BiFuelMatrixChart data={fuelTypeDistribution} />
      </div>

      {/* 3. Grid Secundário: Gastos Mensais + Consumo Mensal */}
      <BiMonthlyCharts data={monthlyBreakdown} />

      {/* 4. Grid Inferior: Auditoria de Postos + Tira de Impacto Recente */}
      <div className="bi-grid-2">
        <BiStationAudit stationInsights={stationInsights} />
        <BiRecentImpactStrip logs={logsWithEfficiencyImpact} />
      </div>
    </div>
  )
}
