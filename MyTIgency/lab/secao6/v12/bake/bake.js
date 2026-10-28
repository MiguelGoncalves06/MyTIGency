// Bake dos assets da v12 (ver index.html). Resultado em window.__bake:
// { 'caminho/relativo.png': dataURL, 'caminho.json': objeto } — bake.mjs grava.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import pcUrl from '../../../../src/assets/pc-terrarium.min.glb?url'

const out = {}
const devices = {} // nome → { w, h, screen: { x, y, w, h, r } } (px da imagem)
const PAL = [[20, 20, 20], [95, 95, 95], [185, 185, 185], [255, 255, 255]] // o dither do site (ditherSprite.PAL)

const loadImg = (src) => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src })
function canvasOf(src, w = src.naturalWidth || src.width, h = src.naturalHeight || src.height) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d').drawImage(src, 0, 0, w, h)
  return c
}
const show = (c) => document.body.append(c)

// apaga (alpha 0) o fundo ligado às bordas que passa no teste isBg
function floodClear(d, w, h, isBg) {
  const seen = new Uint8Array(w * h)
  const st = []
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1)
  while (st.length) {
    const i = st.pop()
    if (seen[i]) continue
    seen[i] = 1
    const k = i * 4
    if (d[k + 3] && !isBg(d[k], d[k + 1], d[k + 2])) continue
    d[k + 3] = 0
    const x = i % w
    if (x > 0) st.push(i - 1)
    if (x < w - 1) st.push(i + 1)
    if (i >= w) st.push(i - w)
    if (i < w * (h - 1)) st.push(i + w)
  }
  // franja: pixel opaco claro colado no fundo apagado fica meio transparente
  for (let i = 0; i < w * h; i++) {
    const k = i * 4
    if (!d[k + 3]) continue
    const n = [i - 1, i + 1, i - w, i + w].some((j) => j >= 0 && j < w * h && !d[j * 4 + 3])
    if (n && isBg(d[k] - 18, d[k + 1] - 18, d[k + 2] - 18)) d[k + 3] = 110
  }
}
const whiteish = (t) => (r, g, b) => r > t && g > t && b > t && Math.max(r, g, b) - Math.min(r, g, b) < 26

