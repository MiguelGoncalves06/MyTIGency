import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { INTRO_PIN_QUERY, introPinDuration, lineAPen } from '../utils/manifestoScroll'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)

// Animações da seção 1 do Manifesto, todas scroll-scrubbed (posição = função
// do scroll, reversível — família 1 do myt-motion). Estado padrão no CSS é o
// FINAL; os fromTo daqui só criam o estado inicial quando há motion, então
// reduced-motion (e sem JS) chega direto na composição pronta.
//   Chegada (enquanto a seção sobe): Ethos sobe de baixo · traço de lápis da
//     esquerda pra direita.
//   Pin de entrada (desktop): o bloco para com a frase no centro por
//     INTRO_PIN_VH de tela e o resto acontece parado, sem a frase se mover
//     enquanto é lida. Sem pin (mobile), a mesma sequência corre subindo.
//   Entrada (frase): frase
//     sai de opacidade baixa e pinta palavra por palavra · elipse circula o
//     "MyTIgency," enquanto ele pinta · alvo trava como radar quando a 2ª
//     linha começa · caixa vermelha varre "apresenta." · círculos do MyTi
//     carimbam um a um · letras do CONDUZ assentam fechando o espaçamento ·
//     sticker "+" cai girando e cola (de onde o traço A vai nascer).
//   Saída (deixando a seção rumo à 2):
//     seta do CONDUZ gira pra ↘ · mão gira apontando pra baixo · traço A é
//     desenhado como caneta a partir do "+" e segue até o pin da seção 2.
//   Ambiente (só desktop com mouse): a mão acompanha o cursor por poucos px.
// Medidas por offsetTop (layout puro) + a geometria da varredura Hero→Marquee:
// a entrada acontece enquanto o .reveal-panel ainda sobe por transform, então
// "quando o elemento está a X% da tela" precisa contar esse deslocamento.
const WORD_DIM = 0.15
// Espelho de useHeroMarqueeReveal (peek da marquee no fim da Hero).
const REVEAL_MOBILE_QUERY = '(max-width: 820px)'
const REVEAL_MOBILE_PEEK = 10
// Pintura das palavras dentro da timeline da frase (0–1): uma "onda" — cada
// palavra leva WORD_DUR pra ganhar cor e começa bem antes da anterior
// terminar, até a última acabar em PAINT_END.
const PAINT_AT = 0.02
const PAINT_END = 0.66
const WORD_DUR = 0.26
// Inércia: o efeito continua deslizando ~1.2s até alcançar o scroll, em vez
// de parar seco junto com ele — é o que dá a sensação de fluidez.
const SCRUB = 1.2

