import { useEffect, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import { useLanguage } from '../context/LanguageContext'
import { mountDitherTV } from '../utils/tv3d'
import { useManifestoHorizontal } from '../hooks/useManifestoHorizontal'
import { useManifestoIntro } from '../hooks/useManifestoIntro'
import { useManifestoS2Enter } from '../hooks/useManifestoS2Enter'
import { DecodeText } from './DecodeText'
import handImg from '../assets/mao-halftone.png'
import targetImg from '../assets/alvo.png'
import arrowImg from '../assets/seta.png'
import plusImg from '../assets/plus.svg'
import mytiRaw from '../assets/MyTi.svg?raw'
import ethosLineImg from '../assets/ethos-drawn.svg'
import { initialPiece, lineAPiece, lineBPiece } from '../utils/manifestoLineA'
import ornamentImg from '../assets/ornamento-ascii.png'
import smileyImg from '../assets/smiley.svg'
import searchBoxImg from '../assets/s2-busca.png'
import searchCursorImg from '../assets/s2-cursor.svg'
import tvUrl from '../assets/tv.min.glb?url'
// Inline (não <img>): o traço vive numa <mask> com um <path> — é esse path
// que vai receber stroke-dashoffset quando a elipse passar a se desenhar.
import brandStrokeRaw from '../assets/myt-stroke.svg?raw'

// No Figma a elipse foi esticada para abraçar a palavra — sem isso o SVG
// mantém a proporção original e fica baixo demais.
const brandStrokeSvg = brandStrokeRaw.replace('<svg ', '<svg preserveAspectRatio="none" ')

// Traço A em três pedaços (mesmo SVG, cada um com a máscara da "caneta" —
// ver utils/manifestoLineA.js): metade de cima, o cotovelo y 409–571 (esticado
// levemente na vertical para abrir o respiro entre as seções 1 e 2, sem
// quebrar o traço nem endireitar a curva) e a metade de baixo, na seção 2.
// Objetos {__html} fixos no módulo: o React 19 compara dangerouslySetInnerHTML
// pela identidade do objeto, então um literal novo a cada render regravaria o
// SVG (e apagaria o que as animações prepararam nele: máscaras, carimbos).
const BRAND_HTML = { __html: brandStrokeSvg }
const MYTI_HTML = { __html: mytiRaw }
const LINE_A_TOP = { __html: lineAPiece('la-top') }
const LINE_A_ELBOW = { __html: lineAPiece('la-elbow', '0 409 1348 162') }
const LINE_A_LOW = { __html: lineAPiece('la-low', '0 0 2135 1216') }
const LINE_B_HTML = { __html: lineBPiece('lb') }

// Cada palavra vira um .ms-w (unidade que pinta no scroll — useManifestoIntro);
// trechos com papel (brand/highlight/lead) pintam como uma unidade só.
function Segment({ text, role }) {
  if (role === 'brand') {
    return (
      <span className="ms-brand ms-w">
        {text}
        <span className="ms-brand-stroke" aria-hidden="true" dangerouslySetInnerHTML={BRAND_HTML} />
      </span>
    )
  }
  // Texto num span interno: é pintado depois da caixa (::before do externo),
  // e troca de cinza pra branco na frente dela (ver .ms-hl-text no CSS).
  if (role === 'highlight') return <span className="ms-highlight ms-w"><span className="ms-hl-text">{text}</span></span>
  // CONDUZ: letra a letra (assentam da esquerda pra direita).
  if (role === 'lead') {
    return <span className="ms-lead" aria-label={text}>{[...text].map((ch, i) => <span key={i} className="ms-ch" aria-hidden="true">{ch}</span>)}</span>
  }
  return text.split(/(\s+)/).map((part, i) => (/^\s*$/.test(part) ? part : <span key={i} className="ms-w">{part}</span>))
}

// Seção 3: estrutura do protótipo (PAINTest/export-secao3/secao3.html). O
// desenho/animação é montado por utils/manifestoS3.js (via
// useManifestoHorizontal); tudo aqui é posicionado em vh, como lá.
function Section3({ who }) {
  return (
    <section className="s3" aria-labelledby="s3-title">
      {/* Marca-texto (s3-marca-texto.svg): barras com ponta nas duas bordas e
          caixa translúcida que anda com --mark (timeline da seção 3). */}
      <p className="s3-who">
        <span className="s3-who-word">
          <svg className="s3-mark-bar" viewBox="0 0 17 88" aria-hidden="true">
            <rect x="5.22" y="5.68" width="6.49" height="75.25" rx="1" /><path d="M8.5 10.54 1.15 2.67 15.76 2.63Z" />
          </svg>
          {who.word} {who.rest}
          <svg className="s3-mark-bar s3-mark-bar--end" viewBox="714 0 17 88" aria-hidden="true">
            <rect x="718.86" y="7" width="6.41" height="75.25" rx="1" /><path d="M722.04 77.39 729.3 85.27 714.87 85.3Z" />
          </svg>
        </span>
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
    // A intro (pontos se formando) não toca sozinha: começa escondida e só
    // toca uma vez, quando a entrada em combo da seção 2 dispara 's2:tv-play'
    // (useManifestoS2Enter) — mais lenta que a do protótipo, e subir não apaga.
    let playRequested = false
    const onPlay = () => {
      playRequested = true
      sceneRef.current?.play()
    }
    canvas.addEventListener('s2:tv-play', onPlay)
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const instance = mountDitherTV(canvas, {
        url: tvUrl, palette: TV_PALETTE, autoPlay: false, revealDuration: 2.8, spinDuration: 3.4,
      })
      sceneRef.current = instance
      canvas.tv = instance // o pin lateral (useManifestoHorizontal) gira a TV
      dispose = instance.dispose
      if (playRequested) instance.play()
    }, { rootMargin: '50% 0px' })
    observer.observe(canvas)
    return () => {
      canvas.removeEventListener('s2:tv-play', onPlay)
      observer.disconnect()
      dispose?.()
      delete canvas.tv
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

// Item riscado da seção 2: entra com o mesmo decoder da Header quando
// useManifestoS2Enter dispara 's2:decode' nele (até lá fica escondido).
function DecodeItem({ text, className }) {
  const ref = useRef(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const el = ref.current
    const onDecode = () => setActive(true)
    el.addEventListener('s2:decode', onDecode)
    return () => el.removeEventListener('s2:decode', onDecode)
  }, [])
  return <DecodeText ref={ref} value={text} active={active} className={className} />
}

export function Manifesto() {
  const { t, lang } = useLanguage()
  const { label, statement, without, who } = t.manifesto
  const [first, second, third] = statement
  const rootRef = useRef(null)
  useManifestoHorizontal(rootRef)
  useManifestoIntro(rootRef)
  useManifestoS2Enter(rootRef)

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
                  <span className="ms-myti" dangerouslySetInnerHTML={MYTI_HTML} />
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
            {initialPiece(without.initial)
              ? <span className="s2-initial" dangerouslySetInnerHTML={initialPiece(without.initial)} />
              : <span className="s2-initial">{without.initial}</span>}
            <span className="s2-rest">{without.rest}</span>
            {without.items.map((item, i) => (
              <DecodeItem key={item} text={item} className={`s2-item s2-item--${i + 1}`} />
            ))}
          </div>
          {/* Recipiente (contorno + texto vermelho) que enche de "água" vermelha
              com texto branco por cima — .s2-cue-fill, nível em --fill. */}
          <span className="s2-cue">
            <span className="s2-cue-label">
              {without.cue}
              <span className="s2-cue-arrow" aria-hidden="true" />
            </span>
            <span className="s2-cue-fill" aria-hidden="true">
              <span className="s2-cue-label">
                {without.cue}
                <span className="s2-cue-arrow" />
              </span>
            </span>
          </span>
        </div>

        <div className="s2-group s2-group--tv" aria-hidden="true">
          <DitherTV />
          <img className="s2-smiley" src={smileyImg} alt="" />
          <div className="s2-search">
            <img className="s2-search-box" src={searchBoxImg} alt="" />
            <span className="s2-search-text" data-text="set:mytigency.com">set:mytigency.com</span>
            <img className="s2-search-cursor" src={searchCursorImg} alt="" />
          </div>
        </div>

        {/* Metade de baixo do traço A (escala da seção 2), que segue até o disco do mapa da seção 3. */}
        <span className="s2-line s2-line-a" aria-hidden="true" dangerouslySetInnerHTML={LINE_A_LOW} />
        <span className="s2-line s2-line-b" aria-hidden="true" dangerouslySetInnerHTML={LINE_B_HTML} />
      </section>

      {/* Metade de cima do traço A, na escala da seção 1 (ancorada no +). */}
      <div className="ms-frame" aria-hidden="true">
        <span className="ms-line-a ms-line-a--top" dangerouslySetInnerHTML={LINE_A_TOP} />
        <span className="ms-line-a-elbow" dangerouslySetInnerHTML={LINE_A_ELBOW} />
      </div>

      <Section3 who={who} />

      <div className="manifesto-grid" aria-hidden="true" />
      </div>
    </div>
  )
}
