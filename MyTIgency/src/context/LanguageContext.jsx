import { createContext, useContext, useMemo, useState } from 'react'
import { strings } from '../i18n/strings'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('pt')

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: strings[lang],
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage precisa estar dentro de LanguageProvider')
  }
  return context
}
