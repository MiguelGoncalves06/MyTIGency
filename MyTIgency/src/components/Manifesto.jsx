import { useEffect, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { mountDitherTV } from '../utils/tv3d'
import { useManifestoHorizontal } from '../hooks/useManifestoHorizontal'
import handImg from '../assets/mao-halftone.png'
import targetImg from '../assets/alvo.png'
import arrowImg from '../assets/seta.png'
import plusImg from '../assets/plus.svg'
import mytiImg from '../assets/MyTi.svg'
import ethosLineImg from '../assets/ethos-drawn.svg'
import lineAImg from '../assets/manifest-vetorA-s2.svg'
import lineARaw from '../assets/manifest-vetorA-s2.svg?raw'
import lineATailImg from '../assets/manifest-vetorA-s3.svg'
import lineBImg from '../assets/manifest-vetor2.svg'
import ornamentImg from '../assets/ornamento-ascii.png'
import smileyImg from '../assets/smiley.svg'
import searchImg from '../assets/setmyt.svg'
import tvUrl from '../assets/tv.min.glb?url'
// Inline (não <img>): o traço vive numa <mask> com um <path> — é esse path
// que vai receber stroke-dashoffset quando a elipse passar a se desenhar.
import brandStrokeRaw from '../assets/myt-stroke.svg?raw'

// No Figma a elipse foi esticada para abraçar a palavra — sem isso o SVG
// mantém a proporção original e fica baixo demais.
const brandStrokeSvg = brandStrokeRaw.replace('<svg ', '<svg preserveAspectRatio="none" ')

// Faixa y 409–571 do traço A: do cotovelo da curva em S até a emenda J.
// Esticada levemente na vertical (no máximo 50%), ela abre o respiro extra
// entre as seções 1 e 2 sem quebrar o traço nem endireitar a curva.
const lineAElbowSvg = lineARaw
  .replace(/width="\d+" height="\d+" viewBox="[^"]+"/, 'width="100%" height="100%" viewBox="0 409 1348 162" preserveAspectRatio="none"')

function Segment({ text, role }) {
  if (role === 'brand') {
    return (
      <span className="ms-brand">
        {text}
        <span className="ms-brand-stroke" aria-hidden="true" dangerouslySetInnerHTML={{ __html: brandStrokeSvg }} />
      </span>
    )
  }
  if (role === 'highlight') return <span className="ms-highlight">{text}</span>
  if (role === 'lead') return <span className="ms-lead">{text}</span>
  return text
}

const TV_PALETTE = ['#1c1c1c', '#6e6e6e', '#bcbcbc', '#ffffff'] // "Cinza" do HANDOFF

function DitherTV() {
  const canvasRef = useRef(null)
  useEffect(() => mountDitherTV(canvasRef.current, { url: tvUrl, palette: TV_PALETTE }).dispose, [])
  return <canvas className="s2-tv" ref={canvasRef} aria-hidden="true" />
}

export function Manifesto() {
  const { t, lang } = useLanguage()
  const { label, statement, without } = t.manifesto
  const [first, second, third] = statement
  const rootRef = useRef(null)
  useManifestoHorizontal(rootRef)

  return (
    <div className="manifesto" ref={rootRef}>
      <div className="ms-track">
      <section className="ms1" id="manifesto">
        <div className="ms-stage">
          <img className="ms-hand" src={handImg} alt="" aria-hidden="true" />

          <div className="ms-content">
            <div className="ms-eyebrow">
              <span className="ms-label">{label}</span>
              <img className="ms-eyebrow-line" src={ethosLineImg} alt="" aria-hidden="true" />
            </div>

            <h2 className="ms-statement">
              <span className="ms-line">
                {first.map((seg, i) => <Segment key={i} {...seg} />)}
                <span className="ms-anchor" aria-hidden="true">
                  <img className="ms-plus" src={plusImg} alt="" />
                </span>
              </span>
              {' '}
              <span className="ms-line">
                <img className="ms-target" src={targetImg} alt="" aria-hidden="true" />
                {second.map((seg, i) => <Segment key={i} {...seg} />)}
                <span className="ms-anchor" aria-hidden="true">
                  <img className="ms-myti" src={mytiImg} alt="" />
                </span>
              </span>
              {' '}
              <span className="ms-line">
                {third.map((seg, i) => <Segment key={i} {...seg} />)}
                <img className="ms-arrow" src={arrowImg} alt="" aria-hidden="true" />
              </span>
            </h2>
          </div>
        </div>
      </section>

      <section className="ms2">
        <div className="s2-group s2-group--without">
          <img className="s2-ornament" src={ornamentImg} alt="" aria-hidden="true" />
          <h3 className="sr-only">{without.sentence}</h3>
          <div className="s2-without" data-lang={lang} aria-hidden="true">
            <span className="s2-initial">{without.initial}</span>
            <span className="s2-rest">{without.rest}</span>
            {without.items.map((item, i) => (
              <span key={item} className={`s2-item s2-item--${i + 1}`}>{item}</span>
            ))}
          </div>
          <span className="s2-cue">
            {without.cue}
            <img className="s2-cue-arrow" src={arrowImg} alt="" aria-hidden="true" />
          </span>
        </div>

        <div className="s2-group s2-group--tv" aria-hidden="true">
          <DitherTV />
          <img className="s2-smiley" src={smileyImg} alt="" />
          <img className="s2-search" src={searchImg} alt="" />
        </div>

        {/* Metade de baixo do traço A (escala da seção 2) + rabo rumo à seção 3. */}
        <img className="s2-line s2-line-a" src={lineAImg} alt="" aria-hidden="true" />
        <img className="s2-line s2-line-a-tail" src={lineATailImg} alt="" aria-hidden="true" />
        <img className="s2-line s2-line-b" src={lineBImg} alt="" aria-hidden="true" />
      </section>

      {/* Metade de cima do traço A, na escala da seção 1 (ancorada no +). */}
      <div className="ms-frame" aria-hidden="true">
        <img className="ms-line-a ms-line-a--top" src={lineAImg} alt="" />
        <span className="ms-line-a-elbow" dangerouslySetInnerHTML={{ __html: lineAElbowSvg }} />
      </div>

      <div className="manifesto-grid" aria-hidden="true" />
      </div>
    </div>
  )
}
