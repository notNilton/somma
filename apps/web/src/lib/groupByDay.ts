import type { Transaction, TxType } from '../types'

const PT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export interface DayGroup {
  dateStr: string
  label: string
  transactions: Transaction[]
  netAmount: number
}

export interface Summary {
  totalIncome: number
  totalExpense: number
  totalInvestment: number
  netBalance: number
}

export function groupByDay(transactions: Transaction[], now: Date): DayGroup[] {
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayStr = toDateStr(now)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)

  const map = new Map<string, DayGroup>()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
    map.set(dateStr, { dateStr, label: label(dateStr, todayStr, yesterdayStr), transactions: [], netAmount: 0 })
  }

  for (const tx of transactions) {
    const dateStr = tx.date.slice(0, 10)
    const g = map.get(dateStr)
    if (!g) continue
    g.transactions.push(tx)
    g.netAmount += netSign(tx.type) * tx.amount
  }

  return Array.from(map.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr))
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

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function label(dateStr: string, todayStr: string, yesterdayStr: string): string {
  if (dateStr === todayStr) return 'Hoje'
  if (dateStr === yesterdayStr) return 'Ontem'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${PT_WEEKDAYS[date.getDay()]}, ${pad(d)}/${pad(m)}`
}
