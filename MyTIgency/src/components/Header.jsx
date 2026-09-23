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
  const toggleTimeoutRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [justToggled, setJustToggled] = useState(false)

  const handleToggle = () => {
    setOpen((o) => !o)
    setJustToggled(true)
    clearTimeout(toggleTimeoutRef.current)
    toggleTimeoutRef.current = setTimeout(() => setJustToggled(false), 650)
  }

  useEffect(() => () => clearTimeout(toggleTimeoutRef.current), [])

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
          className={`menu-trigger${justToggled ? ' just-toggled' : ''}`}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={handleToggle}
        >
          <DecodeText
            value={open ? t.header.menuClose : t.header.menuOpen}
            as="span"
            className="menu-trigger-label"
          />
          <svg
            className={`mark${open ? ' is-open' : ''}`}
            viewBox="0 0 178 174"
            aria-hidden="true"
          >
            <path className="chevron" d="M117.767 103.273L59.2216 133.091V121.455L104.131 99.8182L103.767 100.545V98.7273L104.131 99.4545L59.2216 77.8182V66.1818L117.767 96V103.273Z" />
            <path className="underscore" d="M177.062 124V134H118.881V124H177.062Z" />
          </svg>
        </button>
      </div>

      <Menu open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} activeId={activeId} />
    </header>
  )
}
