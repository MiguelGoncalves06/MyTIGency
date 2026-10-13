import { useEffect, useRef } from 'react'
import { useLenis } from 'lenis/react'
import { useLanguage } from '../context/LanguageContext'
import { mountDitherTV } from '../utils/tv3d'
import { useManifestoHorizontal, DESKTOP_QUERY } from '../hooks/useManifestoHorizontal'
import { useManifestoIntro } from '../hooks/useManifestoIntro'
import { useManifestoS2Enter } from '../hooks/useManifestoS2Enter'
import { NosGroup } from './ManifestoNos'
import handImg from '../assets/mao-halftone.png'
import targetImg from '../assets/alvo.png'
import arrowImg from '../assets/seta.png'
import plusImg from '../assets/plus.svg'
import mytiRaw from '../assets/MyTi.svg?raw'
import logoRaw from '../assets/logo.svg?raw'
import ethosLineImg from '../assets/ethos-drawn.svg'
import { lineAPiece } from '../utils/manifestoLineA'
// Sticker acima do PC (badge-estrela do kit MYT). Inline: só a estrela de
// fora (.s2-smiley-ring) gira com o scroll; logo, texto e brilhos ficam parados.
import stickerRaw from '../assets/selo-carinha-preto.svg?raw'
import searchBoxImg from '../assets/s2-busca.png'
import searchCursorImg from '../assets/s2-cursor.svg'
import tvUrl from '../assets/pc-terrarium.min.glb?url'
// Inline (não <img>): o traço vive numa <mask> com um <path> — é esse path
// que vai receber stroke-dashoffset quando a elipse passar a se desenhar.
import brandStrokeRaw from '../assets/myt-stroke.svg?raw'
import brushRaw from '../assets/s4-brush.svg?raw'
// kit MYT: composição dos cantos da cena A
import sealImg from '../assets/kit/selo-feito-branco.svg'
import ticketImg from '../assets/kit/ticket-aprovado.svg'
import tapeImg from '../assets/kit/faixa-tile.svg'
import sparkImg from '../assets/kit/brilho.svg'
import spark2Img from '../assets/kit/brilho-duplo.svg'
import starImg from '../assets/kit/estrela.svg'

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
const STICKER_HTML = { __html: stickerRaw.replace('<polygon ', '<polygon class="s2-smiley-ring" ') }
const MYTI_HTML = { __html: mytiRaw }
const LINE_A_TOP = { __html: lineAPiece('la-top') }
const LINE_A_ELBOW = { __html: lineAPiece('la-elbow', '0 409 1348 162') }
const LINE_A_LOW = { __html: lineAPiece('la-low', '0 0 2135 1216') }

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

// Seção 3: a composição visual é montada por utils/manifestoSplit.js dentro de
// .s3-vis (as palavras viram letras animadas — DOM fora do React, remontado
// quando o idioma muda). Aqui ficam a frase para leitores de tela e os textos
// (data-who) que a montagem usa. Posição/tempo: useManifestoHorizontal.
function Section3({ who }) {
  return (
    <section className="s3" aria-labelledby="s3-title">
      <h2 className="sr-only" id="s3-title">{who.title}</h2>
      <p className="sr-only">{who.note}</p>
      <div className="s3-vis" aria-hidden="true" data-who={JSON.stringify(who)} />
    </section>
  )
}

// Segundo ato (fundo #141414): cortina (a caneta circula, a tinta preenche e
// toma a tela) + cena A. Fica dentro do bloco fixado e fora da trilha (não
// anda de lado); no desktop cobre a tela durante o pin.
// Estado: utils/manifestoAct2.js, tempo: useManifestoHorizontal.

