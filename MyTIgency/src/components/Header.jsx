import { useHeaderScroll } from '../hooks/useHeaderScroll'
import { useLanguage } from '../context/LanguageContext'

export function Header() {
  const scrolled = useHeaderScroll()
  const { t } = useLanguage()

  return (
    <header className={scrolled ? 'scrolled' : ''}>
      <a href="#top" className="brand">
        <span className="mark">&gt;_</span>
        <span className="brand-text">
          MyT
          <span className="brand-rest">igency</span>
          .
        </span>
      </a>
      <div className="nav-right">
        <nav>
          <ul>
            <li><a href="#top" className="active">{t.header.home}</a></li>
            <li><a href="#trabalhos">{t.header.work}</a></li>
            <li><a href="#carreiras">{t.header.careers}</a></li>
          </ul>
        </nav>
        <a href="#contato" className="btn">{t.header.cta}</a>
      </div>
    </header>
  )
}
