// Segundo ato do Manifesto (fundo #141414): a cortina e a cena A ("Por isso,
// em vez de promessas, preferimos mostrar."). O DOM é do React (Manifesto.jsx
// → Act2); aqui só o estado, dirigido pelo scroll de quem chama
// (useManifestoHorizontal no desktop, gatilho próprio no mobile).
//   curtain 0→1, em três tempos: (1) a caneta vermelha circula a seção 3 com
//     uma elipse à mão (duas voltas que não coincidem, como o aro do NÓS);
//     (2) a tinta #141414 nasce onde a caneta termina (embaixo, à direita) e
//     enche a elipse; (3) cresce pela diagonal até tomar a tela, enquanto a
//     seção 3 recua e o traço vermelho EVAPORA: vira os mesmos pixels da tinta,
//     em vermelho, que sobem, deslizam, piscam e somem (o fim do traço
//     primeiro; o pontilhado decide a ordem). A tinta é um canvas em pixels de
//     CELL px com borda pontilhada (Bayer 4×4, que "ferve" de leve) — a mesma
//     linguagem do botão e da TV, sem degradê cinza.
//   a 0→1 (cena A): a linha pequena e as linhas sobem; a flor brota girando,
//     o olho em dither abre (pisca e segue o cursor); o marcador risca
//     "promessas", que fica oca; a caneta circula "mostrar", que acende; a
//     seta se desenha. Tudo termina em A_DONE — o resto do trecho fica para a
//     próxima transição.
import { mountDitherEye } from './ditherEye'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - (1 - t) ** 3
const backOut = (t) => (t <= 0 ? 0 : 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2)
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
export const A_DONE = 0.75

const CELL = 6 // px de tela por pixel da tinta
const BAND = 40 // px: largura da borda pontilhada
const BOIL_MS = 80
const INK = 0xff141414 // #141414 opaco (RGBA little-endian)
const RED = 0xff3844ff // #FF4438 (a caneta), idem
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
// Elipse da caneta, em frações da tela: centro, raios e inclinação. Começa à
// direita e gira no sentido horário ~1,12 volta, terminando embaixo à direita.
const E0 = { cx: 0.5, cy: 0.53, rx: 0.37, ry: 0.34, rot: -12 * Math.PI / 180 }
const TURNS = 1.12
const END_ANGLE = Math.PI * 0.27
// tempos dentro da cortina
const PEN = [0, 0.32]
const FILL = [0.28, 0.6] // a tinta enche a elipse da caneta
const TAKE = [0.6, 1] // e toma a tela
const PEN_OUT = [0.72, 0.97] // a caneta evapora em pixels

/**
 * @param root  .ms-act2
 * @param opts  { behind?: elemento que recua durante a cortina (a seção 3) }
 */
