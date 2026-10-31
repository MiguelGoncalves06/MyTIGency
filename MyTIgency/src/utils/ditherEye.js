// Olho em dither que segue o cursor (cena A do segundo ato do Manifesto).
// O olho é desenhado por código em tons (0 = escuro, 1 = claro), nas
// coordenadas da imagem de referência (735×453), e cada quadro passa por um
// pontilhado (ruído fixo + um pouco de Bayer 8×8): célula clara = ponto cor de papel, escura = vazio —
// sobre o fundo #141414 a imagem lê igual à referência (pontos escuros no
// claro), só impressa ao contrário. Íris, pupila e reflexo seguem o cursor
// com inércia (o reflexo anda menos, como na vida real) e o olho pisca; como
// o pontilhado é recalculado, os pontos "fervem" em volta da íris quando ela
// anda. Só desenha enquanto está ativo (setLive) e algo muda.
import gsap from 'gsap'

const W0 = 735
const H0 = 453
// 4 níveis (RGBA little-endian): vazio (o fundo #141414), cinza escuro,
// cinza médio e papel — o pontilhado acontece entre níveis vizinhos, então
// aparecem as sombras e meios-tons da referência (não só ponto/vazio)
const LEVELS = [0, 0xff4a4b4d, 0xff9a9c9e, 0xffeff3f4] // —, #4D4B4A, #9E9C9A, #F4F3EF
const PAPER = LEVELS[3]
// cantos do olho e pálpebras (referência)
const XL = 92
const XR = 652
const upperLid = (t) => 272 - 118 * Math.sin(Math.PI * t ** 0.82)
const lowerLid = (t) => 268 + 78 * Math.sin(Math.PI * t ** 1.15)
const IRIS = { x: 418, y: 250, r: 96, pupil: 47 }
const GAZE = { x: 46, y: 15 } // quanto a íris anda (unidades da referência)
const EDGE_MS = 260 // a borda vibra/glitcha nesse ritmo (suave: só dá movimento)

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h) }
function noise(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi) + (hash(xi + 1, yi) - hash(xi, yi)) * u
  const b = hash(xi, yi + 1) + (hash(xi + 1, yi + 1) - hash(xi, yi + 1)) * u
  return a + (b - a) * v
}
// Bayer 8×8 normalizado
const BAYER8 = (() => {
  const b2 = [[0, 2], [3, 1]]
  const m = []
  for (let y = 0; y < 8; y++) {
    m.push([])
    for (let x = 0; x < 8; x++) {
      let v = 0
      for (let k = 0, s = 1; k < 3; k++, s *= 2) v = v * 4 + b2[(y >> (2 - k)) & 1][(x >> (2 - k)) & 1]
      m[y].push((v + 0.5) / 64)
    }
  }
  return m
})()

// tom da pele em volta (fora da abertura): claro, com textura
const skin = (x, y, n) => 0.66 - 0.16 * n + 0.06 * noise(x * 0.02, y * 0.02)

