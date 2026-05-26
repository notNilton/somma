import type { Transaction } from '../types'

export interface DayGroup {
  dateStr: string
  dayNum: number
  transactions: Transaction[]
  netAmount: number
  runningBalance: number
  runningInvestment: number
  runningBudget: number
  runningTotal: number
}

export interface Summary {
  totalIncome: number
  totalExpense: number
  totalInvestment: number
  netBalance: number
}

export function groupByDay(transactions: Transaction[], year: number, month: number): DayGroup[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const map = new Map<string, DayGroup>()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
    map.set(dateStr, {
      dateStr,
      dayNum: d,
      transactions: [],
      netAmount: 0,
      runningBalance: 0,
      runningInvestment: 0,
      runningBudget: 0,
      runningTotal: 0,
    })
  }

  for (const tx of transactions) {
    const dateStr = tx.date.slice(0, 10)
    const g = map.get(dateStr)
    if (!g) continue
    g.transactions.push(tx)
    g.netAmount += tx.type === 'INCOME' ? tx.amount : -tx.amount
  }

  const sorted = Array.from(map.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
  let running = 0
  let runningInvestment = 0
  let runningBudget = 0
  for (const g of sorted) {
    for (const tx of g.transactions) {
      if (tx.kind === 'SAVING') runningInvestment += tx.amount
      else if (tx.kind === 'BUDGET') runningBudget += tx.amount
    }
    running += g.netAmount
    g.runningBalance = running
    g.runningInvestment = runningInvestment
    g.runningBudget = runningBudget
    g.runningTotal = running + runningInvestment + runningBudget
  }

  return sorted
}

export function computeSummary(transactions: Transaction[]): Summary {
  let totalIncome = 0, totalExpense = 0, totalInvestment = 0
  for (const tx of transactions) {
    if (tx.type === 'INCOME') totalIncome += tx.amount
    else if (tx.kind === 'SAVING') totalInvestment += tx.amount
    else totalExpense += tx.amount
  }
  return { totalIncome, totalExpense, totalInvestment, netBalance: totalIncome - totalExpense - totalInvestment }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
