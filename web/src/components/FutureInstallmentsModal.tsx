import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../api'

interface Props {
  onClose: () => void
}

export default function FutureInstallmentsModal({ onClose }: Props) {
  const { data: futureTxs = [], isLoading } = useQuery({
    queryKey: ['future-transactions'],
    queryFn: () => transactionsApi.listFuture(),
  })

  // Agrupar parcelas/transações futuras por mês (YYYY-MM)
  const byMonth: Record<string, { total: number; items: typeof futureTxs }> = {}
  for (const t of futureTxs) {
    const monthKey = t.date.slice(0, 7)
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { total: 0, items: [] }
    }
    byMonth[monthKey].items.push(t)
    byMonth[monthKey].total += t.amount
  }

  const sortedMonths = Object.keys(byMonth).sort()

  return (
    <div className="budget-modal-backdrop" onClick={onClose}>
      <div
        className="budget-modal"
        style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="budget-modal-header">
          <div>
            <div className="budget-modal-kicker">Comprometimento de Renda</div>
            <div className="budget-modal-title">Linha do Tempo de Parcelamentos Futuros</div>
            <div className="budget-modal-subtitle">
              Visualização de parcelas agendadas e impacto nos próximos meses
            </div>
          </div>
          <button type="button" className="budget-modal-close" onClick={onClose}>×</button>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando projeção futura...</div>
        ) : sortedMonths.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma parcela ou despesa futura agendada no momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {sortedMonths.map(month => {
              const group = byMonth[month]
              return (
                <div
                  key={month}
                  style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    background: 'var(--card-bg, #fff)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1.05rem' }}>Mês {month}</strong>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-negative, #ef4444)' }}>
                      - R$ {group.total.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {group.items.map(it => (
                      <div
                        key={it.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          color: 'var(--text-muted, #64748b)',
                        }}
                      >
                        <span>
                          {it.date.slice(0, 10)} — {it.description}
                          {it.totalInstallments && it.totalInstallments > 1 && (
                            <span style={{ marginLeft: '0.3rem', fontWeight: 600, color: 'var(--text-color)' }}>
                              ({it.installmentNumber ?? 1}/{it.totalInstallments})
                            </span>
                          )}
                        </span>
                        <span>R$ {it.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
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
