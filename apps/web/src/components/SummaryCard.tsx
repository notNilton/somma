import { formatMoney } from '../lib/format'
import type { Summary } from '../lib/groupByDay'

export default function SummaryCard({ summary }: { summary: Summary }) {
  const { netBalance, totalIncome, totalExpense, totalInvestment } = summary
  const balClass = netBalance > 0 ? 'pos' : netBalance < 0 ? 'neg' : 'zero'

  return (
    <div className="summary-card">
      <div className="summary-period">Resumo do mês</div>
      <div className={`summary-balance ${balClass}`}>
        {netBalance > 0 ? '+' : ''}{formatMoney(netBalance)}
      </div>
      <hr className="summary-divider" />
      <div className="summary-row">
        <span className="summary-dot income" />
        <span className="summary-name">Receitas</span>
        <span className="summary-val pos">+{formatMoney(totalIncome)}</span>
      </div>
      <div className="summary-row">
        <span className="summary-dot expense" />
        <span className="summary-name">Despesas</span>
        <span className="summary-val neg">-{formatMoney(totalExpense)}</span>
      </div>
      <div className="summary-row">
        <span className="summary-dot investment" />
        <span className="summary-name">Invest.</span>
        <span className="summary-val inv">-{formatMoney(totalInvestment)}</span>
      </div>
    </div>
  )
}
