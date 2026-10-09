import { createContext, useContext, useMemo, useState } from 'react'
import { strings } from '../i18n/strings'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'myt-lang'

// O site tem mais de uma página (index, contato): o idioma escolhido precisa
// sobreviver à navegação entre elas. Storage pode falhar (aba privada etc.) —
// nesse caso só volta ao padrão PT.
function readLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'pt'
  } catch {
    return 'pt'
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readLang)

  const value = useMemo(() => {
    const setLang = (next) => {
      setLangState(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // sem persistência, segue só nesta página
      }
    }
    return { lang, setLang, t: strings[lang] }
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage precisa estar dentro de LanguageProvider')
  }
  return context
}
