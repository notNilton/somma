import { describe, expect, it, vi } from 'vitest';

import {
  cleanNumeric,
  currentMonthKey,
  formatCurrency,
  formatKm,
  formatMonthLabelPtBr,
  formatValue,
  monthKey,
} from './formatters';

describe('formatters', () => {
  it('formats cents as BRL currency', () => {
    expect(formatCurrency(1990)).toBe('R$\u00a019,90');
    expect(formatCurrency('250')).toBe('R$\u00a02,50');
  });

  it('keeps only digits in numeric strings', () => {
    expect(cleanNumeric('R$ 1.234,56')).toBe('123456');
  });

  it('formats numbers and kilometers for pt-BR', () => {
    expect(formatValue(10.5)).toBe('R$\u00a010,50');
    expect(formatKm(1500)).toBe('1.500');
  });

  it('builds month labels and month keys consistently', () => {
    expect(formatMonthLabelPtBr('2026-03')).toBe('Março de 2026');
    expect(monthKey('2026-03-25T10:00:00Z')).toBe('2026-03');
  });

  it('uses the current date to build the current month key', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T12:00:00Z'));

    expect(currentMonthKey()).toBe('2026-04');

    vi.useRealTimers();
  });
});
