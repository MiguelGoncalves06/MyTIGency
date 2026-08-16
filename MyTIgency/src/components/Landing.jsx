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
      <span className="landing-mark">myt.</span>

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

      <h1 className="landing-wordmark">mytigency</h1>

      <button
        type="button"
        className="scroll-down"
        aria-label="Rolar para baixo"
        onClick={triggerTransition}
      >
        <div className="scroll-wheel" />
      </button>

      <div id="ascii-logo-landing" ref={logoRef} />
    </section>
  )
}