export function useManifestoIntro(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const q = (sel) => root.querySelector(sel)
    const content = q('.ms-content')
    const ms2 = q('.ms2')
    if (!content || !ms2) return undefined

    const docTop = (el) => {
      let y = 0
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop
      return y
    }
    const vh = () => window.innerHeight
    const spacer = document.querySelector('.reveal-spacer')
    const marquee = document.querySelector('.marquee')
    // Rolagem em que o ponto `y` (layout) aparece a `at` (0–1) da altura da
    // tela. Durante a varredura (scroll S..S+D) o painel está deslocado por
    // fromY·(1−p); fora dela, posição visual = layout.
    const when = (y, at) => () => {
      const target = y() - vh() * at
      if (!spacer?.classList.contains('reveal-spacer--active') || !marquee) return target
      const S = docTop(spacer)
      const D = spacer.offsetHeight
      const heroH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hero-h')) || vh()
      const peek = window.matchMedia(REVEAL_MOBILE_QUERY).matches ? REVEAL_MOBILE_PEEK : marquee.offsetHeight
      const fromY = heroH - peek - D
      if (target >= S + D) return target // já assentado
      const s = (target + fromY * (1 + S / D)) / (1 + fromY / D)
      return s < S ? target + fromY : s
    }
    const contentTop = () => docTop(content)
    const contentMid = () => docTop(content) + content.offsetHeight / 2
    const ms2Top = () => docTop(ms2)
    // Mesmo início do pin lateral (useManifestoHorizontal): centro dos grupos
    // da seção 2 a 56% da tela.
    const pinStart = () => {
      let top = Infinity
      let bottom = -Infinity
      ms2.querySelectorAll('.s2-group').forEach((g) => {
        top = Math.min(top, g.offsetTop)
        bottom = Math.max(bottom, g.offsetTop + g.offsetHeight)
      })
      return docTop(ms2) + (top + bottom) / 2 - vh() * 0.56
    }

    // MyTi: cada círculo + sua letra num <g> próprio, pra carimbar um por vez.
    // Gira/escala em torno do centro do círculo — as elipses já têm rotate()
    // no atributo, então o transform vai no <g>, não nelas.
    const myti = q('.ms-myti svg')
    if (myti && !myti.querySelector('.ms-stamp')) {
      const kids = [...myti.children]
      for (let i = 0; i + 1 < kids.length; i += 2) {
        if (kids[i].tagName !== 'ellipse') continue
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        g.setAttribute('class', 'ms-stamp')
        myti.insertBefore(g, kids[i])
        g.append(kids[i], kids[i + 1])
      }
    }

    const mm = gsap.matchMedia()
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', pinned: INTRO_PIN_QUERY }, (ctx) => {
      if (!ctx.conditions.motion) return undefined
      const { pinned } = ctx.conditions
      // Fim da varredura Hero→Marquee: antes disso o painel ainda sobe por
      // transform e um pin não ficaria parado de verdade.
      const sweepEnd = () => (spacer?.classList.contains('reveal-spacer--active') ? docTop(spacer) + spacer.offsetHeight : 0)
      const pinDur = () => (pinned ? introPinDuration() : 0)
      // Frase: com pin, começa com a frase no centro (e a Marquee assentada)
      // e dura o pin inteiro; sem pin, corre enquanto a frase sobe.
      const phraseStart = () => (pinned ? Math.max(when(contentMid, 0.5)(), sweepEnd()) : when(contentMid, 0.75)())
      const phraseEnd = () => (pinned ? phraseStart() + pinDur() : when(contentMid, 0.42)())
      // A pintura começa ANTES do pin (frase ainda a ~72% da tela): quando o
      // bloco trava, a frase já está ganhando cor — o pin dá foco a algo em
      // andamento, em vez de travar com nada acontecendo.
      const paintStart = () => (pinned ? Math.min(when(contentMid, 0.72)(), phraseStart() - 1) : phraseStart())

      const words = [...root.querySelectorAll('.ms-statement .ms-w')]
      const wordStagger = (PAINT_END - PAINT_AT - WORD_DUR) / Math.max(1, words.length - 1)
      const wordAt = (i) => PAINT_AT + wordStagger * Math.max(0, i)
      const brandIndex = words.indexOf(q('.ms-brand'))
      // primeira palavra da 2ª linha ("site" / "never") — onde o alvo trava
      const line2Index = words.indexOf(root.querySelectorAll('.ms-statement .ms-line')[1]?.querySelector('.ms-w'))
      const strokeMask = q('.ms-brand-stroke mask path')

      /* ---------- chegada ---------- */
      const arrive = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: content,
          start: when(contentTop, 0.92),
          end: phraseStart,
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      })
      // Ethos: sobe de dentro de uma "fresta" (clip de baixo pra cima), com
      // um leve giro que assenta — como uma etiqueta sendo colada.
      arrive.fromTo('.ms-label', { yPercent: 110, rotation: -6, clipPath: 'inset(100% 0% 0% 0%)' },
        { yPercent: 0, rotation: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: 'power3.out' }, 0)
      // Traço de lápis: da esquerda pra direita, logo atrás do Ethos.
      arrive.fromTo('.ms-eyebrow-line', { clipPath: 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65, ease: 'power1.inOut' }, 0.3)

      /* ---------- frase (com o bloco fixado, no desktop) ---------- */
      const enter = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: paintStart,
          end: phraseEnd,
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      })
      // Pin de entrada (separado da timeline, que começa antes dele): fixa o
      // bloco do Manifesto inteiro (o traço A emenda as seções 1 e 2), por
      // transform — mesmo motivo do pin lateral: o .reveal-panel pode
      // carregar transform/will-change.
      if (pinned) {
        ScrollTrigger.create({
          trigger: root,
          start: phraseStart,
          end: phraseEnd,
          pin: true,
          pinType: 'transform',
          invalidateOnRefresh: true,
        })
      }
      // Estado inicial explícito dos grupos com stagger: o immediateRender de
      // um fromTo com stagger numa timeline só aplica o "from" ao 1º elemento
      // (os outros começam depois do tempo 0) — a frase nascia já pintada.
      const chars = root.querySelectorAll('.ms-lead .ms-ch')
      const charX = (i) => `${0.12 * (i + 1)}em`
      gsap.set(words, { opacity: WORD_DIM, y: '0.06em', filter: 'blur(3px)' })
      gsap.set(chars, { opacity: WORD_DIM, x: charX })
      // Frase: onda de tinta em ordem de leitura — cada palavra ganha cor
      // devagar, entrando em foco e assentando 1–2px, sobreposta à próxima.
      enter.fromTo(words, { opacity: WORD_DIM, y: '0.06em', filter: 'blur(3px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: WORD_DUR, stagger: wordStagger, ease: 'sine.inOut' }, PAINT_AT)
      // Elipse: circula o "MyTIgency," no mesmo ritmo lento da pintura dele,
      // começando um pouco depois e terminando um pouco além.
      if (strokeMask) {
        enter.fromTo(strokeMask, { drawSVG: '0%' }, { drawSVG: '100%', duration: WORD_DUR * 1.6, ease: 'sine.inOut' }, wordAt(brandIndex) + 0.03)
      }
      // Alvo: gira um quarto de volta e assenta, sem salto — no ritmo da onda.
      enter.fromTo('.ms-target', { rotation: -90, scale: 0.75, opacity: WORD_DIM },
        { rotation: 0, scale: 1, opacity: 1, duration: WORD_DUR, ease: 'power3.out' }, Math.max(0, wordAt(line2Index) - 0.03))
      // Caixa do "apresenta.": varre da esquerda pra direita e, na mesma
      // frente, o texto troca de cinza pra branco (--hl no CSS), depois que
      // a palavra já ganhou cor.
      enter.fromTo('.ms-highlight', { '--hl': 0 }, { '--hl': 1, duration: 0.24, ease: 'power2.inOut' }, 0.5)
      // MyTi: os 4 círculos carimbam um a um (giram, passam do tamanho, colam).
      root.querySelectorAll('.ms-stamp').forEach((g, i) => {
        const e = g.querySelector('ellipse')
        const svgOrigin = `${e.getAttribute('cx')} ${e.getAttribute('cy')}`
        enter.fromTo(g, { scale: 0, rotation: -35, opacity: 0, svgOrigin },
          { scale: 1, rotation: 0, opacity: 1, svgOrigin, duration: 0.09, ease: 'back.out(2.2)' }, 0.58 + i * 0.05)
      })
      // CONDUZ: letras chegam afastadas e assentam da esquerda pra direita.
      enter.fromTo(chars, { opacity: WORD_DIM, x: charX },
        { opacity: 1, x: 0, duration: 0.14, stagger: 0.025, ease: 'power3.out' }, 0.64)
      // Sticker "+": cai girando e cola — logo antes do traço A nascer dele.
      enter.fromTo('.ms-plus', { yPercent: -180, rotation: -150, scale: 1.6, opacity: 0 },
        { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.14, ease: 'back.out(1.8)' }, 0.86)

      /* ---------- saída ---------- */
      // Tudo daqui pra frente soma a duração do pin de entrada.
      const leave = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: content,
          start: phraseEnd,
          end: () => Math.max(when(ms2Top, 0.55)() + pinDur(), phraseEnd() + 1),
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      })
      leave.fromTo('.ms-arrow', { rotation: 0 }, { rotation: 90, duration: 0.6, ease: 'power2.inOut' }, 0)
      leave.fromTo('.ms-hand', { rotation: 0 }, { rotation: 50, duration: 0.8, ease: 'power2.inOut' }, 0.1)

      // Traço A como caneta: os três pedaços (cima, cotovelo, baixo) usam a
      // mesma linha-guia, então um drawSVG só, do "+" até o disco do mapa da
      // seção 3, já dentro do pin lateral — onde e até que fração quem mede é
      // o pin (lineAPen, useManifestoHorizontal); refreshPriority mais baixo
      // para ler a medida já atualizada.
      gsap.fromTo(root.querySelectorAll('.la-guide'), { drawSVG: '0%' }, {
        drawSVG: () => `${lineAPen.frac * 100}%`,
        ease: 'none',
        scrollTrigger: {
          trigger: content,
          start: phraseEnd,
          end: () => Math.max(lineAPen.end || pinStart() + pinDur(), phraseEnd() + 1),
          scrub: SCRUB,
          invalidateOnRefresh: true,
          refreshPriority: -2,
        },
      })

      // Mão acompanha o mouse por poucos px, com peso (atraso de 1.2s, nunca
      // 1:1). Só com mouse: em toque não existe, por decisão — é ambiente,
      // não carrega informação.
      if (!window.matchMedia('(pointer: fine)').matches) return undefined
      const hand = q('.ms-hand')
      const qx = gsap.quickTo(hand, 'x', { duration: 1.2, ease: 'power3' })
      const qy = gsap.quickTo(hand, 'y', { duration: 1.2, ease: 'power3' })
      const onMove = (e) => {
        qx((e.clientX / window.innerWidth - 0.5) * 18)
        qy((e.clientY / window.innerHeight - 0.5) * 12)
      }
      window.addEventListener('pointermove', onMove)
      return () => window.removeEventListener('pointermove', onMove)
    })

    return () => mm.revert()
  }, [rootRef])
}
