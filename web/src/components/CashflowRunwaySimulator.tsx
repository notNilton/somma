import { useState } from 'react'
import type { Account, CreditCard, Transaction } from '../types'

interface Props {
  accounts: Account[]
  cards: CreditCard[]
  transactions: Transaction[]
}

export default function CashflowRunwaySimulator({ accounts, cards, transactions }: Props) {
  const [openSimulator, setOpenSimulator] = useState(false)
  const [simAmount, setSimAmount] = useState('')
  const [simInstallments, setSimInstallments] = useState(1)

  const currentCash = accounts.reduce((acc, a) => acc + a.balance, 0)
  const totalCreditAvailable = cards.reduce((acc, c) => acc + c.availableLimit, 0)

  // Calcular média diária de despesas e saldo projetado até o fim do mês
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remainingDays = Math.max(0, daysInMonth - currentDay)

  const monthExpenses = transactions
    .filter(t => t.type === 'EXPENSE' && t.status !== 'CANCELED')
    .reduce((acc, t) => acc + t.amount, 0)



  const dailyExpenseRate = currentDay > 0 ? monthExpenses / currentDay : 0
  const projectedFutureExpenses = dailyExpenseRate * remainingDays
  const projectedEndMonthCash = currentCash - projectedFutureExpenses

  // Simulação de nova compra parcelada
  const parsedSimAmount = parseFloat(simAmount) || 0
  const simMonthlyImpact = parsedSimAmount > 0 && simInstallments > 0 ? parsedSimAmount / simInstallments : 0
  const simImpactEndMonth = simInstallments === 1 ? parsedSimAmount : simMonthlyImpact
  const simulatedEndMonthCash = projectedEndMonthCash - simImpactEndMonth

  const isCritical = projectedEndMonthCash < 0

  return (
    <div
      className="cashflow-runway-card"
      style={{
        padding: '1.2rem',
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '10px',
        marginBottom: '2rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            Projeção Preditiva & Fluxo de Caixa Futuro (Runway)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Estimativa de caixa e alerta antecipado de solvência até o final do mês
          </span>
        </div>
        <button
          type="button"
          className="btn-action-sm"
          onClick={() => setOpenSimulator(o => !o)}
        >
          {openSimulator ? 'Fechar Simulador ▴' : 'Simulador de Compras ▾'}
        </button>
      </div>

      {/* Alerta de Caixa Negativo / Crítico */}
      {isCritical && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderLeft: '4px solid #ef4444',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.85rem',
          }}
        >
          <strong>⚠️ Alerta de Caixa Vermelho Antecipado:</strong> No ritmo atual de gastos diários (R$ {dailyExpenseRate.toFixed(2)}/dia), o saldo total em contas pode ficar negativo em R$ {Math.abs(projectedEndMonthCash).toFixed(2)} antes do fechamento do mês.
        </div>
      )}

      {/* Métricas de Runway */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <div style={{ padding: '0.8rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo Atual em Contas</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0', color: currentCash >= 0 ? '#10b981' : '#ef4444' }}>
            R$ {currentCash.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disponibilidade imediata</div>
        </div>

        <div style={{ padding: '0.8rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gasto Médio Diário</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0' }}>
            R$ {dailyExpenseRate.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseado no consumo do mês</div>
        </div>

        <div style={{ padding: '0.8rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo Previsto Fim do Mês</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0', color: projectedEndMonthCash >= 0 ? '#10b981' : '#ef4444' }}>
            R$ {projectedEndMonthCash.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projetando {remainingDays} dias restantes</div>
        </div>

        <div style={{ padding: '0.8rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Crédito Total Disponível</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0', color: '#6366f1' }}>
            R$ {totalCreditAvailable.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fôlego em cartões</div>
        </div>
      </div>

      {/* Simulador de Cenários & Parcelamentos */}
      {openSimulator && (
        <div
          style={{
            marginTop: '1.2rem',
            padding: '1rem',
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
            Simulador de Impacto de Compra no Fluxo de Caixa
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Teste o impacto de uma nova despesa ou compra parcelada antes de tomar a decisão:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label className="budget-field">
              <span className="budget-field-label">Valor Total da Compra (R$)</span>
              <input
                className="config-inline-input"
                type="number"
                step="0.01"
                placeholder="Ex: 1200.00"
                value={simAmount}
                onChange={e => setSimAmount(e.target.value)}
              />
            </label>

            <label className="budget-field">
              <span className="budget-field-label">Parcelamento</span>
              <select
                className="budget-input"
                value={simInstallments}
                onChange={e => setSimInstallments(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {n === 1 ? '1x à vista' : `${n}x parcelas`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {parsedSimAmount > 0 && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '6px',
                fontSize: '0.85rem',
              }}
            >
              <div>
                Impacto mensal por parcela: <strong>R$ {simMonthlyImpact.toFixed(2)} / mês</strong> por {simInstallments} mês(es).
              </div>
              <div style={{ marginTop: '0.3rem' }}>
                Saldo final estimado do mês com essa compra:{' '}
                <strong style={{ color: simulatedEndMonthCash >= 0 ? '#10b981' : '#ef4444' }}>
                  R$ {simulatedEndMonthCash.toFixed(2)}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