// verde de chroma → transparente; devolve a caixa do verde (o vão da tela)
function chroma(d, w, h) {
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let i = 0; i < w * h; i++) {
    const k = i * 4, r = d[k], g = d[k + 1], b = d[k + 2]
    const ex = g - Math.max(r, b)
    if (ex > 60 && g > 120) {
      d[k + 3] = 0
      const x = i % w, y = (i / w) | 0
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    } else if (ex > 18) { d[k + 1] = Math.max(r, b) } // tira o verde que vazou na borda
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

// buraco arredondado (alpha 0) na tela
function hole(c, s) {
  const ctx = c.getContext('2d')
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.roundRect(s.x, s.y, s.w, s.h, s.r)
  ctx.fill()
  ctx.restore()
}

// dither de 4 cinzas (Bayer 8×8), em células de cell px; mantém o alpha
const bayer8 = (() => {
  const m = [[0, 2], [3, 1]]
  let b = m
  for (let n = 2; n < 8; n *= 2) b = Array.from({ length: n * 2 }, (_, y) => Array.from({ length: n * 2 }, (_, x) => 4 * b[y % n][x % n] + m[(y / n) | 0][(x / n) | 0]))
  return b.map((r) => r.map((v) => (v + 0.5) / 64))
})()
function dither(c, cell = 2, contrast = 1.25) {
  const w = c.width, h = c.height
  const ctx = c.getContext('2d')
  const img = ctx.getImageData(0, 0, w, h), d = img.data
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
    const k = (y * w + x) * 4
    const l = (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255
    const v = Math.min(1, Math.max(0, (l - 0.5) * contrast + 0.5)) * 3
    const t = bayer8[(y / cell) % 8][(x / cell) % 8]
    const lv = Math.min(3, Math.floor(v) + (v % 1 > t ? 1 : 0))
    for (let yy = y; yy < Math.min(h, y + cell); yy++) for (let xx = x; xx < Math.min(w, x + cell); xx++) {
      const j = (yy * w + xx) * 4
      ;[d[j], d[j + 1], d[j + 2]] = PAL[lv]
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}
const copy = (c) => canvasOf(c)
const png = (c) => c.toDataURL('image/png')

// ---------- PCs e TVs das fotos ----------
async function photoDevice(name, src, { screen = null, bg = 240 } = {}) {
  const c = canvasOf(await loadImg(src))
  const ctx = c.getContext('2d')
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const s = screen ?? chroma(img.data, c.width, c.height)
  floodClear(img.data, c.width, c.height, whiteish(bg))
  ctx.putImageData(img, 0, 0)
  if (screen) hole(c, screen)
  devices[name] = { w: c.width, h: c.height, screen: { r: 10, ...s } }
  out[`img/${name}.png`] = png(c)
  out[`img/${name}-d.png`] = png(dither(copy(c), 3))
  show(c)
}

// ---------- o PC da seção 2 (pc-terrarium.min.glb), de frente ----------
// Mesmo arranjo do tv3d.js (maior dimensão = 1.7, centrado, frente para +Z) e
// o vidro medido no Manifesto.jsx (TV_MODEL.screenShape).
const S2_SCREEN = { CX: -0.15, CY: 0.175, HX: 0.41, HY: 0.3, Z0: 0.21 }
async function glbDevice() {
  const W = 1400, H = 1400
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(W, H)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.85
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.8))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(2, 3, 5)
  scene.add(key)
  const { scene: model } = await new GLTFLoader().loadAsync(pcUrl)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.position.sub(box.getCenter(new THREE.Vector3()))
  model.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.metalness = 0 })
  const pivot = new THREE.Group()
  pivot.add(model)
  pivot.scale.setScalar(1.7 / Math.max(size.x, size.y, size.z))
  scene.add(pivot)
  // de frente, quase ortográfica (lente longa), centrada no PC
  const cam = new THREE.PerspectiveCamera(12, W / H, 0.1, 100)
  cam.position.set(0, 0.05, 9)
  cam.lookAt(0, 0.05, 0)
  renderer.render(scene, cam)
  const c = canvasOf(renderer.domElement, W, H)
  // o vidro projetado
  const pr = (x, y) => { const v = new THREE.Vector3(x, y, S2_SCREEN.Z0).project(cam); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H] }
  const { CX, CY, HX, HY } = S2_SCREEN
  const [ax, ay] = pr(CX - HX, CY + HY), [bx, by] = pr(CX + HX, CY - HY)
  // recorta a imagem justa no PC
  const d = c.getContext('2d').getImageData(0, 0, W, H).data
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 8) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const P = 4
  x0 -= P; y0 -= P; x1 += P; y1 += P
  const cut = document.createElement('canvas')
  cut.width = x1 - x0; cut.height = y1 - y0
  cut.getContext('2d').drawImage(c, -x0, -y0)
  // o vidro medido fica um pouco aquém da moldura (à direita e no alto): folga no buraco
  const s = { x: Math.round(ax - x0) - 3, y: Math.round(ay - y0) - 8, w: Math.round(bx - ax) + 17, h: Math.round(by - ay) + 12, r: 8 }
  devices.s2 = { w: cut.width, h: cut.height, screen: s, glass: true }
  // o render sem buraco (o vidro do modelo) e com buraco
  out['img/s2-full.png'] = png(cut)
  const holed = copy(cut)
  hole(holed, s)
  out['img/s2.png'] = png(holed)
  out['img/s2-d.png'] = png(dither(copy(holed), 3, 1.4))
  show(holed)
}

