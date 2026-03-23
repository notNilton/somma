import { Plus } from 'lucide-react';

interface FabProps {
  onClick: () => void;
  label?: string;
}

export default function Fab({ onClick, label = 'Novo' }: FabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="sm:hidden fixed bottom-[calc(56px+16px)] right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
