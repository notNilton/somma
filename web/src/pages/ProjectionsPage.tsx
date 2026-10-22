import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, cardsApi, transactionsApi } from '../api'
import TransferModal from '../components/TransferModal'
import AnalyticsModal from '../components/AnalyticsModal'
import MoneyInput from '../components/MoneyInput'
import { formatMoney } from '../lib/format'
import type { TransferInput } from '../types'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// A projeção é sempre do mês corrente: o ritmo de gasto usa os dias já passados
// e projeta os que faltam até o fim do mês.
export default function ProjectionsPage() {
  const qc = useQueryClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const currentDay = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const remainingDays = Math.max(0, daysInMonth - currentDay)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [simAmount, setSimAmount] = useState('')
  const [simInstallments, setSimInstallments] = useState(1)

  const from = `${year}-${pad(month + 1)}-01`
  const to = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`
  const txKey = ['transactions', year, month]

  const { data: txs = [] } = useQuery({
    queryKey: txKey,
    queryFn: () => transactionsApi.list(from, to),
  })
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })
  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  })

  const transferMutation = useMutation({
    mutationFn: (input: TransferInput) => accountsApi.transfer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: txKey })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setTransferModalOpen(false)
    },
  })

  // Ritmo de gasto: despesas do mês até hoje, por dia já passado.
  const todayStr = `${year}-${pad(month + 1)}-${pad(currentDay)}`
  const spentSoFar = txs
    .filter(t => t.type === 'EXPENSE' && t.status !== 'CANCELED' && !t.isInvoicePayment && t.date.slice(0, 10) <= todayStr)
    .reduce((sum, t) => sum + t.amount, 0)
  const dailyBurn = currentDay > 0 ? spentSoFar / currentDay : 0

  const cash = accounts.reduce((sum, a) => sum + a.balance, 0)
  const projectedEndOfMonth = cash - dailyBurn * remainingDays
  const runwayMonths = dailyBurn > 0 ? cash / (dailyBurn * 30) : null

  const totalLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0)
  const totalUsed = cards.reduce((sum, c) => sum + (c.creditLimit - c.availableLimit), 0)

  const simTotal = parseFloat(simAmount) || 0
  const simPerMonth = simTotal > 0 ? simTotal / simInstallments : 0
  const simEndOfMonth = projectedEndOfMonth - simPerMonth

  return (
    <div className="config-page acc-page">
      <div className="proj-head">
        <h2 className="config-title">Projeções</h2>
        <div className="proj-actions">
          {accounts.length >= 2 && (
            <button type="button" className="btn-action-sm" onClick={() => setTransferModalOpen(true)}>
              Transferir
            </button>
          )}
          <button type="button" className="btn-action-sm" onClick={() => setAnalyticsModalOpen(true)}>
            Relatórios
          </button>
        </div>
      </div>

      <section className="acc-summary">
        <div className="acc-summary-total">
          <span className="acc-summary-label">Saldo em contas</span>
          <strong className="acc-num">{formatMoney(cash)}</strong>
          <span className="acc-summary-hint">
            {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}
          </span>
        </div>
        <div className="acc-summary-item">
          <span className="acc-summary-label">Gasto médio diário</span>
          <strong className="acc-num">{formatMoney(dailyBurn)}</strong>
          <span className="acc-summary-hint">nos {currentDay} dias do mês</span>
        </div>
        <div className="acc-summary-item">
          <span className="acc-summary-label">Previsto no fim do mês</span>
          <strong className={`acc-num${projectedEndOfMonth < 0 ? ' proj-neg' : ''}`}>
            {formatMoney(projectedEndOfMonth)}
          </strong>
          <span className="acc-summary-hint">faltam {remainingDays} dias</span>
        </div>
        <div className="acc-summary-item">
          <span className="acc-summary-label">Pista</span>
          <strong className="acc-num">
            {runwayMonths === null ? '—' : `${runwayMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses`}
          </strong>
          <span className="acc-summary-hint">no ritmo atual</span>
        </div>
      </section>

      {projectedEndOfMonth < 0 && (
        <div className="form-error proj-alert">
          No ritmo atual ({formatMoney(dailyBurn)} por dia), o saldo em contas pode ficar negativo em{' '}
          {formatMoney(Math.abs(projectedEndOfMonth))} antes do fim do mês.
        </div>
      )}

      <section className="config-section">
        <h3 className="config-section-title">Cartões de crédito</h3>
        {cards.length === 0 ? (
          <p className="proj-empty">
            Nenhum cartão em uso. O cartão de uma conta aparece aqui depois da primeira compra no crédito.
          </p>
        ) : (
          <>
            <div className="acc-group-head">
              <span>Total usado</span>
              <span className="acc-num">
                {formatMoney(totalUsed)}
                {totalLimit > 0 && ` de ${formatMoney(totalLimit)}`}
              </span>
            </div>
            {cards.map(card => {
              const used = card.creditLimit - card.availableLimit
              return (
                <div key={card.id} className="acc-row">
                  <div className="acc-row-main">
                    <div className="acc-row-name">
                      <strong>{card.name}</strong>
                    </div>
                    <div className="acc-row-meta">
                      Fecha dia {card.closingDay} · vence dia {card.dueDay}
                    </div>
                  </div>
                  <div className="acc-row-values">
                    <strong className="acc-num">{formatMoney(used)}</strong>
                    <span className="acc-row-meta">
                      {card.creditLimit > 0
                        ? `disponível ${formatMoney(card.availableLimit)} de ${formatMoney(card.creditLimit)}`
                        : 'sem limite definido'}
                    </span>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </section>

      <section className="config-section">
        <h3 className="config-section-title">Simular uma compra</h3>
        <p className="proj-empty">Veja como uma compra afetaria o saldo previsto para o fim do mês.</p>
        <div className="proj-sim-fields">
          <label className="budget-field">
            <span className="budget-field-label">Valor total</span>
            <MoneyInput
              className="config-inline-input"
              placeholder="0,00"
              value={simAmount}
              onChange={setSimAmount}
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">Parcelas</span>
            <select
              className="budget-input"
              value={simInstallments}
              onChange={e => setSimInstallments(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>
              ))}
            </select>
          </label>
        </div>
        {simTotal > 0 && (
          <div className="proj-sim-result">
            <div>
              <span className="acc-row-meta">Por mês</span>
              <strong className="acc-num">{formatMoney(simPerMonth)}</strong>
            </div>
            <div>
              <span className="acc-row-meta">Fim do mês com a compra</span>
              <strong className={`acc-num${simEndOfMonth < 0 ? ' proj-neg' : ''}`}>{formatMoney(simEndOfMonth)}</strong>
            </div>
          </div>
        )}
      </section>

      {transferModalOpen && (
        <TransferModal
          accounts={accounts}
          onClose={() => setTransferModalOpen(false)}
          onSubmit={input => transferMutation.mutate(input)}
          error={transferMutation.error?.message}
        />
      )}
      {analyticsModalOpen && (
        <AnalyticsModal transactions={txs} onClose={() => setAnalyticsModalOpen(false)} />
      )}
    </div>
  )
}
