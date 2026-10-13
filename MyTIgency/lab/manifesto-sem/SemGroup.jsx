// Grupo da esquerda da seção 2, layout novo: "NÓS / conversamos e resolvemos
// tudo." com a lista "Sem …" virando a prova miúda (mono) embaixo.
// Mesmas classes-âncora do grupo atual (s2-group--without, s2-item, s2-cue):
// useManifestoS2Enter continua dirigindo o decoder dos itens e o botão que
// enche; o pin lateral continua medindo .s2-group. Posições em px de design
// (--g), como o resto da seção 2 — ver sem.css.
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { useLanguage } from '../../src/context/LanguageContext'
import { DecodeItem } from '../../src/components/ManifestoNos'
import ornamentImg from '../../src/assets/ornamento-ascii.png'
import { VARIANTS } from './variants'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)

// Texto do layout. Itens = os mesmos do site (strings.js), com o "Sem".
const COPY = {
  pt: { big: 'Nós', lines: ['conversamos', 'e resolvemos', 'tudo.'], no: 'Sem', sentence: 'Nós conversamos e resolvemos tudo. Sem gerente de conta, sem terceirizar, sem intermediários.' },
  en: { big: 'We', lines: ['talk it', 'through and', 'solve it.'], no: 'No', sentence: 'We talk it through and solve it. No account manager, no outsourcing, no middlemen.' },
}