// ---------- ícones das folhas de referência ----------
// máscara do que não é branco → dilata (junta as partes de um ícone) →
// componentes conexos → cada caixa vira um png com o branco de fora apagado
async function iconSheet(tag, src) {
  const c = canvasOf(await loadImg(src))
  const w = c.width, h = c.height
  const d = c.getContext('2d').getImageData(0, 0, w, h).data
  const bg = whiteish(232)
  const m = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) m[i] = bg(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) ? 0 : 1
  const R = 7
  const dil = new Uint8Array(w * h)
  const tmp = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -R; x < w; x++) { if (x + R < w) s += m[y * w + x + R]; if (x - R - 1 >= 0) s -= m[y * w + x - R - 1]; if (x >= 0) tmp[y * w + x] = s > 0 ? 1 : 0 } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -R; y < h; y++) { if (y + R < h) s += tmp[(y + R) * w + x]; if (y - R - 1 >= 0) s -= tmp[(y - R - 1) * w + x]; if (y >= 0) dil[y * w + x] = s > 0 ? 1 : 0 } }
  const lab = new Int32Array(w * h)
  const boxes = []
  for (let i = 0; i < w * h; i++) {
    if (!dil[i] || lab[i]) continue
    const id = boxes.length + 1
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0
    const st = [i]
    lab[i] = id
    while (st.length) {
      const j = st.pop()
      const x = j % w, y = (j / w) | 0
      if (m[j]) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (k >= 0 && k < w * h && dil[k] && !lab[k]) { lab[k] = id; st.push(k) }
    }
    if (n > 600 && x1 - x0 > 24 && y1 - y0 > 24) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, id })
  }
  const list = []
  boxes.forEach((b, i) => {
    const P = 3
    const ic = document.createElement('canvas')
    ic.width = b.w + P * 2; ic.height = b.h + P * 2
    const ictx = ic.getContext('2d')
    ictx.fillStyle = '#fff'
    ictx.fillRect(0, 0, ic.width, ic.height)
    ictx.drawImage(c, b.x - P, b.y - P, ic.width, ic.height, 0, 0, ic.width, ic.height)
    const img = ictx.getImageData(0, 0, ic.width, ic.height)
    // só o próprio ícone: o que é de outro componente na mesma caixa vira fundo
    for (let y = 0; y < ic.height; y++) for (let x = 0; x < ic.width; x++) {
      const sx = b.x - P + x, sy = b.y - P + y
      const l = sx >= 0 && sy >= 0 && sx < w && sy < h ? lab[sy * w + sx] : 0
      if (l && l !== b.id) img.data.fill(255, (y * ic.width + x) * 4, (y * ic.width + x) * 4 + 4)
    }
    floodClear(img.data, ic.width, ic.height, whiteish(228))
    ictx.putImageData(img, 0, 0)
    const name = `${tag}-${String(i).padStart(2, '0')}`
    out[`ico/${name}.png`] = png(ic)
    out[`ico/${name}-d.png`] = png(dither(copy(ic), 2))
    list.push({ name, w: ic.width, h: ic.height })
  })
  // folha de contato numerada (só para escolher)
  const sheet = canvasOf(c)
  const sx = sheet.getContext('2d')
  sx.font = 'bold 28px monospace'
  boxes.forEach((b, i) => { sx.strokeStyle = '#f0f'; sx.lineWidth = 2; sx.strokeRect(b.x, b.y, b.w, b.h); sx.fillStyle = '#f0f'; sx.fillText(i, b.x, b.y + 26) })
  out[`_sheet-${tag}.png`] = sheet.toDataURL('image/jpeg', 0.7)
  return list
}

// ---------- folha de contato dos wallpapers ----------
async function wallSheet() {
  const names = Object.keys(import.meta.glob('../wall/*.jpg', { eager: true, query: '?url', import: 'default' }))
  const urls = Object.values(import.meta.glob('../wall/*.jpg', { eager: true, query: '?url', import: 'default' }))
  const TW = 400, TH = 260
  const c = document.createElement('canvas')
  c.width = TW * 4; c.height = TH * Math.ceil(urls.length / 4)
  const ctx = c.getContext('2d')
  ctx.font = 'bold 20px monospace'
  for (let i = 0; i < urls.length; i++) {
    const im = await loadImg(urls[i])
    const x = (i % 4) * TW, y = Math.floor(i / 4) * TH
    const s = Math.max(TW / im.width, TH / im.height)
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, TW, TH); ctx.clip()
    ctx.drawImage(im, x + (TW - im.width * s) / 2, y + (TH - im.height * s) / 2, im.width * s, im.height * s)
    ctx.restore()
    ctx.fillStyle = '#f0f'
    ctx.fillText(`${i} ${names[i].split('/').pop()}`, x + 6, y + 24)
  }
  out['_sheet-wall.png'] = c.toDataURL('image/jpeg', 0.7)
}

const refs = (n) => new URL(`../refs/${n}`, import.meta.url).href
window.__bake = (async () => {
  await photoDevice('pc-bege', refs('6.png'))
  await photoDevice('tv-memorex', refs('8.png'))
  await photoDevice('monitor', refs('7.webp'), { screen: { x: 88, y: 84, w: 626, h: 480, r: 14 }, bg: 244 })
  await glbDevice()
  const icons = [...await iconSheet('a', refs('3.webp')), ...await iconSheet('b', refs('4.webp')), ...await iconSheet('c', refs('5.webp'))]
  await wallSheet()
  out['devices.json'] = devices
  out['_icons.json'] = icons
  return out
})()
