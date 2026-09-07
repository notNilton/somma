import { useState } from 'react'
import type { Account, CreditCard } from '../types'

interface Props {
  accounts: Account[]
  cards: CreditCard[]
  onOpenTransfer: () => void
}

const accountTypeLabels: Record<string, string> = {
  CHECKING: 'Corrente',
  WALLET: 'Dinheiro / Carteira',
  EMERGENCY: 'Reserva de Emergência',
  INVESTMENT: 'Investimento',
}

export default function AccountsSummaryCard({ accounts, cards, onOpenTransfer }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const totalAccountsBalance = accounts.reduce((acc, a) => acc + a.balance, 0)
  const totalCreditLimit = cards.reduce((acc, c) => acc + c.creditLimit, 0)
  const totalAvailableLimit = cards.reduce((acc, c) => acc + c.availableLimit, 0)
  const totalUsedCredit = Math.max(0, totalCreditLimit - totalAvailableLimit)

  if (accounts.length === 0 && cards.length === 0) {
    return null
  }

  return (
    <div className="accounts-summary-bar">
      <div className="accounts-summary-header">
        <div className="accounts-summary-totals">
          <div className="accounts-summary-kpi">
            <span className="accounts-kpi-label">Saldo em Contas</span>
            <span className={`accounts-kpi-val ${totalAccountsBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
              R$ {totalAccountsBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {cards.length > 0 && (
            <div className="accounts-summary-kpi">
              <span className="accounts-kpi-label">Faturas / Limite Usado</span>
              <span className="accounts-kpi-val text-warning">
                R$ {totalUsedCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="accounts-kpi-sub">
                  de R$ {totalCreditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="accounts-summary-actions">
          {accounts.length >= 2 && (
            <button
              type="button"
              className="btn-action-sm"
              onClick={onOpenTransfer}
              title="Transferir saldo entre contas próprias"
            >
              ⇄ Transferir
            </button>
          )}
          <button
            type="button"
            className="btn-action-sm btn-action-ghost"
            onClick={() => setCollapsed(c => !c)}
          >
            {collapsed ? 'Ver Contas ▾' : 'Ocultar ▴'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="accounts-chips-list">
          {accounts.map(acc => (
            <div key={acc.id} className="account-chip">
              <div className="account-chip-meta">
                <span className="account-chip-name">{acc.name}</span>
                <span className="account-chip-type">{accountTypeLabels[acc.type] ?? acc.type}</span>
              </div>
              <span className={`account-chip-val ${acc.balance >= 0 ? 'text-positive' : 'text-negative'}`}>
                R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}

          {cards.map(c => (
            <div key={c.id} className="account-chip card-chip">
              <div className="account-chip-meta">
                <span className="account-chip-name">💳 {c.name}</span>
                <span className="account-chip-type">
                  Fecha dia {c.closingDay} • Vence dia {c.dueDay}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="account-chip-val" style={{ fontSize: '0.85rem' }}>
                  Disp: R$ {c.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
