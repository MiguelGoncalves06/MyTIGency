// Cena do anjo para os protótipos: as mesmas 24 camadas + mapa da seção 3
// (camadas.json / meta.json), compostas num canvas, e dois renderizadores:
// tinta (revela por escuridão + distância da origem, como o modo TINTA do
// shader da seção 3, com a "frente" da caneta em vermelho) e ASCII (células
// que embaralham e "compilam" até o caractere final).
import camadas from '../../src/assets/s3/camadas.json'
import meta from '../../src/assets/s3/raster/meta.json'

export const FW = 1130
export const FH = 784
const RASTER = new Set(['mapa', 'nuvem-dir', 'nuvem-cima', 'nuvem-abaixo-lua', 'vetor-lua-cheia', 'moon', 'nuvem-esq', 'ANJO', 'lua-minguante', 'little-planet', 'saturn', 'planetapeq'])
const url = (nome) => (RASTER.has(nome)
  ? new URL(`../../src/assets/s3/raster/${nome}.webp`, import.meta.url).href
  : new URL(`../../src/assets/s3/vec/${nome}.svg`, import.meta.url).href)

/** Camadas de baixo para cima, com as imagens carregadas. */
export async function loadLayers() {
  const list = [{ nome: 'mapa', ...meta.mapa }, ...[...camadas.camadas].reverse()]
  await Promise.all(list.map((l) => new Promise((res) => {
    const im = new Image()
    im.onload = im.onerror = () => res()
    im.src = url(l.nome)
    l.img = im
    l.raster = RASTER.has(l.nome)
  })))
  return list
}

/** Composição num canvas de largura `width` (proporção do frame 1130×784). */
export function composite(layers, width, only) {
  const s = width / FW
  const c = document.createElement('canvas')
  c.width = Math.round(width)
  c.height = Math.round(FH * s)
  const ctx = c.getContext('2d')
  for (const l of layers) {
    if (only && !only(l)) continue
    if (!l.img.naturalWidth) continue
    ctx.drawImage(l.img, l.x * s, l.y * s, l.w * s, l.h * s)
  }
  return c
}

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Tinta: draw(p) com p 0..1. A frente da revelação sai em vermelho (caneta). */
export function inkReveal(src, { origin = [0.62, 0.3], pen = [240, 74, 63], soft = 0.07 } = {}) {
  const w = src.width
  const h = src.height
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data
  const order = new Float32Array(w * h)
  // ruído de valor suave (grade aleatória interpolada)
  const G = 22
  const gw = Math.ceil(w / G) + 2
  const grid = Float32Array.from({ length: gw * (Math.ceil(h / G) + 2) }, Math.random)
  const noise = (x, y) => {
    const gx = x / G, gy = y / G, x0 = gx | 0, y0 = gy | 0
    const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1], c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1]
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
  }
  const ox = origin[0] * w, oy = origin[1] * h, diag = Math.hypot(w, h)
  for (let i = 0; i < w * h; i++) {
    const a = sd[i * 4 + 3] / 255
    if (a < 0.01) { order[i] = -9; continue }
    const lum = (sd[i * 4] * 0.299 + sd[i * 4 + 1] * 0.587 + sd[i * 4 + 2] * 0.114) / 255
    const x = i % w, y = (i / w) | 0
    order[i] = (1 - lum) * 0.55 + (1 - (Math.hypot(x - ox, y - oy) / diag) * 1.6) * 0.35 + noise(x, y) * 0.1
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const od = ctx.createImageData(w, h)
  const d = od.data
  let last = -1
  function draw(p) {
    if (Math.abs(p - last) < 0.001) return
    last = p
    const edge = 1 - p * 1.3
    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
      const v = order[i]
      if (v === -9) { d[j + 3] = 0; continue }
      const t = clamp((v - edge) / soft)
      const k = t * t * (3 - 2 * t)
      const front = t > 0 && t < 1 ? 1 - Math.abs(t * 2 - 1) : 0
      d[j] = sd[j] + (pen[0] - sd[j]) * front
      d[j + 1] = sd[j + 1] + (pen[1] - sd[j + 1]) * front
      d[j + 2] = sd[j + 2] + (pen[2] - sd[j + 2]) * front
      d[j + 3] = sd[j + 3] * Math.max(k, front * 0.9)
    }
    ctx.putImageData(od, 0, 0)
  }
  return { canvas, draw }
}

const GLYPHS = '-=+*/\\<>▓_█▒░'
/** ASCII que compila: draw(p) — células aparecem de cima para baixo, embaralham e assentam. */
export function asciiCompile(src, { cell = 8, color = '#24489a', scramble = '#FF4438', ramp = ' .:-=+*%#@' } = {}) {
  const w = src.width
  const h = src.height
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data
  const cols = Math.floor(w / cell), rows = Math.floor(h / cell)
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let a = 0, ink = 0
      for (let y = 0; y < cell; y += 2) {
        for (let x = 0; x < cell; x += 2) {
          const j = ((r * cell + y) * w + c * cell + x) * 4
          const al = sd[j + 3] / 255
          a += al
          ink += (1 - (sd[j] * 0.299 + sd[j + 1] * 0.587 + sd[j + 2] * 0.114) / 255) * al
        }
      }
      const n = (cell / 2) ** 2
      a /= n
      ink /= n
      if (a < 0.12) continue
      const ch = ramp[Math.min(ramp.length - 1, Math.floor(ink * ramp.length * 1.35))]
      if (ch === ' ') continue
      cells.push({ x: c * cell, y: r * cell, ch, t: (r / rows) * 0.75 + Math.random() * 0.25 })
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.font = `500 ${Math.round(cell * 1.15)}px "JetBrains Mono", monospace`
  ctx.textBaseline = 'top'
  function draw(p) {
    ctx.clearRect(0, 0, w, h)
    for (const k of cells) {
      const start = k.t * 0.85
      if (p < start) continue
      const settled = p > start + 0.12
      ctx.fillStyle = settled ? color : scramble
      ctx.fillText(settled ? k.ch : GLYPHS[(Math.random() * GLYPHS.length) | 0], k.x, k.y)
    }
  }
  return { canvas, draw, cells }
}

/** Só o anjo e o disco (recorte quadrado do frame, x 180–950), largura `width`. */
export function angelCrop(layers, width) {
  const X0 = 180, X1 = 950
  const full = composite(layers, (width * FW) / (X1 - X0))
  const s = full.width / FW
  const c = document.createElement('canvas')
  c.width = Math.round((X1 - X0) * s)
  c.height = full.height
  c.getContext('2d').drawImage(full, X0 * s, 0, c.width, c.height, 0, 0, c.width, c.height)
  return c
}
