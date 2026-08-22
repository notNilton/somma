import { useMemo } from 'react'
import { RefuelingLog, Vehicle } from '../types'

export interface LogWithEfficiencyImpact extends RefuelingLog {
  prevAvg: number | null
  currentAvg: number | null
  impact: 'up' | 'down' | 'equal' | 'none'
  delta: number
}

export function useVehicleAnalytics(
  refuelings: RefuelingLog[],
  vehicles: Vehicle[],
  selectedVehicleId: string
) {
  // 1. Filtered logs chronologically (oldest to newest for timeline calculations)
  const filteredLogs = useMemo(() => {
    const logs = selectedVehicleId
      ? refuelings.filter((r) => r.vehicle_id === selectedVehicleId)
      : refuelings
    return [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [refuelings, selectedVehicleId])

  // 2. Rolling Efficiency Impact Analysis
  const logsWithEfficiencyImpact: LogWithEfficiencyImpact[] = useMemo(() => {
    let runningKm = 0
    let runningLiters = 0

    return filteredLogs.map((log) => {
      const prevAvg = runningKm > 0 && runningLiters > 0 ? runningKm / runningLiters : null

      if (log.distance_since_last_km && log.distance_since_last_km > 0 && log.liters > 0) {
        runningKm += log.distance_since_last_km
        runningLiters += log.liters
      }

      const currentAvg = runningKm > 0 && runningLiters > 0 ? runningKm / runningLiters : null

      let impact: 'up' | 'down' | 'equal' | 'none' = 'none'
      let delta = 0

      if (log.calculated_km_l && log.calculated_km_l > 0 && prevAvg) {
        delta = log.calculated_km_l - prevAvg
        if (delta > 0.1) impact = 'up'
        else if (delta < -0.1) impact = 'down'
        else impact = 'equal'
      }

      return {
        ...log,
        prevAvg,
        currentAvg,
        impact,
        delta,
      }
    })
  }, [filteredLogs])

  // 3. Timeline curve data (AreaChart)
  const efficiencyTimelineData = useMemo(() => {
    const validLogs = logsWithEfficiencyImpact.filter((l) => l.calculated_km_l && l.calculated_km_l > 0)
    const subset = validLogs.slice(-25)
    return subset.map((l) => {
      const d = new Date(l.date)
      return {
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: d.toLocaleDateString('pt-BR'),
        km_l: parseFloat(l.calculated_km_l!.toFixed(1)),
        vehicle: l.vehicle_name || 'Veículo',
        liters: l.liters,
        station: l.station || l.fuel_type,
      }
    })
  }, [logsWithEfficiencyImpact])

  // 4. Monthly aggregation (last 8 months)
  const monthlyBreakdown = useMemo(() => {
    const monthsMap = new Map<
      string,
      {
        monthLabel: string
        totalSpentCents: number
        totalLiters: number
        totalKm: number
      }
    >()

    filteredLogs.forEach((log) => {
      const d = new Date(log.date)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')

      const current = monthsMap.get(monthKey) || {
        monthLabel,
        totalSpentCents: 0,
        totalLiters: 0,
        totalKm: 0,
      }

      current.totalSpentCents += log.total_amount_cents || 0
      current.totalLiters += log.liters || 0
      if (log.distance_since_last_km && log.distance_since_last_km > 0) {
        current.totalKm += log.distance_since_last_km
      }

      monthsMap.set(monthKey, current)
    })

    return Array.from(monthsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([key, data]) => ({
        key,
        mes: data.monthLabel,
        gasto: parseFloat((data.totalSpentCents / 100).toFixed(0)),
        avgKmL: data.totalKm > 0 && data.totalLiters > 0 ? parseFloat((data.totalKm / data.totalLiters).toFixed(1)) : 0,
      }))
  }, [filteredLogs])

  // 5. Fuel Type distribution
  const fuelTypeDistribution = useMemo(() => {
    const map = new Map<string, { liters: number; spentCents: number }>()

    filteredLogs.forEach((log) => {
      const type = log.fuel_type || 'Gasolina'
      const cur = map.get(type) || { liters: 0, spentCents: 0 }
      cur.liters += log.liters || 0
      cur.spentCents += log.total_amount_cents || 0
      map.set(type, cur)
    })

    const totalLiters = filteredLogs.reduce((acc, cur) => acc + (cur.liters || 0), 0) || 1

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      value: parseFloat(data.liters.toFixed(1)),
      percentage: Math.round((data.liters / totalLiters) * 100),
    }))
  }, [filteredLogs])

  // 6. Station Insights
  const stationInsights = useMemo(() => {
    const map = new Map<string, { count: number; totalLiters: number; totalSpentCents: number; sumKmL: number; countKmL: number }>()

    filteredLogs.forEach((log) => {
      const st = log.station || 'Outro'
      const cur = map.get(st) || { count: 0, totalLiters: 0, totalSpentCents: 0, sumKmL: 0, countKmL: 0 }
      cur.count += 1
      cur.totalLiters += log.liters || 0
      cur.totalSpentCents += log.total_amount_cents || 0
      if (log.calculated_km_l && log.calculated_km_l > 0) {
        cur.sumKmL += log.calculated_km_l
        cur.countKmL += 1
      }
      map.set(st, cur)
    })

    return Array.from(map.entries())
      .map(([station, data]) => ({
        station,
        count: data.count,
        totalLiters: data.totalLiters,
        avgPricePerLiter: data.totalLiters > 0 ? (data.totalSpentCents / 100) / data.totalLiters : 0,
        avgKmL: data.countKmL > 0 ? data.sumKmL / data.countKmL : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [filteredLogs])

  // 7. Overall Summary Metrics
  const totalSpent = filteredLogs.reduce((acc, cur) => acc + (cur.total_amount_cents || 0), 0)
  const totalDistance = filteredLogs.reduce((acc, cur) => acc + (cur.distance_since_last_km || 0), 0)
  const totalLiters = filteredLogs.reduce((acc, cur) => acc + (cur.liters || 0), 0)
  const overallKmL = totalDistance > 0 && totalLiters > 0 ? totalDistance / totalLiters : 0
  const overallCostKm = totalDistance > 0 ? (totalSpent / 100) / totalDistance : 0

  return {
    filteredLogs,
    logsWithEfficiencyImpact,
    efficiencyTimelineData,
    monthlyBreakdown,
    fuelTypeDistribution,
    stationInsights,
    totalSpent,
    totalDistance,
    totalLiters,
    overallKmL,
    overallCostKm,
  }
}
