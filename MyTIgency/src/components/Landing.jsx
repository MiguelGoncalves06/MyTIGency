import { useEffect, useRef, useState } from 'react'
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

  useAsciiLogo(logoRef, LANDING_SCENE_OPTIONS)

  useEffect(() => {
    const root = document.documentElement
    const { body } = document

    root.classList.add('landing-active')
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      root.classList.remove('landing-active')
      root.style.overflow = ''
      body.style.overflow = ''
    }
  }, [])

  function handleScrollDown() {
    // transição para Hero será implementada em seguida
  }

  return (
    <section id="landing">
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
        onClick={handleScrollDown}
      >
        <div className="scroll-wheel" />
      </button>

      <div id="ascii-logo-landing" ref={logoRef} />
    </section>
  )
}