// Pincel do marcador (s4-brush.svg, 353×19, reto): risca "promessas" e,
// dobrado ao longo de uma elipse à mão, circula "mostrar" — a mesma linha.
const BRUSH_D = brushRaw.match(/ d="([^"]+)"/)[1]
const BRUSH_W = 353
const BRUSH_MID = 9.5
// Elipse em volta de "mostrar" (viewBox 300×100, perto da proporção da
// palavra): ~1,15 volta, as duas voltas não coincidem.
const RING_PTS = (() => {
  const pts = []
  for (let i = 0; i <= 240; i++) {
    const u = i / 240
    const a = Math.PI * 0.9 + u * 1.15 * Math.PI * 2
    const g = 1 + u * 0.05
    pts.push([150 + Math.cos(a) * 140 * g, 50 + Math.sin(a) * 42 * g - u * 4])
  }
  return pts
})()
const RING_LINE = `M${RING_PTS.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`
// "Art brush": x do pincel → comprimento ao longo da elipse; y → distância da
// normal (espessura × RING_K). Cada par de coordenadas do path é levado.
const RING_K = 0.42
const RING_BRUSH = (() => {
  const cum = [0]
  for (let i = 1; i < RING_PTS.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(RING_PTS[i][0] - RING_PTS[i - 1][0], RING_PTS[i][1] - RING_PTS[i - 1][1]))
  }
  const total = cum[cum.length - 1]
  const at = (x, y) => {
    const s = Math.min(1, Math.max(0, x / BRUSH_W)) * total
    let i = 1
    while (i < cum.length - 1 && cum[i] < s) i++
    const [x0, y0] = RING_PTS[i - 1]
    const [x1, y1] = RING_PTS[i]
    const seg = cum[i] - cum[i - 1] || 1
    const f = (s - cum[i - 1]) / seg
    const tx = (x1 - x0) / seg
    const ty = (y1 - y0) / seg
    const n = (y - BRUSH_MID) * RING_K
    return [x0 + (x1 - x0) * f - ty * n, y0 + (y1 - y0) * f + tx * n]
  }
  const tok = BRUSH_D.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/g)
  let out = ''
  for (let i = 0; i < tok.length;) {
    if (/[MCLZ]/.test(tok[i])) { out += tok[i++]; continue }
    const [x, y] = at(+tok[i], +tok[i + 1])
    out += `${x.toFixed(2)} ${y.toFixed(2)} `
    i += 2
  }
  return out
})()
// Flor de seis pétalas (o asterisco orgânico), gira com o scroll
const PETALS = [0, 60, 120, 180, 240, 300]

function Graphic({ role }) {
  if (role === 'flower') {
    return (
      <svg className="ma-g ma-flower" viewBox="-50 -50 100 100">
        {PETALS.map((r) => <ellipse key={r} cx="0" cy="-23" rx="13" ry="25" transform={`rotate(${r})`} />)}
        <circle r="10" />
      </svg>
    )
  }
  // olho em dither que segue o cursor (utils/ditherEye.js)
  if (role === 'eye') return <canvas className="ma-g ma-eye" />
  return (
    <svg className="ma-g ma-arrow" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" />
      <path d="M32 68 68 32M40 32h28v28" />
    </svg>
  )
}

