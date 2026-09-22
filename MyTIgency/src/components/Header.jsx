import { useEffect, useRef } from 'react'
import { useHeaderScroll } from '../hooks/useHeaderScroll'
import { useLanguage } from '../context/LanguageContext'

export function Header() {
  const scrolled = useHeaderScroll()
  const { lang, setLang, t } = useLanguage()
  const headerRef = useRef(null)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return undefined

    const setHeaderHeight = () => {
      document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`)
    }

    setHeaderHeight()
    const observer = new ResizeObserver(setHeaderHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return (
    <header ref={headerRef} className={scrolled ? 'scrolled' : ''}>
      <a href="#top" className="brand">
        <span className="mark">&gt;_</span>
        <span className="brand-text">MyTigency.</span>
      </a>
      <div className="nav-right">
        <nav>
          <ul>
            <li><a href="#top" className="active">{t.header.home}</a></li>
            <li><a href="#trabalhos">{t.header.work}</a></li>
            <li><a href="#carreiras">{t.header.careers}</a></li>
          </ul>
        </nav>
        <div className="lang-toggle" role="group" aria-label={t.header.langAria}>
          <button
            type="button"
            className={lang === 'pt' ? 'active' : ''}
            aria-pressed={lang === 'pt'}
            onClick={() => setLang('pt')}
          >
            PT
          </button>
          <span className="divider">/</span>
          <button
            type="button"
            className={lang === 'en' ? 'active' : ''}
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
        <a href="#contato" className="btn">{t.header.cta}</a>
      </div>
    </header>
  )
}
