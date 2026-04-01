import { useMemo } from 'react';

interface MonthSelectorProps {
  value?: string;
  onChange: (month: string) => void;
  className?: string;
}

export function MonthSelector({ value, onChange, className = '' }: MonthSelectorProps) {
  const options = useMemo(() => {
    const opts = [];
    const date = new Date();
    // Add current month and next month just in case, plus last 11 months
    for (let i = -1; i <= 11; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      opts.push({ val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opts;
  }, [value]);

  const currentVal = value || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  return (
    <select
      value={currentVal}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-muted/30 border border-border/50 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none transition-smooth ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.val} value={opt.val}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
