import React from 'react'
import { DollarSign, Gauge } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface BiMonthlyChartsProps {
  data: {
    key: string
    mes: string
    gasto: number
    avgKmL: number
  }[]
}

export const BiMonthlyCharts: React.FC<BiMonthlyChartsProps> = ({ data }) => {
  return (
    <div className="bi-grid-equal">
      {/* Gráfico de Gasto Mensal */}
      <div className="bi-card-box">
        <div className="bi-card-title-bar">
          <span className="bi-card-title">
            <DollarSign className="w-4 h-4 text-[#0284c7]" />
            Gasto Mensal (R$)
          </span>
          <span className="bi-card-badge">Últimos meses</span>
        </div>

        <div className="bi-chart-container" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(val: any) => [`R$ ${val}`, 'Gasto']}
              />
              <Bar dataKey="gasto" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Consumo Mensal */}
      <div className="bi-card-box">
        <div className="bi-card-title-bar">
          <span className="bi-card-title">
            <Gauge className="w-4 h-4 text-[#059669]" />
            Consumo Mensal (km/L)
          </span>
          <span className="bi-card-badge">Média ponderada</span>
        </div>

        <div className="bi-chart-container" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={[0, 'dataMax + 2']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(val: any) => [`${val} km/L`, 'Consumo Médio']}
              />
              <Bar dataKey="avgKmL" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
