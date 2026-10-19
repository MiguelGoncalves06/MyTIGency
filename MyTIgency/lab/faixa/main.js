// LAB — faixa ondulada (separador da seção 5 do Manifesto).
// A arte é o ladrilho da faixa da cena A (kit/faixa-tile.svg, 504×72, letras
// em contorno), deformado ao longo de uma curva vertical: canvas 2D em fatias
// — cada fatia de ~2 px do ladrilho é desenhada girada na tangente da curva.
// Sem WebGL (a página já tem TV, cursor e olho). O texto corre pela faixa SÓ
// com o scroll ("nada surge antes da hora"): parou de rolar, a faixa para.
import tileUrl from '../../src/assets/kit/faixa-tile.svg?url'

const TILE_W = 504
const TILE_H = 72
const PAPER = [244, 243, 239]
const INK = [20, 20, 20]
const RED = [255, 68, 56]

const P = {
  shape: 'bojo', // 'bojo' (S no meio, como a referência) | 'onda' (senoide)
  amp: 9, // vw
  waves: 1, // ondas na altura da tela ('onda')
  center: 0.55, // onde fica o bojo (fração da altura)
  thick: 92, // px
  tilt: 4, // graus
  speed: 1.2, // px de texto por px de scroll
  undulate: 0.6, // a onda se desloca com o scroll
  dir: 1, // 1 = texto lê de cima para baixo, −1 = de baixo para cima
  color: 'papel', // 'original' | 'papel' | 'vermelha'
  at: 1.2, // posição da faixa na trilha (vw)
}

const RANGES = {
  shape: { label: 'forma', options: ['bojo', 'onda'] },
  amp: { label: 'amplitude (vw)', min: 0, max: 25, step: 0.5 },
  waves: { label: 'ondas', min: 0.25, max: 3, step: 0.05 },
  center: { label: 'centro do bojo', min: 0.2, max: 0.8, step: 0.01 },
  thick: { label: 'espessura (px)', min: 30, max: 140, step: 1 },
  tilt: { label: 'inclinação (°)', min: -20, max: 20, step: 0.5 },
  speed: { label: 'texto × scroll', min: 0, max: 3, step: 0.05 },
  undulate: { label: 'ondular com scroll', min: 0, max: 2, step: 0.05 },
  dir: { label: 'sentido', options: [1, -1] },
  color: { label: 'cor', options: ['original', 'papel', 'vermelha'] },
}

const track = document.querySelector('.track')
const canvas = document.querySelector('canvas.ribbon')
const ctx = canvas.getContext('2d')
const tileImg = new Image()
let tile = null // ladrilho rasterizado na espessura atual (px do dispositivo)
let tileKey = ''
let W = 0
let H = 0
let dpr = 1
let offset = 0
let lastY = window.scrollY
let dirty = true

// ladrilho → canvas na escala da faixa, recolorido conforme a variante
function rasterTile() {
  const key = `${P.thick}|${P.color}|${dpr}`
  if (key === tileKey || !tileImg.complete) return
  tileKey = key
  const h = Math.round(P.thick * dpr)
  const w = Math.round((TILE_W * P.thick / TILE_H) * dpr)
  tile = Object.assign(document.createElement('canvas'), { width: w, height: h })
  const t = tile.getContext('2d')
  t.drawImage(tileImg, 0, 0, w, h)
  if (P.color === 'original') return
  const img = t.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const red = r > 150 && g < 130 && b < 130
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    let c
    if (P.color === 'papel') c = red ? RED : mix(PAPER, INK, l)
    else c = red ? PAPER : mix(RED, PAPER, l) // vermelha: fundo da caneta, letras papel
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]
  }
  t.putImageData(img, 0, 0)
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  tileKey = ''
  dirty = true
}

// progresso do scroll (0–1) e x da trilha: anda 140vw no scroll inteiro
const progress = () => window.scrollY / Math.max(1, document.documentElement.scrollHeight - H)

// centro da faixa na tela, para y (px)
function centerX(y, cx, phase) {
  const u = y / H
  const A = (P.amp / 100) * W
  const tilt = Math.tan((P.tilt * Math.PI) / 180) * (y - H / 2)
  if (P.shape === 'onda') return cx + A * Math.sin(Math.PI * 2 * P.waves * u + phase) + tilt
  // bojo: um S localizado (sobe para a direita e volta), o resto quase reto
  const z = (u - P.center - phase * 0.08) / 0.17
  return cx + A * (Math.exp(-z * z) * 1.1 - Math.exp(-((z + 1.6) ** 2)) * 0.45) + tilt
}

