import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLenis } from 'lenis/react'
import { useLanguage } from '../context/LanguageContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useClickOutside } from '../hooks/useClickOutside'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { DecodeText } from './DecodeText'

const CLOSE_ON_SCROLL_PX = 24

export function Menu({ open, onClose, triggerRef, activeId, isContact = false }) {
  const panelRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 820px)')
  const prefersReducedMotion = useReducedMotion()
  const { lang, setLang, t } = useLanguage()
  const lenis = useLenis()

  // Hero is permanently position:fixed (see useHeroMarqueeReveal), so a
  // native #top jump would be a no-op — scroll to the real document top.
  const handleSectionClick = (e, sectionId) => {
    onClose()
    // Fora da home os links são navegação normal entre páginas
    if (isContact) return
    if (sectionId === 'top') {
      e.preventDefault()
      e.stopPropagation()
      lenis?.scrollTo(0)
    }
  }

  useClickOutside(panelRef, onClose, open && !isMobile, triggerRef)
  useEscapeKey(onClose, open)
  useBodyScrollLock(open && isMobile)

  // Desktop: rolar a página fecha o menu (no mobile o scroll já fica travado
  // com ele aberto). Margem pequena pra um toque acidental no trackpad não
  // fechar; lê do Lenis, a autoridade de scroll.
  const scrollAtOpenRef = useRef(null)
  useEffect(() => {
    scrollAtOpenRef.current = open && !isMobile ? (lenis?.scroll ?? window.scrollY) : null
  }, [open, isMobile, lenis])
  useLenis(({ scroll }) => {
    const start = scrollAtOpenRef.current
    if (start !== null && Math.abs(scroll - start) > CLOSE_ON_SCROLL_PX) {
      scrollAtOpenRef.current = null
      onClose()
    }
  })

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector('a, button')?.focus()
    } else {
      triggerRef.current?.focus()
    }
  }, [open, triggerRef])

  const home = isContact ? '/' : ''
  const sections = [
    { id: 'top', href: isContact ? '/' : '#top', label: t.header.home },
    { id: 'trabalhos', href: `${home}#trabalhos`, label: t.header.work },
    { id: 'carreiras', href: `${home}#carreiras`, label: t.header.careers },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          id="site-menu"
          className="menu-panel"
          role="dialog"
          aria-modal={isMobile ? true : undefined}
          aria-label={t.header.menuAria}
          initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <nav>
            <ul className="menu-sections">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.href}
                    aria-current={activeId === s.id ? 'true' : undefined}
                    onClick={(e) => handleSectionClick(e, s.id)}
                  >
                    <DecodeText value={s.label} animateOnMount className="menu-item-label" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lang-toggle menu-lang" role="group" aria-label={t.header.langAria}>
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

          {!isContact && (
            <a href="/contato" className="btn menu-cta" onClick={onClose}>
              {t.header.cta}
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
