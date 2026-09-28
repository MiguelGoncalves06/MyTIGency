import { useLayoutEffect } from 'react'
import { useLenis } from 'lenis/react'

// A seção vive dentro de .reveal-panel, que é deslocado por `transform`
// durante a transição da Marquee (useHeroMarqueeReveal). `offsetTop` é
// layout puro (imune a transform), então cada linha tem sua posição
// cacheada uma vez; a cada tick só a seção é medida ao vivo (1 leitura de
// geometria, não N+1) e a posição de cada linha vem de soma simples —
// sempre correta mesmo com o painel em movimento, sem o custo de reler
// todo mundo.
const START_VH = 0.8 // linha começa a pintar com o topo em 80% da viewport
const END_VH = 0.38 // termina de pintar em 38%
// Dentro da janela de progresso da própria linha, cada palavra ocupa uma
// fatia deslocada (esquerda pinta antes da direita) em vez de a linha
// inteira trocar de cor em bloco — sensação de tinta se espalhando.
const WORD_STAGGER = 0.6

const GRID_SPEED = 0.08

const DIM_OPACITY = 0.55

function hexToRgb(hex) {
  const v = hex.trim().replace('#', '')
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

// Abaixo desta diferença de progresso a mudança de cor/opacidade é
// imperceptível — pula a escrita (a maioria das ~60 palavras já está 100%
// pintada ou 100% crua a qualquer momento; só 1-2 linhas estão de fato em
// transição). Puramente performance: nunca produz um valor final diferente,
// só evita reescrever o mesmo estado visual repetidas vezes.
const WRITE_EPSILON = 0.004

export function useManifestoReveal(sectionRef) {
  const lenis = useLenis()

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const lineEls = Array.from(section.querySelectorAll('[data-manifesto-line]'))
    const counter = section.querySelector('[data-manifesto-counter]')
    const gridLayer = section.querySelector('[data-manifesto-grid-layer]')
    if (lineEls.length === 0) return undefined

    // Reduced motion: CSS já entrega o estado final (texto legível, grid
    // parado) — só ajusta o contador, sem criar nenhuma transformação.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (counter) {
        const total = String(lineEls.length).padStart(2, '0')
        counter.textContent = `${total} / ${total}`
      }
      return undefined
    }

    const rootStyle = getComputedStyle(document.documentElement)
    const dim = hexToRgb(rootStyle.getPropertyValue('--ink-dim'))

    const lines = lineEls.map((el) => ({
      el,
      offsetTop: 0,
      target: hexToRgb(rootStyle.getPropertyValue(
        el.classList.contains('manifesto-line--accent') ? '--accent' : '--ink-soft',
      )),
      words: Array.from(el.querySelectorAll('[data-manifesto-word]'), (word) => ({ el: word, lastT: -1 })),
    }))

    let isVisible = true
    let textOffsetTop = 0

    // offsetTop é relativo ao offsetParent mais próximo — cacheado uma vez
    // (e recalculado no resize) porque não muda com o transform da Marquee,
    // só com reflow real (fonte carregando, largura da viewport).
    function measure() {
      lines.forEach((line) => { line.offsetTop = line.el.offsetTop })
      textOffsetTop = lines.length > 0 ? lines[0].el.parentElement.offsetTop : 0
    }

    function update() {
      if (!isVisible) return

      const vh = window.innerHeight
      const span = vh * (START_VH - END_VH)
      // Uma leitura de geometria só, reaproveitada pras linhas e pro grid —
      // ler de novo depois de já ter escrito estilo nas palavras força o
      // navegador a recalcular layout duas vezes por tick (medido via
      // trace: layout thrashing clássico leitura→escrita→leitura).
      const rect = section.getBoundingClientRect()
      const sectionTop = rect.top
      let activeCount = 0

      lines.forEach(({ offsetTop, target, words }) => {
        const top = sectionTop + textOffsetTop + offsetTop
        const lineT = clamp01((vh * START_VH - top) / span)
        if (lineT > 0.5) activeCount += 1

        const n = words.length
        words.forEach((word, i) => {
          const wordStart = (i / n) * (1 - WORD_STAGGER)
          const wordEnd = wordStart + WORD_STAGGER
          const wordT = clamp01((lineT - wordStart) / (wordEnd - wordStart))
          if (Math.abs(wordT - word.lastT) < WRITE_EPSILON) return
          word.lastT = wordT
          const r = lerp(dim[0], target[0], wordT) | 0
          const g = lerp(dim[1], target[1], wordT) | 0
          const b = lerp(dim[2], target[2], wordT) | 0
          word.el.style.color = `rgb(${r}, ${g}, ${b})`
          word.el.style.opacity = lerp(DIM_OPACITY, 1, wordT).toFixed(2)
        })
      })

      if (counter) {
        const current = Math.max(1, Math.min(lines.length, activeCount || 1))
        counter.textContent = `${String(current).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}`
      }

      if (gridLayer) {
        const centerOffset = rect.top + rect.height / 2 - vh / 2
        gridLayer.style.transform = `translate3d(0, ${(-centerOffset * GRID_SPEED).toFixed(1)}px, 0)`
      }
    }

    measure()
    update()

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      if (isVisible) update()
    }, { rootMargin: '20% 0px 20% 0px' })
    observer.observe(section)

    const resizeObserver = new ResizeObserver(() => { measure(); update() })
    resizeObserver.observe(section)

    // Fonte da verdade única do scroll (ver DESIGN.md/myt-visual-qa: Lenis é
    // a única fonte de smoothing) — nada de RAF livre rodando a 60fps parado.
    lenis?.on('scroll', update)

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      lenis?.off('scroll', update)
      lines.forEach(({ words }) => {
        words.forEach(({ el }) => { el.style.color = ''; el.style.opacity = '' })
      })
      if (gridLayer) gridLayer.style.transform = ''
    }
  }, [sectionRef, lenis])
}
