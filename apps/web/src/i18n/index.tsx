import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Locale, type T } from './translations'

const STORAGE_KEY = 'tallyoh:locale'

function getStoredLocale(): Locale {
  return (localStorage.getItem(STORAGE_KEY) as Locale) ?? 'pt-BR'
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: T
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'pt-BR',
  setLocale: () => {},
  t: translations['pt-BR'],
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  function setLocale(l: Locale) {
    localStorage.setItem(STORAGE_KEY, l)
    setLocaleState(l)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