/** Tom (0–1) num ponto da referência, com o olhar (gx, gy) e a piscada (k). */
function tone(x, y, gx, gy, k, n) {
  const t = (x - XL) / (XR - XL)
  if (t <= 0 || t >= 1) {
    // asa dos cílios no canto de fora (passa um pouco do canto)
    if (x < XL && x > XL - 46) {
      const yw = 272 + (XL - x) * 0.32
      const w = 7 * (x - (XL - 46)) / 46
      if (Math.abs(y - yw) < w) return 0.06
    }
    return skin(x, y, n)
  }
  const lo = lowerLid(t)
  const up = upperLid(t) + (lo - 3 - upperLid(t)) * k // piscando: a pálpebra de cima desce
  if (y <= up) {
    // cílios: faixa escura (mais grossa no canto de fora) com fios claros
    // soltos; acima, a pele da pálpebra — clara no meio, sombreada junto aos
    // cílios e na dobra; depois a pele, que escurece em direção à sobrancelha
    const d = up - y
    const lw = 9 + 16 * (1 - t) ** 1.2 // linha da pálpebra (os fios dos cílios fazem o resto)
    if (d < lw) return 0.05 + 0.16 * n * smooth(0.5, 1, d / lw)
    if (d < lw + 46) {
      const u = (d - lw) / 46 // 0 = junto aos cílios, 1 = dobra
      let v = 0.62 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.15)) - 0.12 * n // volume da pálpebra
      v -= 0.55 * Math.exp(-(((d - (lw + 38)) / 6.5) ** 2)) // dobra
      v -= 0.35 * Math.exp(-(d - lw) / 6) // sombra logo acima dos cílios
      v += 0.1 * (1 - smooth(0, 0.35, Math.abs(t - 0.55))) // luz no meio da pálpebra
      return v
    }
    return skin(x, y, n) - 0.2 * Math.exp(-(d - lw - 46) / 26) - 0.1 * smooth(80, 200, d)
  }
  if (y >= lo) {
    // pálpebra de baixo: borda molhada (clara), cílios finos, sombra embaixo
    const d = y - lo
    if (d < 3) return 0.78 - 0.1 * n // borda molhada
    if (d < 8) return 0.3 + 0.18 * n // cílios de baixo
    if (d < 30) return 0.58 + 0.12 * smooth(8, 30, d) - 0.1 * n
    return skin(x, y, n) - 0.08 * Math.exp(-(d - 30) / 20)
  }
  // dentro da abertura: esclera, íris, pupila, reflexo
  const ix = IRIS.x + gx
  const iy = IRIS.y + gy
  const dx = x - ix
  const dy = y - iy
  const d = Math.hypot(dx, dy)
  let v
  if (d < IRIS.r) {
    if (d < IRIS.pupil - 1.5) v = 0.02
    else if (d < IRIS.pupil + 1.5) v = 0.12 // borda macia da pupila
    else {
      const ang = Math.atan2(dy, dx)
      const ri = (d - IRIS.pupil) / (IRIS.r - IRIS.pupil) // 0 = pupila, 1 = aro
      const fib = noise(ang * 11 + 40, d * 0.09) - 0.5 // fibras radiais
      const streak = noise(ang * 26 + 7, 3.1) // raios claros finos
      v = 0.14 + 0.5 * smooth(-0.25, 0.95, dy / IRIS.r) // metade de baixo mais clara (luz entra por cima, bate embaixo)
      v += 0.22 * fib + 0.16 * smooth(0.62, 0.9, streak) * (1 - ri) + 0.08 * (n - 0.5)
      v -= 0.22 * Math.exp(-ri / 0.18) // colarete escuro em volta da pupila
      v *= 1 - 0.85 * smooth(0.78, 1, ri) // aro escuro (limbo)
      v -= 0.25 * Math.exp(-(y - up) / 22) // sombra da pálpebra sobre a íris
    }
  } else {
    // esclera: globo — sombreado pela curvatura (mais claro perto da íris),
    // pela pálpebra de cima (sombra longa) e nos cantos
    const ball = Math.hypot(dx / 300, dy / 110)
    v = 0.97 - 0.06 * n - 0.38 * smooth(0.3, 1.05, ball)
    v -= 0.6 * Math.exp(-(y - up) / 16) // sombra da pálpebra
    v -= 0.3 * Math.exp(-(lo - y) / 10)
    v -= 0.42 * (1 - smooth(0, 0.18, t)) + 0.3 * (1 - smooth(0, 0.12, 1 - t)) // cantos
    if (t > 0.86) v += 0.22 * Math.exp(-(((y - (lo - 16)) / 8) ** 2)) * smooth(0.86, 0.95, t) // carúncula úmida, canto de dentro
  }
  // reflexos da luz: o principal (alto, à direita) e um pequeno embaixo; andam menos que a íris
  const hx = ix + 10 - gx * 0.45
  const hy = iy - 47 - gy * 0.45
  const hd = Math.hypot(x - hx, y - hy)
  if (hd < 22) v = Math.max(v, 1 - smooth(16, 22, hd) * 0.7)
  const h2 = Math.hypot(x - (ix - 34 - gx * 0.3), y - (iy + 30 - gy * 0.3))
  if (h2 < 7) v = Math.max(v, 0.62 - smooth(4, 7, h2) * 0.4)
  return v
}

