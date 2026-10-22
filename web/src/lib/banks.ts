// Instituições mais comuns, com o código COMPE de 3 dígitos.
export interface Bank {
  code: string
  name: string
}

export const BANKS: Bank[] = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '237', name: 'Bradesco' },
  { code: '033', name: 'Santander' },
  { code: '260', name: 'Nubank' },
  { code: '077', name: 'Banco Inter' },
  { code: '336', name: 'C6 Bank' },
  { code: '323', name: 'Mercado Pago' },
  { code: '380', name: 'PicPay' },
  { code: '290', name: 'PagBank' },
  { code: '208', name: 'BTG Pactual' },
  { code: '102', name: 'XP Investimentos' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '212', name: 'Banco Original' },
  { code: '422', name: 'Safra' },
  { code: '041', name: 'Banrisul' },
  { code: '070', name: 'BRB' },
  { code: '536', name: 'Neon' },
  { code: '403', name: 'Cora' },
  { code: '197', name: 'Stone' },
]

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

/** Formata enquanto digita: até 11 dígitos como CPF, depois como CNPJ. */
export function formatDocument(raw: string): string {
  const d = onlyDigits(raw).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Mostra só o miolo do documento (padrão LGPD): ***.982.247-** */
export function maskDocument(digits: string, type: 'CPF' | 'CNPJ' | null): string {
  if (type === 'CPF' && digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
  }
  if (type === 'CNPJ' && digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/****-**`
  }
  return digits
}
