import { useEffect, useRef } from 'react'
import { useLenis } from 'lenis/react'
import { RedText } from './RedText'
import { useLanguage } from '../context/LanguageContext'
import { useAsciiLogo } from '../hooks/useAsciiLogo'

const ASCII_LOGO_OPTIONS = {
  targetSize: 9.5,
  cameraZ: 10.5,
  rotationStrength: 0.35,
  autoRotateSpeed: 0.08,
  fitToContainer: true,
  fillScene: true,
  pointerTrail: false,
  // Resolução mais alta que o padrão (tunado para intro em tela cheia): o painel
  // da Hero é pequeno, então precisa de caracteres menores para não ficar "blocudo"
  resolution: 0.22,
  backgroundColor: '#FAFAF8',
  foregroundColor: '#0B0B0C',
}

function Paragraph({ segments }) {
  return (
    <p>
      {segments.map((seg, i) => (seg.bold ? <b key={i}>{seg.text}</b> : seg.text))}
    </p>
  )
}

export function Hero() {
  const { t } = useLanguage()
  const [line1, line2, line3, line4] = t.hero.headline
  const logoSlotRef = useRef(null)
  const logoSceneRef = useAsciiLogo(logoSlotRef, ASCII_LOGO_OPTIONS)

  useEffect(() => {
    logoSceneRef.current?.setProgress(1)
  }, [logoSceneRef])

  // The ascii render loop forces a GPU readback every frame — cheap at rest,
  // but it competes with the reveal transition for the main thread. Pausing
  // it while the page is actively scrolled away from the top is what keeps
  // that scroll smooth; it resumes once the user is back at the fold.
  useLenis(() => {
    logoSceneRef.current?.setScrollPaused(window.scrollY > 2)
  })

  return (
    <section className="hero" id="top">
      <div className="hero-left">
        <span className="eyebrow">{t.hero.eyebrow}</span>
        <h1 className="headline display">
          <span className="headline-line headline-line--1">{line1}</span>
          <span className="headline-line headline-line--2">{line2}</span>
          <span className="headline-line headline-line--3">{line3}</span>
          <span className="headline-line headline-line--4">
            <RedText className="accent" block>{line4}</RedText>
          </span>
        </h1>
      </div>
      <div className="hero-right">
        <div id="ascii-logo-hero" ref={logoSlotRef} aria-hidden="true" />
        <div className="hero-copy">
          <Paragraph segments={t.hero.p1} />
          <Paragraph segments={t.hero.p2} />
        </div>
      </div>
    </section>
  )
}
