import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../api'
import BudgetSection from '../components/BudgetSection'
import GoalsSection from '../components/GoalsSection'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function BudgetsPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const lastDay = new Date(year, month + 1, 0).getDate()
  const from = `${year}-${pad(month + 1)}-01`
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`

  const { data: txs = [] } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => transactionsApi.list(from, to),
  })

  const income = txs
    .filter(t => t.type === 'INCOME' && t.status !== 'CANCELED')
    .reduce((acc, t) => acc + t.amount, 0)

  const expense = txs
    .filter(t => t.type === 'EXPENSE' && t.status !== 'CANCELED')
    .reduce((acc, t) => acc + t.amount, 0)

  return (
    <div className="tx-page" style={{ maxWidth: '860px', margin: '0 auto', padding: '1rem' }}>
      <BudgetSection totalIncomeMonth={income} totalExpenseMonth={expense} />
      <GoalsSection />
    </div>
  )
}