function Act2({ act }) {
  const { a } = act
  return (
    <section className="ms-act2" aria-labelledby="ma-a-title">
      {/* cortina: a tinta (pixels, canvas) por baixo da caneta (SVG) */}
      <canvas className="ma-ink" aria-hidden="true" />
      <svg className="ma-pen" aria-hidden="true"><path /></svg>
      {/* cantos da cena A (kit MYT): fita, ticket e brilhos (o selo mora na 1ª linha) */}
      <div className="ma-deco" aria-hidden="true">
        <div className="ma-d ma-tape" style={{ backgroundImage: `url(${tapeImg})` }} />
        <img className="ma-d ma-ticket" src={ticketImg} alt="" />
        <img className="ma-d ma-spark ma-spark--a" src={sparkImg} alt="" />
        <img className="ma-d ma-spark ma-spark--b" src={spark2Img} alt="" />
        <img className="ma-d ma-spark ma-spark--c" src={starImg} alt="" />
      </div>
      <div className="ma-scene ma-a">
        <h2 className="sr-only" id="ma-a-title">{a.sentence}</h2>
        <p className="ma-eyebrow" aria-hidden="true">{a.eyebrow}</p>
        <p className="ma-a-text" aria-hidden="true">
          {a.lines.map((line, i) => (
            <span className="ma-line" key={i}>
              {/* selo "Feito pela MYT": à esquerda de POR e PROMESSAS, entre as duas linhas */}
              {i === 0 && <img className="ma-d ma-seal" src={sealImg} alt="" />}
              {line.map(([text, role], j) => {
                if (!text) return <Graphic key={j} role={role} />
                const cls = ['ma-w', role && `ma-w--${role}`, /^[,.]/.test(text) && 'ma-w--tight'].filter(Boolean).join(' ')
                return (
                  <span key={j} className={cls}>
                    {text}
                    {role === 'strike' && (
                      <svg className="ma-strike" viewBox="0 0 353 19" preserveAspectRatio="none"><path d={BRUSH_D} /></svg>
                    )}
                    {role === 'show' && (
                      <svg className="ma-ring" viewBox="0 0 300 100" preserveAspectRatio="none">
                        {/* o pincel dobrado na elipse, revelado por uma "caneta" (máscara) que segue a elipse */}
                        <mask id="ma-ring-mask" maskUnits="userSpaceOnUse" x="-40" y="-40" width="380" height="180">
                          <path className="ma-ring-pen" d={RING_LINE} />
                        </mask>
                        <path className="ma-ring-art" d={RING_BRUSH} mask="url(#ma-ring-mask)" />
                      </svg>
                    )}
                  </span>
                )
              })}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

const TV_PALETTE = ['#1c1c1c', '#6e6e6e', '#bcbcbc', '#ffffff'] // "Cinza" do HANDOFF
// Modelo: "PC terrário" (modelo 7 do /lab/), só a malha do computador — o
// conteúdo do terrário saiu do GLB (fica atrás da tela MyTi e é IP de
// terceiros). Frente, material e vidro calibrados no LAB; a tela sintoniza o
// logo oficial (o do header) em branco. Créditos (CC BY 4.0)
// em public/creditos.html.
const TV_SCREEN_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoRaw.replace(/fill="black"/g, 'fill="white"'))}`
const TV_MODEL = {
  front: 0,
  colorBoost: 0.25,
  showScreen: true,
  screenShape: { CX: -0.15, CY: 0.175, HX: 0.41, HY: 0.3, Z0: 0.21, A: 0, B: 0, C: 0, OFFSET: 0.008, MARGIN: 1.03 },
}

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
        url: tvUrl, palette: TV_PALETTE, autoPlay: false, revealDuration: 2.8, spinDuration: 3.4, ...TV_MODEL,
        // a tela sintoniza o logo pelo pin lateral; sem ele (mobile), já sintonizada
        screenImage: TV_SCREEN_URL, tune: window.matchMedia(DESKTOP_QUERY).matches ? 0 : 1,
      })
      sceneRef.current = instance
      canvas.tv = instance // o pin lateral (useManifestoHorizontal) gira e sintoniza a TV
      dispose = instance.dispose
      if (playRequested) instance.play()
      canvas.dispatchEvent(new Event('s2:tv-ready'))
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
  // A posição do scroll também vai para a TV: a velocidade dele tira o
  // dither de foco (ver setScroll em tv3d.js).
  useLenis(({ scroll }) => {
    sceneRef.current?.setScroll(scroll)
    sceneRef.current?.setScrolling(true)
    clearTimeout(scrollSettleRef.current)
    scrollSettleRef.current = setTimeout(() => {
      sceneRef.current?.setScrolling(false)
    }, SCROLL_SETTLE_MS)
  })
  useEffect(() => () => clearTimeout(scrollSettleRef.current), [])

  return <canvas className="s2-tv" ref={canvasRef} aria-hidden="true" />
}

// section3/useHorizontal/withoutGroup: só os LABs trocam a seção 3, o pin
// lateral ou o grupo da esquerda da seção 2 (lab/manifesto-sem/), para testar
// uma peça nova sobre o Manifesto real; o site usa o padrão.
export function Manifesto({ section3, useHorizontal = useManifestoHorizontal, withoutGroup }) {
  const { t, lang } = useLanguage()
  const { label, statement, who } = t.manifesto
  const [first, second, third] = statement
  const rootRef = useRef(null)
  useHorizontal(rootRef, lang) // idioma novo = seção 3 remontada com os textos dele
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
        {withoutGroup ?? <NosGroup />}

        <div className="s2-group s2-group--tv" aria-hidden="true">
          <DitherTV />
          <span className="s2-smiley" dangerouslySetInnerHTML={STICKER_HTML} />
          <div className="s2-search">
            <img className="s2-search-box" src={searchBoxImg} alt="" />
            <span className="s2-search-text" data-text="set:mytigency.com">set:mytigency.com</span>
            <img className="s2-search-cursor" src={searchCursorImg} alt="" />
          </div>
        </div>

        {/* Metade de baixo do traço A (escala da seção 2), que segue até o disco do mapa da seção 3. */}
        <span className="s2-line s2-line-a" aria-hidden="true" dangerouslySetInnerHTML={LINE_A_LOW} />
      </section>

      {/* Metade de cima do traço A, na escala da seção 1 (ancorada no +). */}
      <div className="ms-frame" aria-hidden="true">
        <span className="ms-line-a ms-line-a--top" dangerouslySetInnerHTML={LINE_A_TOP} />
        <span className="ms-line-a-elbow" dangerouslySetInnerHTML={LINE_A_ELBOW} />
      </div>

      {section3 ?? <Section3 who={who} />}

      <div className="manifesto-grid" aria-hidden="true" />
      </div>
      <Act2 act={t.manifesto.act2} />
    </div>
  )
}
