import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { transactionsApi } from '../api'
import { analyticsApi } from '../api'
import { useLocale } from '../i18n'
import { formatMoney } from '../lib/format'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function ReportPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const lastDay = new Date(year, month + 1, 0).getDate()
  const from = `${year}-${pad(month + 1)}-01`
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`
  const monthKey = `${year}-${pad(month + 1)}`

  const { data: txs = [] } = useQuery({
    queryKey: ['report-txs', year, month],
    queryFn: () => transactionsApi.list(from, to),
  })

  const { data: breakdown } = useQuery({
    queryKey: ['report-breakdown', monthKey],
    queryFn: () => analyticsApi.getCategoryBreakdown(monthKey, 'EXPENSE'),
  })

  const totalIncome = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="report-page">
      <div className="report-toolbar no-print">
        <button className="import-back" onClick={() => navigate(-1)}>←</button>
        <div className="month-nav" style={{ flex: 1 }}>
          <button className="month-arrow" onClick={prevMonth}>‹</button>
          <span className="month-label">{t.months[month]}/{String(year).slice(2)}</span>
          <button className="month-arrow" onClick={nextMonth}>›</button>
        </div>
        <button className="report-print-btn" onClick={() => window.print()}>
          {t.report.print}
        </button>
      </div>

      <div className="report-body">
        <div className="report-head">
          <h1 className="report-app-name">tallyoh</h1>
          <h2 className="report-period">{t.months[month]} {year}</h2>
        </div>

        {/* Summary */}
        <table className="report-table">
          <thead>
            <tr>
              <th colSpan={2}>{t.report.summary}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t.dashboard.monthlyIncome}</td>
              <td className="report-num income">{formatMoney(totalIncome)}</td>
            </tr>
            <tr>
              <td>{t.dashboard.monthlyExpenses}</td>
              <td className="report-num expense">{formatMoney(totalExpense)}</td>
            </tr>
            <tr className="report-net-row">
              <td><strong>{t.dashboard.net}</strong></td>
              <td className={`report-num ${net >= 0 ? 'income' : 'expense'}`}>
                <strong>{formatMoney(net)}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Expenses by category */}
        {breakdown?.items && breakdown.items.length > 0 && (
          <table className="report-table">
            <thead>
              <tr>
                <th colSpan={2}>{t.report.byCategory}</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.items.map(item => (
                <tr key={item.categoryId ?? 'none'}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: item.categoryColor ?? '#94a3b8',
                        display: 'inline-block', flexShrink: 0,
                      }}
                    />
                    {item.categoryName ?? t.dashboard.uncategorized}
                  </td>
                  <td className="report-num expense">{formatMoney(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Transaction list */}
        <table className="report-table report-tx-table">
          <thead>
            <tr>
              <th>{t.table.day}</th>
              <th>{t.report.colDesc}</th>
              <th>{t.report.colType}</th>
              <th className="report-num">{t.report.colAmount}</th>
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => {
              const d = new Date(tx.date)
              return (
                <tr key={tx.id}>
                  <td className="report-date">{pad(d.getUTCDate())}/{pad(d.getUTCMonth() + 1)}</td>
                  <td>{tx.description}</td>
                  <td>
                    <span className={`import-type-badge ${tx.type === 'INCOME' ? 'income' : 'expense'}`}>
                      {tx.type === 'INCOME' ? t.filter.income : t.filter.expense}
                    </span>
                  </td>
                  <td className={`report-num ${tx.type === 'INCOME' ? 'income' : 'expense'}`}>
                    {tx.type === 'EXPENSE' ? '-' : ''}{formatMoney(tx.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <p className="report-footer-note">
          tallyoh · nilbyte.com.br · {t.months[month]} {year}
        </p>
      </div>
    </div>
  )
}
