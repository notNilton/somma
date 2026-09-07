/**
 * Retorna a data de hoje no fuso horário de Brasília (America/Sao_Paulo)
 * no formato YYYY-MM-DD, usando Intl.DateTimeFormat para precisão.
 *
 * Isso garante que os filtros de data enviados para a API correspondam
 * ao mesmo dia que o servidor (UTC-3) espera, independentemente do fuso
 * horário do dispositivo do usuário.
 */
export function todayInBrazil(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Retorna uma data específica no fuso horário de Brasília no formato YYYY-MM-DD.
 * Útil para converter datas recebidas da API para exibição.
 */
export function formatInBrazil(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Retorna o primeiro dia do mês atual no fuso de Brasília (YYYY-MM-DD).
 */
export function firstDayOfMonthInBrazil(): string {
  const now = new Date();
  const brDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Replace the day with "01" for the first day of the month
  return brDate.slice(0, 8) + "01";
}
