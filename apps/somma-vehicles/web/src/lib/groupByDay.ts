import type { RefuelingLog } from '../types'

export interface DayGroup {
  dateStr: string
  dayNum: number
  refuelings: RefuelingLog[]
  totalCents: number
  totalLiters: number
  runningTotal: number
}

export function groupByDay(
  refuelings: RefuelingLog[],
  year: number,
  month: number,
): DayGroup[] {
  const lastDay = new Date(year, month + 1, 0).getDate()
  const groups: DayGroup[] = []

  let runningTotal = 0

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayRefuelings = refuelings.filter((r) => {
      const d = r.date.split('T')[0]
      return d === dateStr
    })

    const totalCents = dayRefuelings.reduce((sum, r) => sum + r.total_amount_cents, 0)
    const totalLiters = dayRefuelings.reduce((sum, r) => sum + r.liters, 0)
    runningTotal += totalCents

    groups.push({
      dateStr,
      dayNum: day,
      refuelings: dayRefuelings,
      totalCents,
      totalLiters,
      runningTotal,
    })
  }

  return groups
}
