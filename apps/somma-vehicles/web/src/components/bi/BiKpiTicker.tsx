import React from 'react'
import { DollarSign, Car, Gauge, TrendingUp } from 'lucide-react'
import { formatMoney } from '../../api/client'

interface BiKpiTickerProps {
  totalSpent: number
  totalDistance: number
  totalLiters: number
  overallKmL: number
  overallCostKm: number
}

export const BiKpiTicker: React.FC<BiKpiTickerProps> = ({
  totalSpent,
  totalDistance,
  totalLiters,
  overallKmL,
  overallCostKm,
}) => {
  return (
    <div className="bi-kpi-grid">
      <div className="bi-kpi-card">
        <div className="bi-kpi-header">
          <span>Total Investido</span>
          <DollarSign className="w-4 h-4 text-[#0284c7]" />
        </div>
        <div className="bi-kpi-value accent-blue">{formatMoney(totalSpent)}</div>
        <span className="bi-kpi-sub">{totalLiters.toFixed(1)} Litros abastecidos</span>
      </div>

      <div className="bi-kpi-card">
        <div className="bi-kpi-header">
          <span>Distância Mapeada</span>
          <Car className="w-4 h-4 text-[#7c3aed]" />
        </div>
        <div className="bi-kpi-value accent-purple">
          {totalDistance > 0 ? `${Math.round(totalDistance).toLocaleString('pt-BR')} km` : '—'}
        </div>
        <span className="bi-kpi-sub">Odômetro entre tanques</span>
      </div>

      <div className="bi-kpi-card">
        <div className="bi-kpi-header">
          <span>Consumo Global</span>
          <Gauge className="w-4 h-4 text-[#059669]" />
        </div>
        <div className="bi-kpi-value accent-green">
          {overallKmL > 0 ? `${overallKmL.toFixed(1)} km/L` : '—'}
        </div>
        <span className="bi-kpi-sub">Média consolidada</span>
      </div>

      <div className="bi-kpi-card">
        <div className="bi-kpi-header">
          <span>Custo por KM</span>
          <TrendingUp className="w-4 h-4 text-[#d97706]" />
        </div>
        <div className="bi-kpi-value accent-amber">
          {overallCostKm > 0 ? `R$ ${overallCostKm.toFixed(2)}` : '—'}
        </div>
        <span className="bi-kpi-sub">Custo operacional</span>
      </div>
    </div>
  )
}
