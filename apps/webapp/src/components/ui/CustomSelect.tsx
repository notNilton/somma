import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-smooth disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate flex-1 font-medium">
          {selected?.icon && <div className="shrink-0">{selected.icon}</div>}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl shadow-primary/10 max-h-60 overflow-y-auto p-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-smooth group"
            >
              <div className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-smooth italic">
                {placeholder}
              </div>
            </button>
            {options.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-smooth group ${
                  value === opt.value ? 'bg-primary/5' : ''
                }`}
              >
                {opt.color && (
                  <div
                    className="w-2.5 h-2.5 shrink-0 rounded-full mt-1 shadow-sm border border-black/10"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.icon && <div className="mt-0.5 shrink-0">{opt.icon}</div>}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-bold transition-smooth truncate ${
                      value === opt.value ? 'text-primary' : 'text-foreground group-hover:text-primary'
                    }`}
                  >
                    {opt.label}
                  </div>
                  {opt.description && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                      {opt.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomSelect;
