/**
 * Format cents (string or number) to BRL currency string
 * Example: "1000" -> "R$ 10,00"
 */
export const formatCurrency = (cents: string | number) => {
  const value = typeof cents === 'string' ? Number(cents) : cents;
  return (value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

/**
 * Clean numeric string from non-digits
 */
export const cleanNumeric = (val: string) => val.replace(/\D/g, '');

/**
 * Format pure number to BRL currency string
 * Example: 10.5 -> "R$ 10,50"
 */
export const formatValue = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Format number to KM string
 * Example: 1500 -> "1.500"
 */
export const formatKm = (n: number | string) => {
  const val = typeof n === 'string' ? Number(n) : n;
  return val.toLocaleString('pt-BR');
};

/**
 * Format YYYY-MM-DD to PT-BR label
 * Example: "2026-03-25" -> "25 de março"
 */
export const formatMonthLabelPtBr = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const label = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Returns current month key in YYYY-MM format
 */
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns month key in YYYY-MM format for a given date
 */
export function monthKey(dateLike: string | Date): string {
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}