// Cílios: fios desenhados por código (curva quadrática que afina da base à
// ponta), "carimbados" num mapa por célula a cada quadro — seguem a pálpebra
// quando o olho pisca e escurecem a imagem antes do pontilhado. Variação fixa
// por fio (hash), para não parecer pente.
//   superiores: longos e curvados para cima/fora, bem mais longos e deitados
//     no canto de fora (à esquerda), curtos e quase retos no canto de dentro;
//   inferiores: curtos e finos, para baixo/fora.
const LASHES = (() => {
  const out = []
  // duas fileiras: a de fora (longa, varre para o canto de fora — o
  // "gatinho") e a de dentro (curta, cruza com a outra e dá volume); o
  // espaçamento é irregular, formando tufos
  for (const [n, scale, seed] of [[52, 1, 3.3], [34, 0.62, 8.8]]) {
    for (let i = 0; i < n; i++) {
      const h = hash(i * 1.7 + seed, seed)
      const t = 0.02 + Math.min(0.97, Math.max(0, (i + 0.5 + (h - 0.5) * 1.5) / n)) * 0.9
      const o = (1 - t) ** 1.3 // 1 = canto de fora
      const v = hash(i * 0.9 + seed, 9.1)
      out.push({
        upper: true, t,
        len: (24 + 66 * o) * scale * (0.75 + 0.5 * v),
        lean: 0.04 + 0.78 * o * o + 0.12 * (h - 0.5),
        curl: 0.4 + 0.75 * o + 0.25 * (v - 0.5),
        w: (3 + 1.6 * o) * (0.8 + 0.4 * h) * (scale < 1 ? 0.8 : 1),
      })
    }
  }
  const DOWN = 24
  for (let i = 0; i < DOWN; i++) {
    const h = hash(i * 2.3, 7.7)
    const t = 0.06 + (i + 0.5 + (h - 0.5) * 0.7) / DOWN * 0.76
    const o = (1 - t) ** 1.2
    out.push({ upper: false, t, len: (5 + 15 * o) * (0.75 + 0.5 * hash(i, 4.4)), lean: 0.15 + 0.6 * o, curl: 0.1 + 0.15 * o, w: 1.7 })
  }
  return out
})()
// derivada da pálpebra (dy/dx, unidades da referência)
const slope = (f, t) => (f(Math.min(1, t + 0.01)) - f(Math.max(0, t - 0.01))) / (0.02 * (XR - XL))

/** Desenha os cílios no mapa `map` (0–1 por célula), com a piscada k. */
function stampLashes(map, cw, ch, k) {
  map.fill(0)
  const sx = cw / W0
  const sy = ch / H0
  for (const L of LASHES) {
    const lo = lowerLid(L.t)
    const upY = upperLid(L.t) + (lo - 3 - upperLid(L.t)) * k
    const bx = XL + L.t * (XR - XL)
    const by = L.upper ? upY - 1 : lo + 5
    // normal da pálpebra (para fora), deitada para o canto de fora (−x)
    const m = L.upper ? slope(upperLid, L.t) : slope(lowerLid, L.t)
    let nx = L.upper ? m : -m
    let ny = L.upper ? -1 : 1
    const nl = Math.hypot(nx, ny)
    nx = nx / nl - L.lean
    ny /= nl
    const dl = Math.hypot(nx, ny)
    nx /= dl
    ny /= dl
    // ponta curva: continua girando para fora/para cima (ou para baixo)
    const p1x = bx + nx * L.len * 0.6
    const p1y = by + ny * L.len * 0.6
    const p2x = bx + nx * L.len - L.curl * L.len * 0.6
    const p2y = by + ny * L.len + (L.upper ? -1 : 1) * L.curl * L.len * 0.25
    const steps = Math.ceil(L.len / 1.5)
    for (let q = 0; q <= steps; q++) {
      const u = q / steps
      const a = (1 - u) * (1 - u)
      const b = 2 * (1 - u) * u
      const c = u * u
      const x = a * bx + b * p1x + c * p2x
      const y = a * by + b * p1y + c * p2y
      const r = (L.w * (1 - 0.78 * u)) / 2 // afina até a ponta
      const ci = x * sx
      const cj = y * sy
      const rc = Math.max(0.45, r * sx)
      for (let j = Math.floor(cj - rc); j <= Math.ceil(cj + rc); j++) {
        if (j < 0 || j >= ch) continue
        for (let i = Math.floor(ci - rc); i <= Math.ceil(ci + rc); i++) {
          if (i < 0 || i >= cw) continue
          const d = Math.hypot(i + 0.5 - ci, j + 0.5 - cj)
          if (d <= rc + 0.35) map[j * cw + i] = 1
        }
      }
    }
  }
}

