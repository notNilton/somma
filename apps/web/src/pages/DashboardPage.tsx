import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../api'
import { useLocale } from '../i18n'
import { formatMoney } from '../lib/format'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function DashboardPage() {
  const { t } = useLocale()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  const [breakdownType, setBreakdownType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')

  const { data: dash } = useQuery({
    queryKey: ['dashboard', currentMonth],
    queryFn: () => analyticsApi.getDashboard(currentMonth),
  })

  const { data: evolution = [] } = useQuery({
    queryKey: ['monthly-evolution'],
    queryFn: () => analyticsApi.getMonthlyEvolution(),
  })

  const { data: breakdown } = useQuery({
    queryKey: ['category-breakdown', currentMonth, breakdownType],
    queryFn: () => analyticsApi.getCategoryBreakdown(currentMonth, breakdownType),
  })

  const balanceClass = (dash?.totalBalance ?? 0) >= 0 ? 'pos' : 'neg'
  const maxEvolution = Math.max(...evolution.map(p => Math.max(p.income, p.expenses)), 1)

  const breakdownTotal = (breakdown?.items ?? []).reduce((s, i) => s + i.total, 0) || 1

  return (
    <div className="dash-page">
      <h2 className="dash-title">{t.dashboard.title}{dash?.userName ? `, ${dash.userName}` : ''}</h2>

      {/* Summary cards */}
      <div className="dash-cards">
        <div className="dash-card dash-card-balance">
          <span className="dash-card-label">{t.dashboard.balance}</span>
          <span className={`dash-card-value ${balanceClass}`}>
            {formatMoney(dash?.totalBalance ?? 0)}
          </span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">{t.dashboard.monthlyIncome}</span>
          <span className="dash-card-value income">{formatMoney(dash?.monthlyIncome ?? 0)}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">{t.dashboard.monthlyExpenses}</span>
          <span className="dash-card-value expense">{formatMoney(dash?.monthlyExpenses ?? 0)}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">{t.dashboard.safe}</span>
          <span className="dash-card-value">{formatMoney(dash?.safeToSpend ?? 0)}</span>
        </div>
      </div>

      {/* 6-month bar chart */}
      <section className="dash-section">
        <h3 className="dash-section-title">{t.dashboard.evolution}</h3>
        <div className="dash-legend">
          <span className="dash-legend-dot income" />{t.dashboard.income}
          <span className="dash-legend-dot expense" style={{ marginLeft: '1rem' }} />{t.dashboard.expenses}
        </div>
        <div className="dash-bar-chart">
          {evolution.map(point => {
            const incomeH = (point.income / maxEvolution) * 100
            const expenseH = (point.expenses / maxEvolution) * 100
            const [, mm] = point.month.split('-')
            const monthIdx = parseInt(mm, 10) - 1
            return (
              <div key={point.month} className="dash-bar-group">
                <div className="dash-bar-pair">
                  <div
                    className="dash-bar income"
                    style={{ height: `${incomeH}%` }}
                    title={`${t.dashboard.income}: ${formatMoney(point.income)}`}
                  />
                  <div
                    className="dash-bar expense"
                    style={{ height: `${expenseH}%` }}
                    title={`${t.dashboard.expenses}: ${formatMoney(point.expenses)}`}
                  />
                </div>
                <span className="dash-bar-label">{t.months[monthIdx]}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Category breakdown */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h3 className="dash-section-title">{t.dashboard.breakdown}</h3>
          <div className="config-pills" style={{ marginBottom: 0 }}>
            <span
              className={`pill neutral${breakdownType === 'EXPENSE' ? ' active-neutral' : ''}`}
              onClick={() => setBreakdownType('EXPENSE')}
            >
              {t.dashboard.breakdownExpenses}
            </span>
            <span
              className={`pill neutral${breakdownType === 'INCOME' ? ' active-neutral' : ''}`}
              onClick={() => setBreakdownType('INCOME')}
            >
              {t.dashboard.breakdownIncome}
            </span>
          </div>
        </div>

        {!breakdown?.items.length ? (
          <p className="dash-empty">{t.dashboard.noData}</p>
        ) : (
          <div className="dash-breakdown">
            {breakdown.items.map(item => {
              const pct = (item.total / breakdownTotal) * 100
              return (
                <div key={item.categoryId ?? 'none'} className="dash-breakdown-row">
                  <span
                    className="dash-breakdown-dot"
                    style={{ background: item.categoryColor ?? '#94a3b8' }}
                  />
                  <span className="dash-breakdown-name">
                    {item.categoryName ?? t.dashboard.uncategorized}
                  </span>
                  <div className="dash-breakdown-bar-wrap">
                    <div className="dash-breakdown-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="dash-breakdown-amt">{formatMoney(item.total)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
