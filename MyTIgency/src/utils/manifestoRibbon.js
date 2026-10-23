// Faixa ondulada do Manifesto (separador da cena A → seção 5; protótipo em
// lab/faixa). A arte é o ladrilho da faixa reta da cena A (kit/faixa-tile.svg,
// 504×72, letras em contorno) deformado ao longo de uma onda vertical: canvas
// 2D em fatias — cada fatia de ~2 px do ladrilho é desenhada girada na
// tangente da curva (sem WebGL: a página já tem TV, cursor e olho).
// Variante "vermelha": fundo da caneta, letras e estrelas na cor do papel.
// O texto corre pela faixa e a onda se desloca SÓ com o scroll: draw(cx, s)
// é função pura da posição (s = px de scroll no deslocamento), então para
// quando o scroll para e volta exatamente quando ele volta.
import tileUrl from '../assets/kit/faixa-tile.svg?url'

const TILE_W = 504
const TILE_H = 72
const PAPER = [244, 243, 239]
const RED = [255, 68, 56]
// ajuste escolhido no lab/faixa
const P = { amp: 0.025, waves: 1.45, thick: 96, tilt: -6.5, speed: 0.65, undulate: 0.75 }
const STEP = 2 // px de curva por fatia
const OVER = 0.8 // sobreposição entre fatias: sem fresta no lado de fora da curva
const TILT = Math.tan((P.tilt * Math.PI) / 180)

export function mountRibbon(canvas) {
  const ctx = canvas.getContext('2d')
  const img = new Image()
  let tile = null
  let W = 0
  let H = 0
  let dpr = 1
  let last = ''
  let pending = null // último draw pedido antes do ladrilho carregar

  // ladrilho → canvas na espessura da faixa, recolorido (vermelha)
  function raster() {
    const h = Math.round(P.thick * dpr)
    const w = Math.round(((TILE_W * P.thick) / TILE_H) * dpr)
    tile = Object.assign(document.createElement('canvas'), { width: w, height: h })
    const t = tile.getContext('2d')
    t.drawImage(img, 0, 0, w, h)
    const data = t.getImageData(0, 0, w, h)
    const d = data.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      const c = r > 150 && g < 130 && b < 130 ? PAPER : RED.map((v, k) => v + (PAPER[k] - v) * l)
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]
    }
    t.putImageData(data, 0, 0)
  }
  img.onload = () => { if (W) raster(); if (pending) draw(...pending) }
  img.src = tileUrl

  function resize(w, h) {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    W = w
    H = h
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    last = ''
    if (img.complete && img.naturalWidth) raster()
  }

  // centro da faixa na tela para y (px)
  const centerX = (y, cx, phase) => cx + P.amp * W * Math.sin(Math.PI * 2 * P.waves * (y / H) + phase) + TILT * (y - H / 2)

  /** cx = centro da faixa (px da camada); s = px de scroll no deslocamento */
  function draw(cx, s) {
    pending = [cx, s]
    if (!tile || !W) return
    const key = `${cx.toFixed(1)}|${s.toFixed(1)}`
    if (key === last) return
    last = key
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (cx < -reach() * 2 || cx > W + reach() * 2) return // fora da tela
    // a mesma relação scroll → onda do lab (lá: 3 alturas de tela de scroll)
    const phase = (P.undulate * Math.PI * 2 * s) / (3 * H)
    const len = (TILE_W * P.thick) / TILE_H // px de tela por ladrilho
    const tw = tile.width
    const th = tile.height
    let u = ((-s * P.speed) % len + len) % len
    let px = centerX(-P.thick, cx, phase)
    let py = -P.thick
    for (let y = py + STEP; y <= H + P.thick; y += STEP) {
      const x = centerX(y, cx, phase)
      const dx = x - px
      const dy = y - py
      const seg = Math.hypot(dx, dy)
      const c = dx / seg
      const sn = dy / seg
      ctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, dpr * px, dpr * py)
      const sx = (u / len) * tw
      const sw = (seg / len) * tw
      if (sx + sw <= tw) {
        ctx.drawImage(tile, sx, 0, sw, th, 0, -P.thick / 2, seg + OVER, P.thick)
      } else { // emenda no fim do ladrilho
        const a = tw - sx
        const segA = (a / tw) * len
        ctx.drawImage(tile, sx, 0, a, th, 0, -P.thick / 2, segA + OVER, P.thick)
        ctx.drawImage(tile, 0, 0, sw - a, th, segA, -P.thick / 2, seg - segA + OVER, P.thick)
      }
      u = (u + seg) % len
      px = x
      py = y
    }
  }

  /** quanto a faixa ocupa para cada lado do centro (onda + meia espessura), px */
  const reach = () => P.amp * W + P.thick / 2

  /** centro da faixa na altura y, para o mesmo (cx, s) de draw() */
  const at = (y, cx, s) => centerX(y, cx, (P.undulate * Math.PI * 2 * s) / (3 * H))

  return { resize, draw, reach, at, thick: P.thick, dispose() { img.onload = null } }
}
