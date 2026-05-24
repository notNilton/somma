import type { TxType } from '../types'

export function formatMoney(amount: number): string {
  const neg = amount < 0
  const abs = Math.abs(amount)
  const whole = Math.floor(abs)
  const frac = Math.round((abs - whole) * 100)
  const s = `R$ ${thousands(whole)},${String(frac).padStart(2, '0')}`
  return neg ? '-' + s : s
}

function thousands(n: number): string {
  return n.toLocaleString('pt-BR').replace(/\./g, '.')
}

export function signPrefix(type: TxType): string {
  if (type === 'INCOME' || type === 'RETURN') return '+'
  if (type === 'EXPENSE') return '-'
  return ''
}

export function typeClass(type: TxType): string {
  return type.toLowerCase()
}

export function typeInitial(type: TxType): string {
  const map: Record<TxType, string> = {
    INCOME: 'R', EXPENSE: 'D', INVESTMENT: 'I', CREDIT: 'C', RETURN: 'E',
  }
  return map[type] ?? '?'
}

export function typeLabel(type: TxType | string): string {
  const map: Record<string, string> = {
    INCOME: 'Receita', EXPENSE: 'Despesa', INVESTMENT: 'Investimento',
    CREDIT: 'Crédito', RETURN: 'Estorno',
  }
  return map[type] ?? type
}

export function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    PIX: 'Pix', BANK: 'Banco', CARD_DEBIT: 'Débito', CARD_CREDIT: 'Crédito',
  }
  return map[channel] ?? channel
}
