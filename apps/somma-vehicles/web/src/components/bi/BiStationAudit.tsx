import React from 'react'
import { Zap } from 'lucide-react'

interface BiStationAuditProps {
  stationInsights: {
    station: string
    count: number
    totalLiters: number
    avgPricePerLiter: number
    avgKmL: number | null
  }[]
}

export const BiStationAudit: React.FC<BiStationAuditProps> = ({ stationInsights }) => {
  return (
    <div className="bi-card-box">
      <div className="bi-card-title-bar">
        <span className="bi-card-title">
          <Zap className="w-4 h-4 text-[#7c3aed]" />
          Auditoria por Posto de Combustível
        </span>
      </div>

      <div className="bi-table-list">
        {stationInsights.map((st) => (
          <div key={st.station} className="bi-table-item">
            <div>
              <span className="bi-table-station-name">{st.station}</span>
              <span className="bi-table-station-sub">
                {st.count} abastecimentos ({st.totalLiters.toFixed(1)}L)
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="bi-table-price">R$ {st.avgPricePerLiter.toFixed(2)}/L</span>
              {st.avgKmL && (
                <span className="bi-table-km-l" style={{ display: 'block' }}>
                  {st.avgKmL.toFixed(1)} km/L
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
