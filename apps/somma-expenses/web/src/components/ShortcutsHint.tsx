export default function ShortcutsHint() {
  return (
    <div className="shortcuts-hint" role="dialog" aria-label="Atalhos de teclado">
      <div className="shortcuts-hint-inner">
        <p className="shortcuts-hint-title">Atalhos de teclado</p>
        <ul className="shortcuts-list">
          <li><kbd>n</kbd> Nova despesa</li>
          <li><kbd>?</kbd> Mostrar/ocultar atalhos</li>
          <li><kbd>Esc</kbd> Fechar modal</li>
        </ul>
      </div>
    </div>
  )
}
