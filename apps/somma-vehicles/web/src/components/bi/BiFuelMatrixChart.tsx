import React from 'react'
import { Fuel } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

const COLORS = ['#0284c7', '#7c3aed', '#059669', '#f59e0b', '#dc2626']

interface BiFuelMatrixChartProps {
  data: {
    name: string
    value: number
    percentage: number
  }[]
}

export const BiFuelMatrixChart: React.FC<BiFuelMatrixChartProps> = ({ data }) => {
  return (
    <div className="bi-card-box">
      <div className="bi-card-title-bar">
        <span className="bi-card-title">
          <Fuel className="w-4 h-4 text-[#f59e0b]" />
          Matriz Energética
        </span>
      </div>

      <div className="bi-chart-container" style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={56}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              formatter={(val: any, name: any) => [`${val} L`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-soft)' }}>
        {data.map((ft, idx) => (
          <div key={ft.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
              {ft.name}
            </span>
            <span style={{ fontWeight: 800, color: 'var(--text-strong)' }}>{ft.percentage}% ({ft.value} L)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
