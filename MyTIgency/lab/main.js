// LAB: compara modelos para a TV do Manifesto com o mesmo tv3d.js (giro,
// inclinação, sintonia, foco). Cada modelo precisa de `front` (rotação que
// vira a frente para +Z) e `screenShape` (vidro medido — ver SCREEN em
// tv3d.js); "Medir vidro" estima pelo material transparente do modelo.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mountDitherTV, SCREEN } from '../src/utils/tv3d.js'
import mytiUrl from '../src/assets/MyTi.svg'

const TV_PALETTE = ['#1c1c1c', '#6e6e6e', '#bcbcbc', '#ffffff'] // mesmo do Manifesto
const TV_SIZE = 1.7 // mesmo do tv3d.js
const DEG = Math.PI / 180
function shape(CX, CY, HX, HY, Z0, A, B, C) { return { CX, CY, HX, HY, Z0, A, B, C, OFFSET: SCREEN.OFFSET, MARGIN: SCREEN.MARGIN } }

// Ordem do LAB: 1 · 6 · 8 · 5 · 7. Créditos anotados à parte (só o escolhido vai para o site).
const MODELS = [
  { id: 'atual', name: 'Atual (tv.min.glb)', url: new URL('../src/assets/tv.min.glb', import.meta.url).href, front: -90, screenShape: SCREEN },
  // 1, 6 e 5: "Medir vidro" (material transparente). 8 e 7 não têm vidro:
  // medidos pelo mapa de profundidade da frente (vão entre as bordas).
  { id: '1', name: '1 · Old TV', url: './models/1-old-tv.glb', front: 0, screenShape: shape(0, 0.185, 0.6468, 0.4851, 0.6526, 0.0628, 0, 0) },
  { id: '6', name: '6 · Retro CRT TV (gato)', url: './models/6-retro-crt-tv.glb', front: -90, screenShape: shape(0, 0.11, 0.7742, 0.5782, 0.644, 0.1051, 0.0575, -0.0072) },
  { id: '8', name: '8 · Old PC', url: './models/8-old-pc.glb', front: -90, screenShape: shape(0.1, 0.22, 0.41, 0.29, 0.43, 0.037, 0.043, 0) },
  { id: '5', name: '5 · Retro TV (EVA)', url: './models/5-retro-tv.glb', front: -90, screenShape: shape(0, 0.105, 0.5586, 0.5537, 0.7187, 0.0669, 0.0657, -0.0135), showScreen: false },
  { id: '7', name: '7 · PC terrário', url: './models/7-pc-terrarium.glb', front: 0, screenShape: shape(-0.15, 0.175, 0.41, 0.3, 0.21, 0, 0, 0), showScreen: false },
]

const SHAPE_KEYS = [
  ['CX', -0.6, 0.6], ['CY', -0.6, 0.6], ['HX', 0.1, 0.85], ['HY', 0.1, 0.85],
  ['Z0', -0.2, 1], ['A', -0.1, 0.4], ['B', -0.1, 0.4], ['C', -0.2, 0.2],
]

const $ = (id) => document.getElementById(id)
let current = MODELS[1]
let tv = null
let passRaf = 0

function mount() {
  cancelAnimationFrame(passRaf)
  tv?.dispose()
  // canvas novo: o WebGL anterior foi descartado com o dispose()
  const fresh = canvasRef.el.cloneNode()
  canvasRef.el.replaceWith(fresh)
  canvasRef.el = fresh
  tv = mountDitherTV(fresh, {
    url: current.url, palette: TV_PALETTE, revealDuration: 2.8, spinDuration: 3.4,
    screenImage: mytiUrl, tune: Number($('tune').value),
    front: current.front * DEG,
    screenShape: current.screenShape || SCREEN,
    showScreen: current.showScreen !== false,
    colorBoost: current.colorBoost ?? 2.5,
  })
  tv.setTurn(Number($('turn').value))
  syncControls()
}
const canvasRef = { el: $('tv') }

// ---------- Modelos ----------
for (const m of MODELS) {
  const b = document.createElement('button')
  b.textContent = m.name
  b.onclick = () => { current = m; mount() }
  b.dataset.id = m.id
  $('models').append(b)
}

// ---------- Tela da sintonia ----------
$('screen-toggle').onclick = () => {
  current.showScreen = current.showScreen === false
  tv.setScreenVisible(current.showScreen)
  syncControls()
}

// ---------- Efeitos ----------
for (const id of ['turn', 'tune']) {
  $(id).oninput = () => {
    cancelAnimationFrame(passRaf)
    if (id === 'turn') tv.setTurn(Number($(id).value))
    else tv.setTune(Number($(id).value))
    syncControls()
  }
}
$('replay').onclick = mount
$('boost').onchange = () => { current.colorBoost = Number($('boost').value); mount() }

// Mesma relação do pin lateral (useManifestoHorizontal): a trilha anda,
// a TV gira até TV_TURN e sintoniza aos 42% do percurso; o scroll rápido
// do começo engrossa o dither (foco).
$('pass').onclick = () => {
  cancelAnimationFrame(passRaf)
  const start = performance.now()
  const DURATION = 3200
  const sine = (t) => -(Math.cos(Math.PI * t) - 1) / 2
  tv.setScrolling(true)
  const step = (now) => {
    const t = Math.min(1, (now - start) / DURATION)
    const x = -t * window.innerWidth * 1.5
    tv.setShift(x)
    tv.setScroll(t * window.innerHeight * 6 * (1 - t * 0.5))
    tv.setTurn(-1.6 * sine(t))
    tv.setTune(t / 0.42)
    $('turn').value = -1.6 * sine(t)
    $('tune').value = Math.min(1, t / 0.42)
    syncControls()
    if (t < 1) passRaf = requestAnimationFrame(step)
    else tv.setScrolling(false)
  }
  passRaf = requestAnimationFrame(step)
}

