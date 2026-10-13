import { useEffect, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import { useLanguage } from '../context/LanguageContext'
import { mountDitherTV } from '../utils/tv3d'
import { useManifestoHorizontal, DESKTOP_QUERY } from '../hooks/useManifestoHorizontal'
import { useManifestoIntro } from '../hooks/useManifestoIntro'
import { useManifestoS2Enter } from '../hooks/useManifestoS2Enter'
import { DecodeText } from './DecodeText'
import handImg from '../assets/mao-halftone.png'
import targetImg from '../assets/alvo.png'
import arrowImg from '../assets/seta.png'
import plusImg from '../assets/plus.svg'
import mytiRaw from '../assets/MyTi.svg?raw'
import logoRaw from '../assets/logo.svg?raw'
import ethosLineImg from '../assets/ethos-drawn.svg'
import { initialPiece, lineAPiece, lineBPiece } from '../utils/manifestoLineA'
import ornamentImg from '../assets/ornamento-ascii.png'
// Sticker acima do PC (badge-estrela do kit MYT). Inline: só a estrela de
// fora (.s2-smiley-ring) gira com o scroll; logo, texto e brilhos ficam parados.
import stickerRaw from '../assets/selo-carinha-preto.svg?raw'
import searchBoxImg from '../assets/s2-busca.png'
import searchCursorImg from '../assets/s2-cursor.svg'
import tvUrl from '../assets/pc-terrarium.min.glb?url'
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
const STICKER_HTML = { __html: stickerRaw.replace('<polygon ', '<polygon class="s2-smiley-ring" ') }
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

// section3/useHorizontal: só o LAB (lab/secao3/s2/) troca a seção 3 e o pin
// lateral, para testar outra seção 3 sobre a seção 2 real; o site usa o padrão.
export function Manifesto({ section3, useHorizontal = useManifestoHorizontal }) {
  const { t, lang } = useLanguage()
  const { label, statement, without, who } = t.manifesto
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
          <span className="s2-smiley" dangerouslySetInnerHTML={STICKER_HTML} />
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

      {section3 ?? <Section3 who={who} />}

      <div className="manifesto-grid" aria-hidden="true" />
      </div>
    </div>
  )
}
