import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Options {
  onNewTransaction?: () => void
}

export function useKeyboardShortcuts({ onNewTransaction }: Options = {}) {
  const navigate = useNavigate()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case 'n':
          e.preventDefault()
          onNewTransaction?.()
          break
        case '?':
          e.preventDefault()
          document.querySelector<HTMLElement>('.shortcuts-hint')?.classList.toggle('visible')
          break
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [navigate, onNewTransaction])
}
