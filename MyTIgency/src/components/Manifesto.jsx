import { useEffect, useRef } from 'react'
import { useLenis } from 'lenis/react'
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

// Seção 3: estrutura do protótipo (PAINTest/export-secao3/secao3.html). O
// desenho/animação é montado por utils/manifestoS3.js (via
// useManifestoHorizontal); tudo aqui é posicionado em vh, como lá.
function Section3({ who }) {
  return (
    <section className="s3" aria-labelledby="s3-title">
      <p className="s3-who">
        <span className="s3-who-word">{who.word}</span> {who.rest}
      </p>

      <div className="s3-comp" role="img" aria-label={who.alt}>
        {/* de baixo para cima: gravuras (WebGL) · linhas · planetas (WebGL) · estrelas */}
        <canvas className="s3-gl" />
        <svg className="s3-ov" viewBox="0 0 1130 784" aria-hidden="true"><defs className="s3-ovdefs" /></svg>
        <canvas className="s3-gl2" />
        <svg className="s3-ov2" viewBox="0 0 1130 784" aria-hidden="true" />
      </div>

      <p className="s3-hand" aria-hidden="true">{who.hand.map((w, i) => <span key={i}>{w}</span>)}</p>

      <h2 className="s3-title" id="s3-title">{/* key = índice: troca de idioma atualiza o texto no mesmo nó (o filtro de foco fica nele) */}
        {who.title.map((l, i) => <span key={i}>{l}</span>)}</h2>

      <p className="s3-mono s3-m1">{who.notes.map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</p>
      <p className="s3-mono s3-m2">{who.notes2.map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</p>
      <p className="s3-mono s3-bin" aria-hidden="true">+&nbsp;&nbsp;0101<br />+&nbsp;&nbsp;1100<br />+&nbsp;&nbsp;0110<br />+&nbsp;&nbsp;1001</p>

      {/* decoração em coordenadas vh (viewBox 233×100 = seção 233vh × 100vh) */}
      <svg className="s3-deco" viewBox="0 0 233 100" aria-hidden="true">
        <defs>
          <symbol id="s3-star" viewBox="-1 -1 2 2"><path d="M0-1C.1-.1.1-.1 1 0 .1.1.1.1 0 1-.1.1-.1.1-1 0-.1-.1-.1-.1 0-1Z" /></symbol>
          <marker id="s3-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10 3 5Z" fill="#F04A3F" />
          </marker>
          <pattern id="s3-dots" width="1.5" height="1.5" patternUnits="userSpaceOnUse"><circle cx=".75" cy=".75" r=".15" fill="#24489a" /></pattern>
        </defs>

        {/* a seta do olhar do anjo continua até o título */}
        <path className="r s3-tip-arrow" strokeWidth=".18" markerEnd="url(#s3-head)" d="M140.5 29.3Q147.5 29.6 149.5 35" />

        <g className="s3-title-deco" transform="translate(-13 0)">
          {/* seta curva de baixo entrando no "e" */}
          <path className="r" strokeWidth=".16" markerEnd="url(#s3-head)" d="M151 70C155 68 158 64 160.5 59" />
          {/* linhas de construção do título */}
          <g className="r" strokeWidth=".08">
            <path d="M154 38.8H213" />
            <path d="M154 46H211M159 56.6H230" strokeDasharray=".4 .4" />
            <path d="M157 35V52M211 35.5V49M161.3 50V64.5M228 50V60" />
            <path d="M155 64.5H190" />
            <path d="M195 38.8H213" strokeWidth=".16" />
            <circle cx="211" cy="38.8" r=".3" fill="#F04A3F" />
          </g>
          <g fill="#F04A3F">
            <use href="#s3-star" x="156.1" y="32.6" width="1.8" height="1.8" />
            <use href="#s3-star" x="209.7" y="33.6" width="2.6" height="2.6" />
            <use href="#s3-star" x="160.4" y="63.6" width="1.8" height="1.8" />
            <use href="#s3-star" x="227" y="49" width="2" height="2" />
            <use href="#s3-star" x="231" y="66" width="2" height="2" />
            <use href="#s3-star" x="192.5" y="37.8" width="2" height="2" />
          </g>
          {/* elementos azuis */}
          <g fill="#24489a">
            <use href="#s3-star" x="168" y="13" width="1.4" height="1.4" />
            <use href="#s3-star" x="240" y="36" width="1.2" height="1.2" />
            <use href="#s3-star" x="222" y="71" width="1.6" height="1.6" />
            <use href="#s3-star" x="186" y="69" width="1.1" height="1.1" />
          </g>
          <rect className="s3-dotgrid" x="196" y="60.5" width="10" height="6" fill="url(#s3-dots)" />
          {/* rosa dos ventos */}
          <g className="s3-rosa b" transform="translate(214.5 63.5) scale(.55)" strokeWidth=".14">
            <circle r="6" /><circle r="4.6" strokeWidth=".07" />
            <path d="M-7 0H7M0-7V7" strokeWidth=".07" />
            <path d="M0-5.6.9-.9 5.6 0 .9.9 0 5.6-.9.9-5.6 0-.9-.9Z" fill="#24489a" fillOpacity=".85" />
            <path d="M2.4-2.4 4-4" markerEnd="url(#s3-head)" />
          </g>
        </g>
      </svg>
    </section>
  )
}

const TV_PALETTE = ['#1c1c1c', '#6e6e6e', '#bcbcbc', '#ffffff'] // "Cinza" do HANDOFF

// Mesmo debounce de "scroll assentou" usado no dock da Marquee.
const SCROLL_SETTLE_MS = 150

function DitherTV() {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const scrollSettleRef = useRef(0)
  // Adia o fetch do .glb + setup do WebGL (cena, PMREM) até a TV chegar
  // perto da viewport, em vez de pagar esse custo no load da página inteira
  // enquanto a seção ainda está fora de tela. rootMargin generoso dá meia
  // tela de antecedência, então o modelo já está pronto quando o usuário
  // de fato rola até lá — sem atraso visível na entrada.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let dispose = null
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const instance = mountDitherTV(canvas, { url: tvUrl, palette: TV_PALETTE })
      sceneRef.current = instance
      dispose = instance.dispose
    }, { rootMargin: '50% 0px' })
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      dispose?.()
      sceneRef.current = null
    }
  }, [])

  // Renderiza menos durante scroll ativo (ver setScrolling em tv3d.js) —
  // reduz o custo por frame da TV bem na hora em que ele mais compete com
  // o resto do scroll. Validado: ganho de fluidez perceptível, mudança
  // visual mínima (só o balanço da TV fica um pouco menos suave rolando).
  useLenis(() => {
    sceneRef.current?.setScrolling(true)
    clearTimeout(scrollSettleRef.current)
    scrollSettleRef.current = setTimeout(() => {
      sceneRef.current?.setScrolling(false)
    }, SCROLL_SETTLE_MS)
  })
  useEffect(() => () => clearTimeout(scrollSettleRef.current), [])

  return <canvas className="s2-tv" ref={canvasRef} aria-hidden="true" />
}

export function Manifesto() {
  const { t, lang } = useLanguage()
  const { label, statement, without, who } = t.manifesto
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

      <Section3 who={who} />

      <div className="manifesto-grid" aria-hidden="true" />
      </div>
    </div>
  )
}
