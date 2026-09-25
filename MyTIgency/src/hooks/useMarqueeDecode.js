import { useEffect } from 'react'

// Largura da faixa de decodificação em cada borda: proporcional à tela, pra
// transformação ter espaço (e tempo) de ser lida enquanto a faixa anda
const ZONE_RATIO = 0.2
const ZONE_MIN = 120
const ZONE_MAX = 380
// Quanto cada letra antecipa/atrasa em relação à vizinha — quebra a "frente"
// reta de transformação sem virar ruído (determinístico, não pisca)
const JITTER = 0.2
// Curva da progressão (< 1): os estágios legíveis (parecido → letra) ocupam
// a maior parte da faixa; '.' e vazio ficam só colados na borda, então o
// texto ainda existe quando toca a ponta em vez de sumir antes
const EASE = 0.5

// Estágio final antes da letra real: um caractere com o mesmo desenho
const LOOKALIKE = {
  a: '@', b: '8', c: '(', d: ')', e: '3', f: '+', g: '9', h: '#', i: '!',
  j: ']', k: '<', l: '|', m: '#', n: '^', o: '0', p: '?', q: '9', r: '/',
  s: '5', t: '7', u: 'v', v: 'u', w: '#', x: '%', y: '¥', z: '2',
  0: 'o', 1: 'l', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'b', 7: 't', 8: 'b', 9: 'g',
}
const PREFIX = [' ', '.', ':', '/']

function stagesFor(char) {
  const look = LOOKALIKE[char.normalize('NFD')[0].toLowerCase()]
  return look ? [...PREFIX, look, char] : [...PREFIX, char]
}

function hash(n) {
  const h = Math.sin(n * 12.9898) * 43758.5453
  return h - Math.floor(h)
}

// Letras da marquee se formam ao entrar pela direita e se desfazem ao sair
// pela esquerda, como um terminal. O estágio de cada letra vem da distância
// dela até a borda — não do tempo — então a transformação anda no ritmo do
// próprio scroll da faixa, sem "pop". Só os spans nas bordas são reescritos.
// Espera spans com `data-decode` e o texto original como único filho.
//
// Este hook também MOVE a faixa (no lugar da animação CSS `scrollLeft`):
// a animação CSS roda no compositor, e em execuções longas a posição pintada
// se descola da que o JS lê — as letras decodificavam num lugar que já não
// era o da tela, e o erro crescia com o tempo. Com posição e decodificação
// saindo do mesmo número no mesmo frame, elas não têm como divergir.
export function useMarqueeDecode(containerRef, trackRef, deps = []) {
  useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    // Mesma velocidade da animação CSS (lida dela, não duplicada aqui)
    const duration = parseFloat(getComputedStyle(track).animationDuration) * 1000 || 360000
    track.style.animation = 'none'
    const startTime = performance.now()

    let items = []
    let frameId = 0
    let isVisible = true
    let loopWidth = 0 // metade da faixa: o conteúdo é repetido, então -50% volta ao início
    let trackBase = 0 // left da faixa sem translate
    let offset = 0

    function measure() {
      const trackRect = track.getBoundingClientRect()
      loopWidth = trackRect.width / 2
      trackBase = trackRect.left - offset
      items = Array.from(track.querySelectorAll('[data-decode]'), (el, n) => {
        const text = el.dataset.decode
        el.textContent = text
        const rect = el.getBoundingClientRect()
        return {
          el,
          text,
          stages: Array.from(text, stagesFor),
          seed: n * 97,
          rel: rect.left - trackRect.left,
          width: rect.width,
          charW: rect.width / text.length,
          dirty: false,
        }
      })
    }

    function frame() {
      frameId = requestAnimationFrame(frame)
      if (!isVisible) return

      // Posição derivada do tempo (não acumulada): pausar fora da tela não
      // atrasa a faixa, e resize só reescala a fase, como a animação CSS
      const phase = ((performance.now() - startTime) / duration) % 1
      offset = -phase * loopWidth
      track.style.transform = `translate3d(${offset}px, 0, 0)`

      const { left: edgeL, right: edgeR, width } = container.getBoundingClientRect()
      const trackLeft = trackBase + offset
      const zone = Math.max(ZONE_MIN, Math.min(ZONE_MAX, width * ZONE_RATIO))

      for (const item of items) {
        const left = trackLeft + item.rel
        const right = left + item.width
        const touchesEdge = left < edgeL + zone || right > edgeR - zone
        const onScreen = right > edgeL && left < edgeR

        if (!touchesEdge || !onScreen) {
          if (item.dirty) {
            item.el.textContent = item.text
            item.dirty = false
          }
          continue
        }

        let out = ''
        for (let i = 0; i < item.text.length; i++) {
          const x = left + (i + 0.5) * item.charW
          const linear = Math.min(x - edgeL, edgeR - x) / zone + (hash(item.seed + i) - 0.5) * JITTER
          const p = Math.max(0, linear) ** EASE
          const stages = item.stages[i]
          out += item.text[i] === ' '
            ? ' '
            : stages[Math.min(stages.length - 1, Math.floor(p * stages.length))]
        }
        if (out !== item.el.textContent) item.el.textContent = out
        item.dirty = out !== item.text
      }
    }

    measure()
    frame()
    // A largura da faixa muda quando a fonte web termina de carregar (a
    // medição inicial pode ter sido feita com a fonte de fallback) e no resize
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(track)
    resizeObserver.observe(container)
    const observer = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      observer.disconnect()
      items.forEach((item) => { item.el.textContent = item.text })
      track.style.animation = ''
      track.style.transform = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