export function mountAct2(root, { behind } = {}) {
  const canvas = root.querySelector('.ma-ink')
  const ctx = canvas?.getContext('2d')
  const pen = root.querySelector('.ma-pen')
  const penPath = pen?.querySelector('path')
  let W = 0
  let H = 0
  let cw = 0
  let ch = 0
  let img = null
  let buf = null
  let jitter = null
  let boiledAt = 0
  let penLen = 1
  let penEnd = [0, 0]
  let lastC = -1
  let penCells = [] // a linha da caneta nas células da tinta: { i, j, t (posição no traço), n (Bayer), r }

  // medidas da camada (tela) → canvas, elipse e traço da caneta
  function measure() {
    W = root.clientWidth
    H = root.clientHeight
    if (!W || !H || !ctx) return
    cw = Math.ceil(W / CELL)
    ch = Math.ceil(H / CELL)
    canvas.width = cw
    canvas.height = ch
    img = ctx.createImageData(cw, ch)
    buf = new Uint32Array(img.data.buffer)
    jitter = new Float32Array(cw * ch)
    const { cx, cy, rx, ry, rot } = ellipse0()
    const c = Math.cos(rot)
    const sn = Math.sin(rot)
    const pts = []
    const a0 = END_ANGLE - TURNS * Math.PI * 2
    for (let i = 0; i <= 160; i++) {
      const u = i / 160
      const a = a0 + u * TURNS * Math.PI * 2
      const g = (1 + u * 0.05) * (1 + 0.012 * Math.sin(a * 5)) // 2ª volta abre um pouco; mão não é compasso
      const x = Math.cos(a) * rx * g
      const y = Math.sin(a) * ry * g - u * H * 0.012
      pts.push([cx + x * c - y * sn, cy + x * sn + y * c])
    }
    penEnd = pts[pts.length - 1]
    pen.setAttribute('viewBox', `0 0 ${W} ${H}`)
    penPath.setAttribute('d', `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}`)
    penLen = penPath.getTotalLength()
    penPath.style.strokeDasharray = `${penLen}`
    // rasteriza o traço nas células (uma amostra a cada 3 px)
    const seen = new Set()
    penCells = []
    for (let L = 0; L <= penLen; L += 3) {
      const p = penPath.getPointAtLength(L)
      const i = Math.floor(p.x / CELL)
      const j = Math.floor(p.y / CELL)
      const idx = j * cw + i
      if (i < 0 || j < 0 || i >= cw || j >= ch || seen.has(idx)) continue
      seen.add(idx)
      penCells.push({ i, j, t: L / penLen, n: BAYER[(j % 4) * 4 + (i % 4)] / 16, r: Math.random() })
    }
    lastC = -1
  }
  const ellipse0 = () => ({ cx: E0.cx * W, cy: E0.cy * H, rx: E0.rx * W, ry: E0.ry * H, rot: E0.rot })

  // tinta: elipse (centro, raios) → pixels; borda pontilhada que ferve
  function drawInk(c) {
    if (!buf) return
    if (c <= 0) { buf.fill(0); ctx.putImageData(img, 0, 0); return }
    if (c >= 1) { buf.fill(INK); ctx.putImageData(img, 0, 0); return }
    const e = ellipse0()
    const q = easeInOut(ramp(c, ...FILL))
    const r = easeInOut(ramp(c, ...TAKE))
    if (q <= 0) { buf.fill(0); ctx.putImageData(img, 0, 0); return } // a caneta ainda não chegou
    const band = BAND * Math.min(1, q * 3) // a borda pontilhada nasce com a tinta
    // escala final: a borda pontilhada inteira passa além do canto mais longe
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => norm(e, x, y)))
    const scale = 1 + (far * (1 + BAND / Math.min(e.rx, e.ry)) * 1.05 - 1) * r
    const ex = penEnd[0] + (e.cx - penEnd[0]) * q
    const ey = penEnd[1] + (e.cy - penEnd[1]) * q
    const rx = Math.max(1, e.rx * q * scale)
    const ry = Math.max(1, e.ry * q * scale)
    const rEff = Math.sqrt(rx * ry)
    const co = Math.cos(e.rot)
    const sn = Math.sin(e.rot)
    const now = performance.now()
    if (now - boiledAt > BOIL_MS) {
      boiledAt = now
      for (let i = 0; i < jitter.length; i++) jitter[i] = (Math.random() - 0.5) * 0.3
    }
    for (let j = 0; j < ch; j++) {
      const py = (j + 0.5) * CELL - ey
      for (let i = 0; i < cw; i++) {
        const px = (i + 0.5) * CELL - ex
        const xr = (px * co + py * sn) / rx
        const yr = (-px * sn + py * co) / ry
        const edge = (1 - Math.sqrt(xr * xr + yr * yr)) * rEff // >0 dentro, em px (aprox.)
        const k = BAYER[(j % 4) * 4 + (i % 4)] / 16 + jitter[j * cw + i]
        buf[j * cw + i] = edge > band * (k - 0.5) ? INK : 0
      }
    }
    const ev = ramp(c, ...PEN_OUT)
    if (ev > 0 && ev < 1) evaporate(ev)
    ctx.putImageData(img, 0, 0)
  }
  // A caneta evapora: cada célula do traço some no seu tempo (v) — o fim do
  // traço antes, o pontilhado espalha; perto de sumir ela sobe, às vezes
  // escorrega de lado e pisca (glitch), por cima da tinta.
  const hash = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x) }
  function evaporate(ev) {
    const tick = Math.floor(performance.now() / BOIL_MS)
    for (const p of penCells) {
      const v = 0.1 + (1 - p.t) * 0.55 + p.n * 0.35
      if (ev >= v) continue
      const g = ev / v // 0 → 1 = a caminho de sumir
      const h = hash(p.j * cw + p.i, tick)
      if (g > 0.5 && h < (g - 0.5) * 1.5) continue // pisca cada vez mais
      const up = g > 0.25 ? Math.floor((g - 0.25) * 4.5 * (0.4 + p.r)) : 0
      const side = g > 0.55 && h > 0.86 ? (h > 0.93 ? 1 : -1) : 0
      const i = p.i + side
      const j = p.j - up
      if (i >= 0 && j >= 0 && i < cw && j < ch) buf[j * cw + i] = RED
    }
  }
  // distância normalizada de um ponto ao centro da elipse da caneta (1 = na borda)
  function norm(e, x, y) {
    const px = x - e.cx
    const py = y - e.cy
    const co = Math.cos(e.rot)
    const sn = Math.sin(e.rot)
    return Math.hypot((px * co + py * sn) / e.rx, (-px * sn + py * co) / e.ry)
  }
  // recriar o canvas o limpa: redesenha na hora no estado atual (não espera o scroll)
  let curC = 0
  const onResize = () => { measure(); drawInk(curC); lastC = curC }
  window.addEventListener('resize', onResize)

  /* ---------- cena A ---------- */
  const q = (s) => root.querySelector(s)
  const eyebrow = q('.ma-eyebrow')
  const lines = [...root.querySelectorAll('.ma-a-text > .ma-line')]
  const words = [...root.querySelectorAll('.ma-w:not(.ma-w--show):not(.ma-w--strike)')]
  const strike = q('.ma-w--strike')
  const show = q('.ma-w--show')
  const flower = q('.ma-flower')
  const eye = q('.ma-eye')
  const arrow = q('.ma-arrow')
  const decos = [...root.querySelectorAll('.ma-d:not(.ma-ticket)')]
  const ticket = q('.ma-ticket')
  // Traços desenhados pelo scroll. Com vector-effect: non-scaling-stroke o
  // tracejado é medido em px de TELA (pathLength não vale), então o
  // comprimento é somado sobre o path já transformado — e remedido quando a
  // tela muda de tamanho.
  const screenLength = (el) => {
    const m = el.getScreenCTM()
    if (!m) return 0
    const n = 80
    const total = el.getTotalLength()
    let len = 0
    let prev = null
    for (let i = 0; i <= n; i++) {
      const p = el.getPointAtLength((total * i) / n).matrixTransform(m)
      if (prev) len += Math.hypot(p.x - prev.x, p.y - prev.y)
      prev = p
    }
    return len
  }
  const draw = (el) => {
    if (!el) return null
    let len = 0
    let w = -1
    return (t) => {
      if (w !== window.innerWidth || !len) { // mede só com a cena montada e na tela
        w = window.innerWidth
        // non-scaling-stroke: tracejado em px de tela; senão, em unidades do SVG
        len = (getComputedStyle(el).vectorEffect === 'non-scaling-stroke' ? screenLength(el) : el.getTotalLength()) + 2
        el.style.strokeDasharray = `${len}`
        if (document.fonts.status !== 'loaded') w = -1 // fonte ainda chegando: mede de novo depois
      }
      el.style.strokeDashoffset = `${len * (1 - t)}`
    }
  }
  // risco de "promessas": o pincel (preenchimento) aparece da esquerda para a direita
  const strikeEl = q('.ma-strike')
  const strikeDraw = strikeEl && ((t) => { strikeEl.style.clipPath = `inset(-60% ${(1 - t) * 100}% -60% 0)` })
  // elipse de "mostrar": a máscara (traço que segue a elipse) revela o pincel dobrado
  const ringDraw = draw(q('.ma-ring-pen'))
  const arrowRing = draw(arrow?.querySelector('circle'))
  const arrowDraw = draw(arrow?.querySelector('path'))

  // Olho em dither (utils/ditherEye.js): segue o cursor e pisca; só desenha
  // com a cena na tela
  const eyeFx = eye && mountDitherEye(eye, { cell: 2 })

  function update({ curtain, a }) {
    const c = clamp01(curtain)
    curC = c
    root.style.visibility = c > 0 ? 'visible' : 'hidden'
    root.style.setProperty('--grain', ramp(c, FILL[0], 1)) // o grão chega com a tinta
    if (c > 0 && root.clientWidth !== W) measure()
    // a tinta só redesenha se a cortina andou (ou ferve na borda enquanto anda)
    if (c !== lastC) {
      lastC = c
      drawInk(c)
      if (penPath) {
        penPath.style.strokeDashoffset = `${penLen * (1 - easeInOut(ramp(c, ...PEN)))}`
        // o traço vetorial dá lugar aos pixels logo no começo da evaporação
        pen.style.opacity = `${1 - ramp(c, PEN_OUT[0], PEN_OUT[0] + 0.02)}`
      }
      if (behind) behind.style.transform = c > 0 ? `scale(${1 - 0.04 * easeInOut(ramp(c, FILL[0], 1))})` : ''
    }
    eyeFx?.setLive(a > 0.1)
    // linha pequena, depois as linhas sobem uma a uma
    if (eyebrow) eyebrow.style.opacity = `${easeOut(ramp(a, 0, 0.12))}`
    lines.forEach((l, i) => {
      const t = easeOut(ramp(a, 0.04 + i * 0.08, 0.32 + i * 0.08))
      l.style.opacity = `${t}`
      l.style.transform = `translateY(${(1 - t) * 0.4}em)`
    })
    // flor brota girando e segue girando com o scroll; o olho abre
    const fl = ramp(a, 0.1, 0.32)
    if (flower) flower.style.transform = `scale(${backOut(fl)}) rotate(${a * 260 - (1 - fl) * 120}deg)`
    eyeFx?.setReveal(ramp(a, 0.16, 0.44)) // o dither do olho se forma
    // marcador risca "promessas" e ela fica oca
    strikeDraw?.(easeInOut(ramp(a, 0.34, 0.46)))
    strike?.style.setProperty('--hollow', easeInOut(ramp(a, 0.42, 0.55)))
    // a caneta circula "mostrar", que acende; o resto recua
    ringDraw?.(easeInOut(ramp(a, 0.5, 0.66)))
    const f = easeInOut(ramp(a, 0.58, A_DONE))
    words.forEach((w) => { w.style.opacity = `${1 - 0.5 * f}` })
    show?.style.setProperty('--lit', f)
    // cantos entram (um depois do outro) enquanto a frase sobe; o ticket bate
    // como carimbo no fim
    decos.forEach((d, i) => {
      const t = easeOut(ramp(a, 0.12 + i * 0.05, 0.4 + i * 0.05))
      d.style.opacity = `${t}`
      d.style.translate = `0 ${(1 - t) * 18}px`
    })
    if (ticket) {
      const t = ramp(a, 0.64, A_DONE)
      ticket.style.opacity = `${Math.min(1, t * 4)}`
      ticket.style.scale = `${1 + 0.6 * (1 - backOut(t))}`
    }
    // a seta se desenha por último: aponta para a próxima cena
    arrowRing?.(easeInOut(ramp(a, 0.6, 0.72)))
    arrowDraw?.(easeInOut(ramp(a, 0.66, A_DONE)))
  }

  measure()
  update({ curtain: 0, a: 0 })
  return {
    update,
    dispose() {
      eyeFx?.dispose()
      window.removeEventListener('resize', onResize)
      if (behind) behind.style.transform = ''
      root.style.visibility = ''
    },
  }
}
