import React from 'react'
import { Gauge, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { LogWithEfficiencyImpact } from '../../hooks/useVehicleAnalytics'

interface BiRecentImpactStripProps {
  logs: LogWithEfficiencyImpact[]
}

export const BiRecentImpactStrip: React.FC<BiRecentImpactStripProps> = ({ logs }) => {
  return (
    <div className="bi-card-box">
      <div className="bi-card-title-bar">
        <span className="bi-card-title">
          <Gauge className="w-4 h-4 text-[#0284c7]" />
          Impacto no Consumo (Últimos Tanques)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
        {logs.slice(-6).reverse().map((log) => {
          const d = new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          return (
            <div key={log.id} className="bi-mini-card">
              <div className="bi-mini-card-top">
                <span>{d}</span>
                {log.impact === 'up' && (
                  <span style={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                    <ArrowUpRight className="w-3 h-3" /> +{log.delta.toFixed(1)}
                  </span>
                )}
                {log.impact === 'down' && (
                  <span style={{ color: '#dc2626', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                    <ArrowDownRight className="w-3 h-3" /> {log.delta.toFixed(1)}
                  </span>
                )}
                {log.impact === 'equal' && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    <Minus className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div style={{ marginTop: '0.35rem' }}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--text-strong)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {log.vehicle_name}
                </div>
                <div className="bi-mini-card-val">
                  {log.calculated_km_l && log.calculated_km_l > 0
                    ? `${log.calculated_km_l.toFixed(1)} km/L`
                    : '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
