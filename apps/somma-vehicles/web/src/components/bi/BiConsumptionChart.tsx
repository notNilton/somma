import React from 'react'
import { Sparkles } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface BiConsumptionChartProps {
  data: {
    date: string
    fullDate: string
    km_l: number
    vehicle: string
    liters: number
    station: string
  }[]
}

export const BiConsumptionChart: React.FC<BiConsumptionChartProps> = ({ data }) => {
  return (
    <div className="bi-card-box">
      <div className="bi-card-title-bar">
        <span className="bi-card-title">
          <Sparkles className="w-4 h-4 text-[#0284c7]" />
          Evolução de Consumo (km/L por Tanque)
        </span>
        <span className="bi-card-badge">Últimos {data.length} tanques</span>
      </div>

      <div className="bi-chart-container" style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="biKmLGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                borderRadius: '10px',
                fontSize: '11px',
                boxShadow: 'var(--shadow-soft)',
                padding: '8px 12px',
              }}
              formatter={(value: any) => [`${value} km/L`, 'Consumo']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  const item = payload[0].payload
                  return `${item.fullDate} · ${item.vehicle} (${item.station})`
                }
                return label
              }}
            />
            <Area
              type="monotone"
              dataKey="km_l"
              stroke="#0284c7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#biKmLGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