/**
 * @param canvas  <canvas> (o tamanho em tela vem do CSS)
 * @param cell    px de tela por ponto do pontilhado
 */
export function mountDitherEye(canvas, { cell = 2 } = {}) {
  const ctx = canvas.getContext('2d')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const s = { gx: 0, gy: 0, tx: 0, ty: 0, k: 0 }
  let cw = 0
  let ch = 0
  let img = null
  let buf = null
  let grain = null
  let thr = null
  let lashMap = null // cílios carimbados (1 = fio), refeito a cada quadro
  let rank = null // ordem de chegada de cada célula na formação
  let reveal = 1
  let live = false
  let dirty = true

  function size() {
    const w = Math.max(8, Math.round(canvas.clientWidth / cell))
    const h = Math.max(5, Math.round((w * H0) / W0))
    if (w === cw && h === ch) return
    cw = w
    ch = h
    canvas.width = cw
    canvas.height = ch
    img = ctx.createImageData(cw, ch)
    buf = new Uint32Array(img.data.buffer)
    grain = new Float32Array(cw * ch)
    thr = new Float32Array(cw * ch)
    rank = new Float32Array(cw * ch)
    shifts = new Int8Array(ch)
    lashMap = new Float32Array(cw * ch)
    for (let i = 0; i < grain.length; i++) {
      const x = i % cw
      const y = (i / cw) | 0
      grain[i] = hash(x, y)
      thr[i] = 0.8 * hash(x + 91.7, y * 1.3 + 17.1) + 0.2 * BAYER8[y & 7][x & 7]
      rank[i] = hash(x * 3.1 + 5.3, y * 2.7 + 9.1)
    }
    dirty = true
  }

  // Borda viva: as células da borda (onde a imagem esvanece no escuro) sorteiam
  // o limiar de novo a cada EDGE_MS e algumas fileiras escorregam de lado
  // (glitch) — o miolo do olho fica firme. Entrada: o dither se forma, como o
  // PC da seção 2 — blocos grossos que afinam enquanto os pontos aparecem
  // espalhados (cada célula tem a sua vez, `rank`), com um lampejo na frente.
  let edgeAt = 0
  let shifts = null
  function draw(now = performance.now()) {
    size()
    if (!buf) return
    const animEdge = !reduced && now - edgeAt > EDGE_MS
    if (animEdge) {
      edgeAt = now
      const burst = Math.random() < 0.04 // raramente, um glitch um pouco mais forte
      for (let j = 0; j < ch; j++) {
        const p = burst ? 0.1 : 0.025
        shifts[j] = Math.random() < p ? Math.round((Math.random() - 0.5) * (burst ? 6 : 3)) : 0
      }
    }
    stampLashes(lashMap, cw, ch, s.k)
    const r = reveal
    const bs = r >= 1 ? 1 : Math.max(1, Math.round(6 - 5 * r ** 0.6)) // blocos que afinam
    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        const idx = j * cw + i
        if (r < 1 && rank[idx] > r * 1.08) { buf[idx] = 0; continue } // ainda não chegou
        // borda: amostra deslocada pela fileira (glitch) e limiar sorteado
        const fade0 = fadeAt(i, j)
        const edge = fade0 > 0.04 && fade0 < 0.97
        const si = edge && shifts ? Math.min(cw - 1, Math.max(0, i + shifts[j])) : i
        const qi = bs > 1 ? Math.min(cw - 1, Math.floor(si / bs) * bs + (bs >> 1)) : si
        const qj = bs > 1 ? Math.min(ch - 1, Math.floor(j / bs) * bs + (bs >> 1)) : j
        const x = ((qi + 0.5) / cw) * W0
        const y = ((qj + 0.5) / ch) * H0
        // cílios escurecem por cima (quase preto, com um resto de brilho de fio)
        const b = tone(x, y, s.gx, s.gy, s.k, grain[qj * cw + qi]) * (1 - fadeAt(qi, qj)) * (1 - 0.94 * lashMap[idx])
        // borda: o limiar só vibra um pouco (mistura com sorteio), não troca tudo
        const t = edge && !reduced ? thr[idx] * 0.7 + Math.random() * 0.3 : thr[idx]
        const flash = r < 1 && fade0 < 0.8 && rank[idx] > r * 1.08 - 0.06 // frente da formação acesa (só no olho)
        // nível: parte inteira de b×3 + o pontilhado decide o vizinho de cima
        const v = Math.min(2.999, Math.max(0, b) * 3)
        const lv = Math.floor(v) + (v - Math.floor(v) > t ? 1 : 0)
        buf[idx] = flash ? PAPER : LEVELS[lv]
      }
    }
    ctx.putImageData(img, 0, 0)
    dirty = false
  }
  // quanto a imagem já esvaneceu no escuro (0 = olho, 1 = fundo), por célula
  function fadeAt(i, j) {
    const x = ((i + 0.5) / cw) * W0
    const y = ((j + 0.5) / ch) * H0
    return smooth(0.55, 1, Math.hypot((x - 372) / 340, (y - 258) / (y < 258 ? 245 : 140)))
  }

  // o olhar segue o cursor (direção a partir do centro do olho, em fração da tela)
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.4)
    const dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.4)
    s.tx = Math.max(-1, Math.min(1, dx)) * GAZE.x
    s.ty = Math.max(-1, Math.min(1, dy)) * GAZE.y
  }
  // na tela de fato (a cena A desliza para fora no segundo ato): fora dela o tick
  // seguia redesenhando e medindo o canvas a cada quadro, até o fim do Manifesto
  let inView = true
  const viewIO = new IntersectionObserver(([e]) => { inView = e.isIntersecting })
  viewIO.observe(canvas)
  const tick = () => {
    if (!live || !inView) return
    const ex = s.tx - s.gx
    const ey = s.ty - s.gy
    if (Math.abs(ex) > 0.15 || Math.abs(ey) > 0.15) {
      s.gx += ex * 0.12
      s.gy += ey * 0.12
      dirty = true
    }
    // a borda segue fervendo enquanto o olho está na tela
    const now = performance.now()
    if (dirty || (!reduced && now - edgeAt > EDGE_MS)) draw(now)
  }
  const timers = []
  if (!reduced) {
    window.addEventListener('pointermove', onMove)
    gsap.ticker.add(tick)
    const blink = () => {
      if (live) gsap.to(s, { k: 1, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.in', onUpdate: () => { dirty = true } })
      timers.push(gsap.delayedCall(gsap.utils.random(2.5, 5.5), blink))
    }
    timers.push(gsap.delayedCall(2.2, blink))
  }
  const onResize = () => { size(); draw() }
  window.addEventListener('resize', onResize)
  draw()

  return {
    /** formação do dither (0 = nada, 1 = pronto), dirigida pelo scroll */
    setReveal(v) {
      const r = reduced ? 1 : Math.min(1, Math.max(0, v))
      if (r === reveal) return
      reveal = r
      dirty = true
      if (!live) draw()
    },
    setLive(v) {
      if (v === live) return
      live = v
      if (live) { dirty = true; tick() }
    },
    dispose() {
      viewIO.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
      gsap.ticker.remove(tick)
      timers.forEach((t) => t.kill())
      gsap.killTweensOf(s)
    },
  }
}
