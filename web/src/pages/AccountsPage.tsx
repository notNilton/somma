import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '../api'
import AccountsSettingsSection from '../components/AccountsSettingsSection'
import { formatMoney } from '../lib/format'
import { ACCOUNT_GROUPS, groupAccounts } from '../lib/accountGroups'

export default function AccountsPage() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const groups = groupAccounts(accounts)
  const total = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="config-page acc-page">
      <h2 className="config-title">Contas</h2>

      <section className="acc-summary">
        <div className="acc-summary-total">
          <span className="acc-summary-label">Patrimônio total</span>
          <strong className="acc-num">{formatMoney(total)}</strong>
          <span className="acc-summary-hint">
            {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}
          </span>
        </div>
        {ACCOUNT_GROUPS.map(g => {
          const sum = groups.get(g.key)?.total ?? 0
          return (
            <div key={g.key} className="acc-summary-item">
              <span className="acc-summary-label">
                <span className={`acc-swatch ${g.key}`} aria-hidden="true" />
                {g.label}
              </span>
              <strong className="acc-num">{formatMoney(sum)}</strong>
              <span className="acc-summary-hint">{percent(sum, total)}</span>
            </div>
          )
        })}
      </section>

      {total > 0 && (
        <div className="acc-bar" role="img" aria-label="Distribuição do patrimônio por tipo de conta">
          {ACCOUNT_GROUPS.map(g => {
            const sum = groups.get(g.key)?.total ?? 0
            return sum > 0 ? (
              <span
                key={g.key}
                className={`acc-bar-seg ${g.key}`}
                style={{ width: `${(sum / total) * 100}%` }}
                title={`${g.label}: ${formatMoney(sum)} (${percent(sum, total)})`}
              />
            ) : null
          })}
        </div>
      )}

      <AccountsSettingsSection />
    </div>
  )
}

function percent(part: number, total: number): string {
  if (total <= 0) return '0%'
  return `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}
