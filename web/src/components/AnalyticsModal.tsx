import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Transaction } from '../types'

interface Props {
  transactions: Transaction[]
  onClose: () => void
}

interface TrendItem {
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  total: number
  movingAvg: number
  deltaPct?: number
  prevMonth: number
}

export default function AnalyticsModal({ transactions, onClose }: Props) {
  const [tab, setTab] = useState<'trends' | 'subscriptions'>('trends')

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: async () => {
      const res = await fetch('/api/v1/analytics/trends?type=EXPENSE', { credentials: 'include' })
      if (!res.ok) throw new Error('Falha ao carregar tendências')
      return (await res.json()) as { items: TrendItem[] }
    },
  })

  // Radar de assinaturas e despesas recorrentes
  // Identifica despesas que aparecem com descrições similares ou valores fixos
  const expenseMap: Record<string, { count: number; total: number; amount: number }> = {}
  for (const t of transactions) {
    if (t.type === 'EXPENSE' && t.status !== 'CANCELED') {
      const key = t.description.toLowerCase().trim()
      if (!expenseMap[key]) {
        expenseMap[key] = { count: 0, total: 0, amount: t.amount }
      }
      expenseMap[key].count++
      expenseMap[key].total += t.amount
    }
  }

  const subscriptions = Object.entries(expenseMap)
    .filter(([_, data]) => data.count >= 1)
    .map(([desc, data]) => ({
      description: desc.charAt(0).toUpperCase() + desc.slice(1),
      monthlyCost: data.amount,
      annualCost: data.amount * 12,
    }))
    .slice(0, 10)

  return (
    <div className="budget-modal-backdrop" onClick={onClose}>
      <div
        className="budget-modal"
        style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="budget-modal-header">
          <div>
            <div className="budget-modal-kicker">Inteligência Financeira</div>
            <div className="budget-modal-title">Analytics & Relatórios Avançados</div>
          </div>
          <button type="button" className="budget-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Abas */}
        <div className="tx-modal-type-switch" style={{ margin: '1rem 0' }}>
          <button
            type="button"
            className={`tx-modal-btn ${tab === 'trends' ? 'tx-modal-btn-primary' : 'tx-modal-btn-secondary'}`}
            onClick={() => setTab('trends')}
          >
            Tendências MoM & Médias
          </button>
          <button
            type="button"
            className={`tx-modal-btn ${tab === 'subscriptions' ? 'tx-modal-btn-primary' : 'tx-modal-btn-secondary'}`}
            onClick={() => setTab('subscriptions')}
          >
            Radar de Assinaturas (Anualizado)
          </button>
        </div>

        {tab === 'trends' && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Comparativo mês a mês (MoM) de desvios, economia e média móvel por categoria:
            </p>

            {trendsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados MoM...</div>
            ) : !trendsData || trendsData.items.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Dados insuficientes de meses anteriores para calcular tendências.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {trendsData.items.map((it, idx) => {
                  const delta = it.deltaPct ?? 0
                  const isIncrease = delta > 0

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.85rem 1rem',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '8px',
                        background: 'var(--card-bg, #fff)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{it.categoryName || 'Sem categoria'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Mês Anterior: R$ {it.prevMonth.toFixed(2)} • Média Móvel: R$ {it.movingAvg.toFixed(2)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                          R$ {it.total.toFixed(2)}
                        </div>
                        {it.deltaPct !== undefined && it.prevMonth > 0 && (
                          <span
                            className={`pill ${isIncrease ? 'pill-warning' : 'pill-positive'}`}
                            style={{ fontSize: '0.75rem', marginTop: '0.2rem', display: 'inline-block' }}
                          >
                            {isIncrease ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'subscriptions' && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Identificação de gastos frequentes e projeção do custo anualizado:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {subscriptions.map((sub, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    background: 'var(--bg-subtle, #f8fafc)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>{sub.description}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      R$ {sub.monthlyCost.toFixed(2)} / mês
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custo Anualizado</div>
                    <strong style={{ color: '#ef4444' }}>
                      R$ {sub.annualCost.toFixed(2)} / ano
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="budget-modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="budget-modal-btn budget-modal-btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
