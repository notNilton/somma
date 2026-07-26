import React from 'react'
import { TrendingUp, Car, Fuel } from 'lucide-react'
import { AnalyticsSummary } from '../types'
import { formatMoney } from '../api/client'

interface FuelPriceChartProps {
  analytics: AnalyticsSummary | undefined
}

export const FuelPriceChart: React.FC<FuelPriceChartProps> = ({ analytics }) => {
  const priceHistory = analytics?.price_history || []
  const vehicleSpend = analytics?.vehicle_spend || []

  const maxSpend = vehicleSpend.reduce((max, v) => Math.max(max, v.total_spent_cents), 1)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="veh-chart">
        <h3 className="veh-chart-title flex items-center gap-2">
          <Car className="w-4 h-4" />
          Gastos por Veículo
        </h3>

        {vehicleSpend.length === 0 ? (
          <div className="veh-chart-empty">Nenhum dado disponível.</div>
        ) : (
          <div className="space-y-3">
            {vehicleSpend.map((vs) => {
              const percentage = Math.round((vs.total_spent_cents / maxSpend) * 100)
              return (
                <div key={vs.vehicle_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text)]">{vs.vehicle_name}</span>
                    <span className="font-bold text-[var(--text-strong)]">{formatMoney(vs.total_spent_cents)}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0ea5e9] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="veh-chart">
        <h3 className="veh-chart-title flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Preço / Litro
        </h3>

        {priceHistory.length === 0 ? (
          <div className="veh-chart-empty">Nenhum histórico registrado.</div>
        ) : (
          <div className="space-y-2">
            {priceHistory.slice(-5).map((fp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]"
              >
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-[#0ea5e9]" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-strong)]">{fp.fuel_type}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{fp.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-[var(--text-strong)]">
                    R$ {fp.price_per_liter_reais.toFixed(3)}
                  </span>
                  <span className="block text-[10px] text-[var(--text-muted)]">por litro</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
