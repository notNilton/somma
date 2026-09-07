export default function ShortcutsHint() {
  return (
    <div className="shortcuts-hint" role="dialog" aria-label="Atalhos de teclado">
      <div className="shortcuts-hint-inner">
        <p className="shortcuts-hint-title">Atalhos de teclado</p>
        <ul className="shortcuts-list">
          <li><kbd>N</kbd> Novo lançamento</li>
          <li><kbd>F</kbd> Alternar filtro (Todos/Renda/Gasto)</li>
          <li><kbd>T</kbd> Ir para Lançamentos</li>
          <li><kbd>C</kbd> Ir para Configurações</li>
          <li><kbd>?</kbd> Mostrar/ocultar atalhos</li>
          <li><kbd>Esc</kbd> Fechar modal</li>
        </ul>
      </div>
    </div>
  )
}
