export function formatMoney(amount: number): string {
  const neg = amount < 0
  const abs = Math.abs(amount)
  const whole = Math.floor(abs)
  const frac = Math.round((abs - whole) * 100)
  const s = `R$ ${whole.toLocaleString('pt-BR')},${String(frac).padStart(2, '0')}`
  return neg ? '-' + s : s
}
