import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** Valor normalizado com ponto decimal, ex.: "2411.57" ('' quando vazio). */
  value: string
  onChange: (value: string) => void
  allowNegative?: boolean
}

/**
 * Campo de dinheiro no formato brasileiro: vírgula separa os centavos e os
 * milhares ganham ponto enquanto se digita (2411 → 2.411; 2411,5 → 2.411,5).
 */
export default function MoneyInput({ value, onChange, allowNegative = false, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [display, setDisplay] = useState(() => fromNormalized(value))
  // Quantos dígitos ficam depois do cursor, para reposicioná-lo após formatar.
  // Contar a partir do fim não se perde com o "0" inserido à frente de ",75".
  const digitsAfterCaret = useRef<number | null>(null)

  // Valor trocado por fora (preenchimento da edição, reset do formulário).
  useEffect(() => {
    if (toNormalized(display) !== value) setDisplay(fromNormalized(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useLayoutEffect(() => {
    const input = ref.current
    if (!input || digitsAfterCaret.current === null || document.activeElement !== input) return
    let pos = display.length
    for (let seen = 0; pos > 0 && seen < digitsAfterCaret.current; ) {
      pos--
      if (isSignificant(display[pos])) seen++
    }
    // Fica colado ao último dígito digitado, antes de um ponto de milhar.
    while (pos > 0 && !isSignificant(display[pos - 1])) pos--
    input.setSelectionRange(pos, pos)
    digitsAfterCaret.current = null
  }, [display])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value
    const caret = e.target.selectionStart ?? raw.length

    // O ponto do teclado numérico vira vírgula decimal (o ponto de milhar é automático).
    if ((e.nativeEvent as InputEvent).data === '.' && !raw.includes(',')) {
      raw = raw.slice(0, caret - 1) + ',' + raw.slice(caret)
    }

    digitsAfterCaret.current = [...raw.slice(caret)].filter(isSignificant).length
    const next = format(raw, allowNegative)
    setDisplay(next)
    onChange(toNormalized(next))
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      onChange={handleChange}
    />
  )
}

function isSignificant(ch: string): boolean {
  return /[\d,-]/.test(ch)
}

/** Reformata o texto digitado: só dígitos, uma vírgula, até 2 casas e pontos de milhar. */
function format(raw: string, allowNegative: boolean): string {
  const negative = allowNegative && raw.trim().startsWith('-')
  const cleaned = raw.replace(/[^\d,]/g, '')
  const commaAt = cleaned.indexOf(',')
  const intDigits = (commaAt === -1 ? cleaned : cleaned.slice(0, commaAt)).replace(/^0+(?=\d)/, '')
  const decimals = commaAt === -1 ? null : cleaned.slice(commaAt + 1).replace(/,/g, '').slice(0, 2)

  let out = groupThousands(intDigits)
  if (decimals !== null) out = (out || '0') + ',' + decimals
  return (negative ? '-' : '') + out
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** "2.411,5" → "2411.5" */
function toNormalized(display: string): string {
  const v = display.replace(/\./g, '').replace(',', '.')
  return v === '-' || v.endsWith('.') ? v.replace(/\.$/, '') : v
}

/** "2411.5" → "2.411,50" */
function fromNormalized(value: string): string {
  if (!value) return ''
  const negative = value.startsWith('-')
  const [int, dec] = value.replace('-', '').split('.')
  const out = groupThousands(int.replace(/^0+(?=\d)/, '')) + (dec !== undefined ? ',' + dec.slice(0, 2).padEnd(2, '0') : '')
  return (negative ? '-' : '') + out
}