function draw() {
  rasterTile()
  if (!tile) return
  const p = progress()
  const trackX = -p * W * 1.4
  track.style.transform = `translateX(${trackX}px)`
  const cx = P.at * W + trackX
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // fora da tela (com folga da amplitude): não desenha
  const A = (P.amp / 100) * W + P.thick + Math.abs(Math.tan((P.tilt * Math.PI) / 180)) * H
  if (cx < -A || cx > W + A) return
  const phase = p * P.undulate * Math.PI * 2
  const pad = P.thick
  const step = 2
  const tileLen = (TILE_W * P.thick) / TILE_H // px de tela por ladrilho
  const tw = tile.width
  // percorre a curva na ordem de leitura; u = posição no ladrilho
  const ys = []
  for (let y = -pad; y <= H + pad; y += step) ys.push(y)
  if (P.dir < 0) ys.reverse()
  let u = ((offset % tileLen) + tileLen) % tileLen
  let prev = [centerX(ys[0], cx, phase), ys[0]]
  for (let i = 1; i < ys.length; i++) {
    const cur = [centerX(ys[i], cx, phase), ys[i]]
    const dx = cur[0] - prev[0]
    const dy = cur[1] - prev[1]
    const seg = Math.hypot(dx, dy)
    const c = dx / seg
    const s = dy / seg
    ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * prev[0], dpr * prev[1])
    // fatia do ladrilho [u, u + seg] (com emenda quando passa do fim)
    let sx = (u / tileLen) * tw
    let sw = (seg / tileLen) * tw
    const over = 0.8 // sobreposição: sem fresta no lado de fora da curva
    if (sx + sw <= tw) {
      ctx.drawImage(tile, sx, 0, sw, tile.height, 0, -P.thick / 2, seg + over, P.thick)
    } else {
      const a = tw - sx
      const segA = (a / tw) * tileLen
      ctx.drawImage(tile, sx, 0, a, tile.height, 0, -P.thick / 2, segA + over, P.thick)
      ctx.drawImage(tile, 0, 0, sw - a, tile.height, segA, -P.thick / 2, seg - segA + over, P.thick)
    }
    u = (u + seg) % tileLen
    prev = cur
  }
}

function frame() {
  requestAnimationFrame(frame)
  const y = window.scrollY
  if (y !== lastY) {
    offset -= (y - lastY) * P.speed // o texto corre com o scroll, e só com ele
    lastY = y
    dirty = true
  }
  if (!dirty) return
  dirty = false
  draw()
}

/* ------------------------------ painel ------------------------------ */
function buildPanel() {
  const form = document.getElementById('panel')
  form.innerHTML = '<h1>Faixa ondulada</h1>'
  for (const [k, r] of Object.entries(RANGES)) {
    const label = document.createElement('label')
    label.textContent = r.label
    let input
    if (r.options) {
      input = document.createElement('select')
      r.options.forEach((o) => input.add(new Option(String(o), String(o), false, o === P[k])))
      input.addEventListener('change', () => { P[k] = typeof P[k] === 'number' ? Number(input.value) : input.value; dirty = true })
      label.append(document.createElement('span'), input)
    } else {
      const out = document.createElement('output')
      out.textContent = P[k]
      input = Object.assign(document.createElement('input'), { type: 'range', min: r.min, max: r.max, step: r.step, value: P[k] })
      input.addEventListener('input', () => { P[k] = Number(input.value); out.textContent = P[k]; dirty = true })
      label.append(out, input)
    }
    input.name = k
    form.append(label)
  }
  const row = document.createElement('div')
  row.className = 'row'
  const copy = Object.assign(document.createElement('button'), { type: 'button', textContent: 'copiar valores' })
  copy.addEventListener('click', async () => {
    const txt = JSON.stringify(P)
    try { await navigator.clipboard.writeText(txt); copy.textContent = 'copiado' } catch { console.log(txt); copy.textContent = 'no console' }
    setTimeout(() => { copy.textContent = 'copiar valores' }, 1200)
  })
  row.append(copy)
  form.append(row)
}

window.addEventListener('resize', resize)
tileImg.onload = () => { tileKey = ''; dirty = true }
tileImg.src = tileUrl
buildPanel()
resize()
requestAnimationFrame(frame)
