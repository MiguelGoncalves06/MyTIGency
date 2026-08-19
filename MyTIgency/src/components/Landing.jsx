import { useEffect, useRef, useState, useCallback } from 'react'
import { useAsciiLogo } from '../hooks/useAsciiLogo'
import './Landing.css'

const LANDING_SCENE_OPTIONS = {
  targetSize: 9,
  cameraZ: 10.5,
  rotationStrength: 0.35,
  autoRotateSpeed: 0.08,
}

export function Landing() {
  const logoRef = useRef(null)
  const [lang, setLang] = useState('pt')
  const [isExiting, setIsExiting] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useAsciiLogo(isDismissed ? { current: null } : logoRef, LANDING_SCENE_OPTIONS)

  const triggerTransition = useCallback(() => {
    if (isExiting || isDismissed) return
    setIsExiting(true)

    // Libera a rolagem nativa antes do fim da animação para um fluxo contínuo
    setTimeout(() => {
      const root = document.documentElement
      const { body } = document
      root.classList.remove('landing-active')
      root.style.overflow = ''
      body.style.overflow = ''
    }, 650)

    // Desmonta a landing e pausa o loop 3D
    setTimeout(() => {
      setIsDismissed(true)
    }, 950)
  }, [isExiting, isDismissed])

  useEffect(() => {
    if (isDismissed) return

    const root = document.documentElement
    const { body } = document

    root.classList.add('landing-active')
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    let touchStartY = 0
    let lastWheelTime = 0

    function onWheel(e) {
      if (e.deltaY > 15) {
        const now = Date.now()
        if (now - lastWheelTime < 200) return
        lastWheelTime = now
        triggerTransition()
      }
    }

    function onTouchStart(e) {
      touchStartY = e.touches[0].clientY
    }

    function onTouchMove(e) {
      const deltaY = touchStartY - e.touches[0].clientY
      if (deltaY > 35) {
        triggerTransition()
      }
    }

    function onKeyDown(e) {
      if (['ArrowDown', 'PageDown', 'Space', 'Enter'].includes(e.code)) {
        triggerTransition()
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      root.classList.remove('landing-active')
      root.style.overflow = ''
      body.style.overflow = ''
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isDismissed, triggerTransition])

  if (isDismissed) return null

  return (
    <section id="landing" className={isExiting ? 'landing-exiting' : ''}>
      {/* Glow atmosférico suave ao fundo */}
      <div className="landing-ambient-glow" aria-hidden="true" />

      {/* Marca no canto superior esquerdo idêntica à Header para transição perfeita */}
      <div className="landing-brand-header">
        <span className="mark">&gt;_</span>
        <span className="brand-text">MyT.</span>
      </div>

      {/* Seletor de Idioma */}
      <div className="lang-toggle" role="group" aria-label="idioma">
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

      {/* Masthead Editorial com Tipografia Refinada */}
      <div className="landing-masthead">
        <div className="masthead-badge">
          <span className="badge-pulse" />
          <span className="badge-label">DIGITAL PRODUCT STUDIO</span>
          <span className="badge-divider">—</span>
          <span className="badge-year">2026</span>
        </div>

        <h1 className="landing-brand-name">
          MyTigency<span className="brand-accent-dot">.</span>
        </h1>
      </div>

      {/* Botão de Scroll no rodapé */}
      <button
        type="button"
        className="scroll-down"
        aria-label="Rolar para baixo"
        onClick={triggerTransition}
      >
        <svg className="progress-ring" viewBox="0 0 44 44" aria-hidden="true">
          <circle className="progress-ring-track" cx="22" cy="22" r="18" />
          <circle className="progress-ring-fill" cx="22" cy="22" r="18" />
        </svg>
        <svg
          className="scroll-chevron"
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Renderizador 3D ASCII do Logo */}
      <div id="ascii-logo-landing" ref={logoRef} />
    </section>
  )
}
