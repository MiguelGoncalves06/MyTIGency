// O "salto" do botão de pular o Manifesto: um portal. Três camadas (papel,
// vermelho, tinta) nascem como uma janela pequena e torta saindo do botão e
// cobrem a tela; por baixo, o salto acontece de verdade (work) enquanto a régua
// do Manifesto corre de 000% a 100%; depois as camadas se abrem do centro, uma
// dentro da outra, se endireitando, até o destino aparecer. Estrutura estudada no
// We Are The Romans (janela que segura enquanto a página carrega, depois explode
// em janelas aninhadas), com a pele do MyT: as cores do site e a régua.
// Reduced motion: só um fade curto da tinta, sem forma nem contagem.

const COLORS = ['#f4f3ef', '#FF4438', '#141414'] // papel, vermelho, tinta (de baixo para cima)
const COVER_MS = 460
const COVER_STAGGER = 70
const HOLD_MIN = 520 // a régua correndo: tempo mínimo com a tela coberta
const REVEAL_MS = 760
const REVEAL_STAGGER = 110
const EASE_IN = 'cubic-bezier(.7, 0, .84, 0)'
const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const frames = (n) => new Promise((r) => { const f = () => (--n > 0 ? requestAnimationFrame(f) : r()); requestAnimationFrame(f) })

// uma janela (quadrilátero) com centro, meia largura/altura, inclinação (desvio
// horizontal entre o topo e a base, px) e giro (rad) → 4 pontos em px
function quad(cx, cy, hw, hh, skew, rot) {
  const c = Math.cos(rot), s = Math.sin(rot)
  return [[-hw + skew, -hh], [hw + skew, -hh], [hw - skew, hh], [-hw - skew, hh]]
    .map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c])
}
const pts = (q) => q.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')
const poly = (q) => `polygon(${pts(q)})`
// a tela toda com um buraco (evenodd): a camada aparece em volta da janela
const holed = (vw, vh, q) => `polygon(evenodd, -20px -20px, ${vw + 20}px -20px, ${vw + 20}px ${vh + 20}px, -20px ${vh + 20}px, -20px -20px, ${pts(q)}, ${pts([q[0]])})`

/**
 * @param opts { origin: [x, y] (onde nasce: o botão), label(p): texto da régua
 *               (p de 0 a 1), work(): o salto, por baixo da cobertura (pode ser async) }
 */
export async function runPortal(opts) {
  const root = document.createElement('div')
  try {
    await portal(root, opts)
  } finally {
    root.remove() // (num erro, a tela não fica coberta)
  }
}

async function portal(root, { origin, label, work }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const vw = window.innerWidth, vh = window.innerHeight
  root.className = 'ms-portal'
  root.setAttribute('aria-hidden', 'true')
  const layers = COLORS.map((bg) => {
    const el = document.createElement('div')
    el.className = 'ms-portal-layer'
    el.style.background = bg
    root.append(el)
    return el
  })
  const text = document.createElement('div')
  text.className = 'ms-portal-label'
  root.append(text)
  document.body.append(root)

  if (reduce) {
    layers.slice(0, 2).forEach((el) => { el.style.display = 'none' })
    const ink = layers[2]
    ink.style.clipPath = 'none'
    await ink.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, fill: 'forwards' }).finished
    await work()
    await frames(3)
    await ink.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }).finished
    root.remove()
    return
  }

  // 1. cobre: cada camada nasce pequena e torta no botão e toma a tela
  const [ox, oy] = origin
  const small = quad(ox, oy, vw * 0.035, vh * 0.03, vw * 0.006, -0.06)
  const full = quad(vw / 2, vh / 2, vw * 0.75, vh * 0.75, 0, 0)
  const covers = layers.map((el, i) => el.animate(
    [{ clipPath: poly(small) }, { clipPath: poly(full) }],
    { duration: COVER_MS, delay: i * COVER_STAGGER, easing: EASE_IN, fill: 'forwards' },
  ))
  await covers[2].finished

  // 2. segura: o salto acontece por baixo; a régua corre
  text.classList.add('on')
  const t0 = performance.now()
  let running = true
  const tickLabel = () => {
    if (!running) return
    text.textContent = label(Math.min(1, (performance.now() - t0) / HOLD_MIN))
    requestAnimationFrame(tickLabel)
  }
  tickLabel()
  await Promise.all([Promise.resolve().then(work).then(() => frames(3)), wait(HOLD_MIN)])
  running = false
  text.textContent = label(1)

  // 3. abre: as janelas aninhadas, do centro, se endireitando (a de cima primeiro)
  text.classList.remove('on')
  const from = quad(vw / 2, vh / 2, vw * 0.04, vh * 0.035, vw * 0.008, 0.07)
  const to = quad(vw / 2, vh / 2, vw * 0.78, vh * 0.78, 0, 0)
  const reveals = [...layers].reverse().map((el, i) => el.animate(
    [{ clipPath: holed(vw, vh, from) }, { clipPath: holed(vw, vh, to) }],
    { duration: REVEAL_MS, delay: i * REVEAL_STAGGER, easing: EASE_OUT, fill: 'forwards' },
  ))
  await reveals[reveals.length - 1].finished
  root.remove()
}
