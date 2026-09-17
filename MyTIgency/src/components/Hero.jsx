import { RedText } from './RedText'
import { useScene } from '../context/SceneContext'
import { useLanguage } from '../context/LanguageContext'

function Paragraph({ segments }) {
  return (
    <p>
      {segments.map((seg, i) => (seg.bold ? <b key={i}>{seg.text}</b> : seg.text))}
    </p>
  )
}

export function Hero() {
  const { slotRef } = useScene()
  const { t } = useLanguage()
  const [line1, line2, line3, line4] = t.hero.headline

  return (
    <div className="hero-pin-wrapper">
      <div className="hero-sticky-inner">
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
            <div id="ascii-logo-hero" ref={slotRef} aria-hidden="true" />
            <div className="hero-copy">
              <Paragraph segments={t.hero.p1} />
              <Paragraph segments={t.hero.p2} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