// ---------- Calibração ----------
for (const [key, min, max] of SHAPE_KEYS) {
  const label = document.createElement('label')
  label.innerHTML = `${key} <input type="range" min="${min}" max="${max}" step="0.001" data-key="${key}"><output></output>`
  label.querySelector('input').oninput = (e) => {
    current.screenShape = { ...shapeOf(current), [key]: Number(e.target.value) }
    tv.setScreenShape(current.screenShape)
    syncControls()
  }
  $('shape').append(label)
}
$('front').onchange = () => { current.front = Number($('front').value); current.screenShape = null; mount() }
$('measure').onclick = async () => {
  $('measure-note').textContent = 'Medindo…'
  const { shape, note } = await measureGlass(current)
  current.screenShape = shape
  $('measure-note').textContent = note
  tv.setScreenShape(shape)
  syncControls()
}

const shapeOf = (m) => ({ CX: 0, ...SCREEN, ...m.screenShape })

function syncControls() {
  for (const b of $('models').children) b.setAttribute('aria-pressed', String(b.dataset.id === current.id))
  const on = current.showScreen !== false
  $('screen-toggle').setAttribute('aria-pressed', String(on))
  $('screen-toggle').textContent = `Tela da sintonia: ${on ? 'ligada' : 'desligada'}`
  $('boost').value = current.colorBoost ?? 2.5
  for (const id of ['turn', 'tune', 'boost']) $(id).nextElementSibling.value = Number($(id).value).toFixed(2)
  $('front').value = String(current.front)
  const shape = shapeOf(current)
  for (const input of $('shape').querySelectorAll('input')) {
    input.value = shape[input.dataset.key]
    input.nextElementSibling.value = shape[input.dataset.key].toFixed(3)
  }
  const round = Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, Math.round(v * 10000) / 10000]))
  $('config').value = JSON.stringify({ model: current.name, front: current.front, colorBoost: current.colorBoost ?? 2.5, screenShape: round, showScreen: on }, null, 2)
}

// Recria a normalização do tv3d.js (centra, gira a frente, maior dimensão
// = TV_SIZE) e dispara raios de frente (+Z → −Z) só no vidro (material
// transparente). Ajusta o abaulado z = Z0 − A·u² − B·v² + C·u²v².
const loader = new GLTFLoader()
async function measureGlass(m) {
  const { scene: model } = await loader.loadAsync(m.url)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.position.sub(box.getCenter(new THREE.Vector3()))
  const holder = new THREE.Group()
  holder.add(model)
  holder.rotation.y = m.front * DEG
  const root = new THREE.Group()
  root.add(holder)
  root.scale.setScalar(TV_SIZE / Math.max(size.x, size.y, size.z))
  root.updateMatrixWorld(true)

  const meshes = []
  model.traverse((o) => { if (o.isMesh) meshes.push(o) })
  const glass = meshes.filter((o) => [].concat(o.material).some((mat) => mat.transparent))
  const targets = glass.length ? glass : meshes
  const ray = new THREE.Raycaster()
  const zAt = (x, y) => {
    ray.set(new THREE.Vector3(x, y, 10), new THREE.Vector3(0, 0, -1))
    const hit = ray.intersectObjects(targets, false)[0]
    return hit ? hit.point.z : null
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let x = -0.9; x <= 0.9; x += 0.01) {
    for (let y = -0.9; y <= 0.9; y += 0.01) {
      if (zAt(x, y) === null) continue
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }
  if (minX === Infinity) return { shape: shapeOf(m), note: 'Nenhum vidro encontrado de frente — confira a Frente.' }

  const CX = (minX + maxX) / 2
  const CY = (minY + maxY) / 2
  const HX = ((maxX - minX) / 2) * 0.98
  const HY = ((maxY - minY) / 2) * 0.98
  const Z0 = zAt(CX, CY) ?? 0
  const u = 0.9
  const edge = (a, b) => (a ?? b ?? Z0)
  const zx = (edge(zAt(CX + HX * u, CY), zAt(CX - HX * u, CY)) + edge(zAt(CX - HX * u, CY), zAt(CX + HX * u, CY))) / 2
  const zy = (edge(zAt(CX, CY + HY * u), zAt(CX, CY - HY * u)) + edge(zAt(CX, CY - HY * u), zAt(CX, CY + HY * u))) / 2
  const A = (Z0 - zx) / (u * u)
  const B = (Z0 - zy) / (u * u)
  const zc = zAt(CX + HX * u, CY + HY * u) ?? (Z0 - A * u * u - B * u * u)
  const C = (zc - Z0 + A * u * u + B * u * u) / (u ** 4)
  const note = glass.length
    ? `Medido em ${glass.length} malha(s) de vidro. Ajuste fino nos sliders se precisar.`
    : 'Sem material de vidro: medido no modelo inteiro — ajuste nos sliders.'
  return { shape: { CX, CY, HX, HY, Z0, A, B, C, OFFSET: SCREEN.OFFSET, MARGIN: SCREEN.MARGIN }, note }
}

mount()