// Auréola: elipse feita à mão, ~1,16 volta (o fim passa por cima do começo e
// as duas voltas não coincidem — o traço duplo do layout). Um path só, para a
// caneta (drawSVG) desenhar de uma vez. viewBox 340×110.
const HALO_D = (() => {
  const pts = []
  for (let i = 0; i <= 140; i++) {
    const u = i / 140
    const a = Math.PI * 1.08 + u * 1.16 * Math.PI * 2 // começa à esquerda
    const grow = 1 + u * 0.07 // a 2ª volta abre um pouco
    pts.push(`${(170 + Math.cos(a) * 160 * grow).toFixed(1)} ${(56 + Math.sin(a) * 44 * grow - u * 6).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
})()
// Estrela y2k: 4 pontas com lados bem côncavos; k = quão fina fica a ponta.
const starD = (rx, ry, k) => {
  const c = (x, y) => `${(x * k).toFixed(2)} ${(y * k).toFixed(2)}`
  return `M0 ${-ry}C${c(rx, -ry)} ${c(rx, -ry)} ${rx} 0C${c(rx, ry)} ${c(rx, ry)} 0 ${ry}`
    + `C${c(-rx, ry)} ${c(-rx, ry)} ${-rx} 0C${c(-rx, -ry)} ${c(-rx, -ry)} 0 ${-ry}Z`
}

export function SemGroup({ variant = '0' }) {
  const { t, lang } = useLanguage()
  const { items, cue } = t.manifesto.without
  const c = COPY[lang] ?? COPY.pt
  const ref = useRef(null)
  useSemMotion(ref)
  const v = VARIANTS[variant] ?? VARIANTS[0]
  const Extra = v.El

  return (
    <div className="s2-group s2-group--without ls" ref={ref} data-variant={variant} data-hide-list={v.hideList || undefined} data-hide-arrow={v.hideArrow || undefined}>
      {/* ornamento ASCII só na versão atual; as outras trocam por um elemento de UI */}
      {!Extra && <img className="s2-ornament" src={ornamentImg} alt="" aria-hidden="true" />}
      <h3 className="sr-only">{c.sentence}</h3>
      <div className="ls-art" aria-hidden="true">
        <svg className="ls-halo" viewBox="0 0 340 110" preserveAspectRatio="none"><path d={HALO_D} /></svg>
        {/* vermelha cortando a ponta direita da auréola; preta e fina sobre o acento */}
        <svg className="ls-spark" viewBox="-50 -60 100 120"><path d={starD(46, 58, 0.1)} /></svg>
        <svg className="ls-glint" viewBox="-40 -50 80 100"><path d={starD(38, 48, 0.035)} /></svg>
        <i className="ls-cross ls-cross--a" />
        <i className="ls-cross ls-cross--b" />
        <i className="ls-target" />
        <span className="ls-big"><b>{c.big}</b></span>
        <span className="ls-lines">
          {c.lines.map((l) => <span className="ls-line" key={l}><span><b>{l}</b></span></span>)}
        </span>
        <svg className="ls-under" viewBox="0 0 260 30" preserveAspectRatio="none">
          {/* passada e volta do pincel, abaixo da linha de base (sem encostar nas letras) */}
          <path className="ls-under-a" d="M4 20C80 13 170 8 256 5" />
          <path className="ls-under-b" d="M236 10C170 15 100 20 26 26" />
        </svg>
        <svg className="ls-star" viewBox="-20 -20 40 40">
          <path d="M0-17V17M-14.7-8.5 14.7 8.5M-14.7 8.5 14.7-8.5" />
        </svg>
        <span className="ls-no">
          {items.map((item) => <DecodeItem key={item} text={`${c.no} ${item}.`} className="s2-item ls-item" />)}
        </span>
        <svg className="ls-play" viewBox="0 0 84 30">
          {[0, 28, 56].map((x) => <path key={x} d={`M${x} 0h6v4h4v4h4v4h4v6h-4v4h-4v4h-4v4h-6z`} />)}
        </svg>
        {/* Seta: sai da borda, dá uma laçada e aponta para a lista */}
        {Extra && <Extra lang={lang} items={items} />}
        <svg className="ls-arrow" viewBox="0 0 300 160">
          {/* entra pela borda, sobe, volta numa laçada longa e segue RETA até a lista */}
          <path className="ls-arrow-body" d="M-30 96C20 84 84 64 98 70C112 78 54 128 24 148C10 157 8 150 28 140L290 42" />
          <path className="ls-arrow-head" d="M256 44 290 42 268 70" />
        </svg>
      </div>
      {/* Botão = o mesmo recipiente que enche (useManifestoS2Enter) */}
      <span className="s2-cue">
        <span className="s2-cue-label">
          {cue}
          <span className="s2-cue-arrow" aria-hidden="true" />
        </span>
        <span className="s2-cue-fill" aria-hidden="true">
          <span className="s2-cue-label">
            {cue}
            <span className="s2-cue-arrow" />
          </span>
        </span>
      </span>
    </div>
  )
}

// Entrada, uma vez, quando o grupo chega (mesmo gatilho do título atual em
// useManifestoS2Enter — os itens decodificam 1.2s depois, a partir de lá):
// o NÓS cai com peso e carimba; a auréola é desenhada à caneta e o brilho
// acende no fim dela; as linhas sobem uma a uma na ordem de leitura e o
// sublinhado risca o "tudo.". A seta acompanha o scroll (reversível), como o
// traço B: é ela que aponta para a lista. Reduced motion: nada roda, o CSS
// já mostra o estado final.
function useSemMotion(ref) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const q = (s) => root.querySelector(s)
    const qa = (s) => root.querySelectorAll(s)
    const docTop = (el) => {
      let y = 0
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop
      return y
    }
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const big = q('.ls-big')
      const halo = q('.ls-halo path')
      const spark = q('.ls-spark')
      const lines = qa('.ls-line > span')
      const under = qa('.ls-under path')
      const marks = qa('.ls-cross, .ls-target, .ls-glint')
      const star = q('.ls-star')
      const play = qa('.ls-play path')

      const tl = gsap.timeline({ paused: true })
      // cai com peso: acelera, achata no chão e volta com um quique curto
      tl.fromTo(big, { autoAlpha: 0, yPercent: -60, rotation: -6 },
        { autoAlpha: 1, yPercent: 0, rotation: 0, duration: 0.5, ease: 'power3.in' }, 0)
      tl.to(big, { scaleY: 0.86, scaleX: 1.06, duration: 0.08, ease: 'power1.out' })
      tl.to(big, { scaleY: 1, scaleX: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)' })
      tl.fromTo(halo, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'sine.inOut' }, 0.5)
      tl.fromTo(spark, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.4)' }, 1.25)
      tl.fromTo(marks, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.08 }, 0.6)
      tl.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.14 }, 0.62)
      tl.fromTo(under, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45, ease: 'power2.inOut', stagger: 0.12 }, 1.15)
      tl.fromTo(star, { autoAlpha: 0, rotation: -60 }, { autoAlpha: 1, rotation: 0, duration: 0.5, ease: 'power2.out' }, 1.2)
      // ▶▶▶ acende um a um: aponta para onde a página vai (o pin lateral)
      tl.fromTo(play, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: 0.16 }, 1.5)

      const enter = ScrollTrigger.create({
        trigger: root,
        start: () => docTop(root) - window.innerHeight * 0.8,
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => tl.play(),
      })

      const arrow = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: () => docTop(root) - window.innerHeight * 0.85,
          end: () => docTop(root) + root.offsetHeight / 2 - window.innerHeight * 0.56,
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      })
      arrow.fromTo(q('.ls-arrow-body'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'sine.inOut' })
      arrow.fromTo(q('.ls-arrow-head'), { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 0.2 })

      return () => {
        enter.kill()
        arrow.scrollTrigger?.kill()
        arrow.kill()
        tl.kill()
      }
    })
    return () => mm.revert()
  }, [ref])
}
