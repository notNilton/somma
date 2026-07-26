import React from 'react'
import { DollarSign, Gauge, Droplet, Car } from 'lucide-react'
import { AnalyticsSummary } from '../types'
import { formatMoney } from '../api/client'

interface StatsOverviewProps {
  analytics: AnalyticsSummary | undefined
  loading?: boolean
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className="veh-stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="veh-stat animate-pulse">
            <div className="h-3 w-16 bg-[var(--border-strong)] rounded mb-2" />
            <div className="h-6 w-24 bg-[var(--border-strong)] rounded" />
          </div>
        ))}
      </div>
    )
  }

  const totalSpent = analytics?.total_spent_cents || 0
  const avgKmL = analytics?.avg_km_l || 0
  const avgCostKm = analytics?.avg_cost_per_km || 0
  const totalLiters = analytics?.total_liters || 0

  const stats = [
    { label: 'Total Gasto', value: formatMoney(totalSpent), icon: DollarSign },
    { label: 'Consumo Médio', value: avgKmL > 0 ? `${avgKmL.toFixed(1)} km/L` : '—', icon: Gauge },
    { label: 'Custo / km', value: avgCostKm > 0 ? `R$ ${avgCostKm.toFixed(2)}` : '—', icon: Car },
    { label: 'Volume Total', value: `${totalLiters.toFixed(1)} L`, icon: Droplet },
  ]

  return (
    <div className="veh-stats-grid">
      {stats.map((s, idx) => (
        <div key={idx} className="veh-stat">
          <div className="veh-stat-label">{s.label}</div>
          <div className="veh-stat-value">{s.value}</div>
        </div>
      ))}
    </div>
  )
}
