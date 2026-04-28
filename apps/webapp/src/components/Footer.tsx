export default function Footer() {
  return (
    <footer className="border-t border-border/50 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          &copy; {new Date().getFullYear()} AureaFlow
        </p>
        <p className="text-[10px] text-muted-foreground/40">
          Desenvolvido por{' '}
          <span className="font-bold italic text-muted-foreground/60">nilByte</span>
        </p>
      </div>
    </footer>
  );
}
