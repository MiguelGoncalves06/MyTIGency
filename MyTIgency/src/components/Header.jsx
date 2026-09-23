import { useEffect, useRef, useState } from 'react'
import { useHeaderScroll } from '../hooks/useHeaderScroll'
import { useActiveSection } from '../hooks/useActiveSection'
import { useLanguage } from '../context/LanguageContext'
import { DecodeText } from './DecodeText'
import { Menu } from './Menu'

export function Header() {
  const scrolled = useHeaderScroll()
  const { t } = useLanguage()
  const headerRef = useRef(null)
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)

  const activeId = useActiveSection(['top', 'trabalhos', 'carreiras'])
  const sectionLabels = {
    top: t.header.home,
    trabalhos: t.header.work,
    carreiras: t.header.careers,
  }

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

      <div className="header-right">
        <DecodeText value={sectionLabels[activeId]} className="section-label" />

        <button
          type="button"
          ref={triggerRef}
          className="menu-trigger"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <DecodeText
            value={open ? t.header.menuClose : t.header.menuOpen}
            as="span"
            className="menu-trigger-label"
          />
          <span className="mark" aria-hidden="true">&gt;_</span>
        </button>
      </div>

      <Menu open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} activeId={activeId} />
    </header>
  )
}
