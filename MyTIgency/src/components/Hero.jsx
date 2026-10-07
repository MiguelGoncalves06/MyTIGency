import { useEffect, useRef } from 'react'
import { useLenis } from 'lenis/react'
import { RedText } from './RedText'
import { useLanguage } from '../context/LanguageContext'
import { useAsciiLogo } from '../hooks/useAsciiLogo'

// FOV estreito: com o FOV padrão (70°) a ponta do símbolo que gira na direção
// da câmera inflava ~1,8× e cortava o box em vários ângulos, travando o
// tamanho. A 30° a inflação cai pra ~1,25×, então o símbolo fica ~30% maior
// (mobile ~20%) em repouso sem cortar (medido numa volta inteira no
// Playwright). Mobile tem box mais baixo, por isso câmera/escala próprias.
// Lido uma vez no load.
const IS_MOBILE = window.matchMedia('(max-width: 820px)').matches

const ASCII_LOGO_OPTIONS = {
  targetSize: IS_MOBILE ? 6.4 : 4.8,
  cameraZ: IS_MOBILE ? 15 : 10.5,
  fov: 30,
  // Balanço lento em torno da frente (±~29°, 24s por ciclo), não giro de 360°:
  // de perfil o símbolo vira uma "laje" ilegível. Não segue o cursor.
  swingAngle: 0.5,
  swingPeriod: 24,
  fitToContainer: true,
  fillScene: true,
  // Resolução mais alta que o padrão (tunado para intro em tela cheia): o painel
  // da Hero é pequeno e o símbolo tem traços caligráficos finos. Com o símbolo
  // ~30% maior, 0.26 ainda resolve as letras com caracteres menos granulados
  resolution: 0.26,
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
  // but it competes with the reveal transition for the main thread. Rendering
  // less often while the page is actively scrolling keeps that scroll smooth
  // without ever fully freezing the piece (it keeps spinning either way).
  useLenis(() => {
    logoSceneRef.current?.setScrolling(window.scrollY > 2)
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
