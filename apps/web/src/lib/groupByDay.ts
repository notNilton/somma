import type { Transaction, TxType } from '../types'

export interface DayGroup {
  dateStr: string
  dayNum: number
  transactions: Transaction[]
  netAmount: number
  typeTotals: Partial<Record<TxType, number>>
  runningBalance: number
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
    map.set(dateStr, { dateStr, dayNum: d, transactions: [], netAmount: 0, typeTotals: {}, runningBalance: 0 })
  }

  for (const tx of transactions) {
    const dateStr = tx.date.slice(0, 10)
    const g = map.get(dateStr)
    if (!g) continue
    g.transactions.push(tx)
    g.netAmount += netSign(tx.type) * tx.amount
    g.typeTotals[tx.type] = (g.typeTotals[tx.type] ?? 0) + tx.amount
  }

  // Compute running balance oldest → newest, then return newest first
  const sorted = Array.from(map.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
  let running = 0
  for (const g of sorted) {
    running += g.netAmount
    g.runningBalance = running
  }

  return sorted.reverse()
}

export function computeSummary(transactions: Transaction[]): Summary {
  let totalIncome = 0, totalExpense = 0, totalInvestment = 0, netBalance = 0
  for (const tx of transactions) {
    if (tx.type === 'INCOME' || tx.type === 'RETURN') {
      totalIncome += tx.amount; netBalance += tx.amount
    } else if (tx.type === 'EXPENSE') {
      totalExpense += tx.amount; netBalance -= tx.amount
    } else if (tx.type === 'INVESTMENT') {
      totalInvestment += tx.amount; netBalance -= tx.amount
    }
  }
  return { totalIncome, totalExpense, totalInvestment, netBalance }
}

function netSign(type: TxType): number {
  if (type === 'INCOME' || type === 'RETURN') return 1
  if (type === 'EXPENSE' || type === 'INVESTMENT') return -1
  return 0
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
