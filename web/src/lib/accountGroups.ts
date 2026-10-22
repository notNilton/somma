import type { Account, AccountType } from '../types'

export type AccountGroupKey = 'available' | 'reserve' | 'invested'

// Conta corrente e carteira são dinheiro disponível; reserva e investimentos ficam à parte.
export const ACCOUNT_GROUPS: Array<{ key: AccountGroupKey; label: string; types: AccountType[] }> = [
  { key: 'available', label: 'Em conta', types: ['CHECKING', 'WALLET'] },
  { key: 'reserve', label: 'Reserva', types: ['EMERGENCY'] },
  { key: 'invested', label: 'Investimentos', types: ['INVESTMENT'] },
]

export interface AccountGroup {
  accounts: Account[]
  total: number
}

export function groupAccounts(accounts: Account[]): Map<AccountGroupKey, AccountGroup> {
  const result = new Map<AccountGroupKey, AccountGroup>()
  for (const g of ACCOUNT_GROUPS) {
    const list = accounts
      .filter(a => g.types.includes(a.type))
      .sort((a, b) => b.balance - a.balance)
    result.set(g.key, { accounts: list, total: list.reduce((sum, a) => sum + a.balance, 0) })
  }
  return result
}
