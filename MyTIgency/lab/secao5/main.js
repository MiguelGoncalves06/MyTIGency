// LAB — seção 5 do Manifesto, v2. Usa a faixa e o cursor 3D reais do site
// (src/utils/manifestoRibbon.js, src/utils/cursor3d.js). Tudo preso ao scroll
// (função pura da posição: volta exatamente quando o scroll volta):
//   shift  — a cena A sai pela esquerda; enquanto a faixa passa por cima do
//            cursor 3D, ele se dissolve em pixels (o dither dele some em ordem
//            Bayer) e, no mesmo lugar, os pixels da mão de link se juntam.
//   go     — a mão vira devagar de ponta-cabeça e desce até o MEIO da régua.
//   press  — clique: afunda, marca de impacto vermelha.
//   burst  — a mão se desfaz em pixels: os que sobram evaporam (como a caneta
//            do ato II), os outros pairam onde vai ficar "SURGE"; a régua sobe
//            até a linha entre as frases e a cabeça reaparece no 000%.
//   line   — UMA varredura lenta: nada · SURGE (os pixels montam a palavra
//            coluna a coluna) · antes · da · HORA (o O é um relógio).
//   end    — "HORA." em 100%: o marca-texto vermelho passa por trás.
import Lenis from 'lenis'
import { mountRibbon } from '../../src/utils/manifestoRibbon'
import { mountCursor3D } from '../../src/utils/cursor3d'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - (1 - t) ** 3
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const lerp = (a, b, t) => a + (b - a) * t

// Fases em alturas de tela de scroll (o shift é 1 px de scroll = 1 px lateral,
// como no site). Tudo longo: a seção fala de ritmo, nada pode correr.
const VH = { go: 1, press: 0.35, burst: 1.5, line: 3.4, end: 1.1 }
// UMA varredura da régua para a frase inteira, na ordem de leitura: onde
// (fração da régua) cada palavra emerge. SURGE se monta entre SURGE_AT[0] e [1].
const WORD_AT = [0.1, 0.31, 0.55, 0.7, 0.86]
const SURGE_AT = [0.22, 0.4]
// geometria do fim do deslocamento (= site): faixa a 27% da largura; no começo espia a 97%
const RIB_START = 0.97
const RIB_END = 0.27
const B_CENTER = 0.63
// cursor 3D ao lado do olho (onde ele já está no fim da cena A)
const AWAY = { x: 0.8, y: 0.5, size: 0.11 }
const AWAY_DIR = -0.22
const CLICK_AT = 0.5 // onde a mão clica na régua do rodapé (fração)
const RULER_LABELS = ['busca', 'traço', 'quem']
const RULER_FRACS = [0.18, 0.5, 0.86]

// Mão de link em pixel (k contorno, w papel; g = sombra, calculada). Ponta do dedo: coluna 7, linha 0.
const HAND = [
  '......kk.........',
  '.....kwwk........',
  '.....kwwk........',
  '.....kwwk........',
  '.....kwwk........',
  '.....kwwkkk......',
  '.....kwwkwwkkk...',
  '.....kwwkwwkwwkk.',
  '.kk..kwwkwwkwwkwk',
  'kwwk.kwwwwwwwwkwk',
  'kwwwkkwwwwwwwwwwk',
  '.kwwwkwwwwwwwwwwk',
  '..kwwwwwwwwwwwwwk',
  '..kwwwwwwwwwwwwwk',
  '...kwwwwwwwwwwwwk',
  '...kwwwwwwwwwwwk.',
  '....kwwwwwwwwwwk.',
  '....kwwwwwwwwwk..',
  '.....kwwwwwwwwk..',
  '.....kwwwwwwwwk..',
  '.....kkkkkkkkkk..',
]
const HAND_TIP = 7
const COLORS = { k: '#4a4a46', w: '#f4f3ef', g: '#b9b9b9' }
// fonte de pixel 5×7 só com as letras de SURGE
const GLYPHS = {
  S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
}
const PX_WORD = 'SURGE'
const PX_COLS = PX_WORD.length * 6 - 1

// aleatório com semente: a mesma explosão a cada scroll
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const $ = (s) => document.querySelector(s)
const track = $('.track')
const sceneB = $('.scene--b')
const slot = $('.slot')
const ruler = $('.ruler')
const rStops = $('.stops')
const rFill = $('.ruler-path i')
const head = $('.head')
const headVal = head.firstChild
const impact = $('.impact')
const phaseOut = $('#phase')
const pxCanvas = $('.px-cv')
const px = pxCanvas.getContext('2d')
const pxWord = $('.px-word')
const clockH = $('.clock .h')
const clockM = $('.clock .m')
const hora = $('.hora')
const words = [...document.querySelectorAll('.w')]
const cueEls = [...document.querySelectorAll('[data-cue]')] // ordem da frase: nada, surge, antes, da, hora
impact.firstChild.innerHTML = [0, 45, 90, 135, 180, 225, 270, 315]
  .map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('')
$('#restart').addEventListener('click', () => lenis.scrollTo(0, { immediate: true }))

const rib = mountRibbon($('canvas.ribbon'))
const cvCursor = $('.cursor-cv')
let cur = null
mountCursor3D(cvCursor, { size: 90 }).then((c) => { cur = c })

rStops.innerHTML = RULER_LABELS.map((t, i) => `<span class="stop old"><b>0${i + 1}</b> ${t}</span>`).join('')
  + cueEls.map((el) => `<span class="stop cue">${el.dataset.cue}</span>`).join('')
const oldStops = [...rStops.querySelectorAll('.old')]
const cueStops = [...rStops.querySelectorAll('.cue')]
oldStops.forEach((el, i) => { el.style.left = `${RULER_FRACS[i] * 100}%` })

// células da mão, com sombra à direita de cada dedo
const handCells = []
HAND.forEach((row, r) => [...row].forEach((ch, c) => {
  if (ch === '.') return
  const shade = ch === 'w' && (row[c + 1] === 'k' || HAND[r + 1]?.[c] === 'k')
  handCells.push({ c, r, color: COLORS[shade ? 'g' : ch] })
}))
// células de SURGE (coluna, linha)
const wordCells = []
;[...PX_WORD].forEach((ch, li) => GLYPHS[ch].forEach((row, r) => [...row].forEach((v, c) => {
  if (v === '#') wordCells.push({ c: li * 6 + c, r })
})))

let W = 0
let H = 0
let dpr = 1
let shift = 0
let P = {}
let total = 0
let bottomBox = null
let slotBox = null
let HC = 4 // px por célula da mão
let PC = 8 // px por célula de SURGE
let wordBox = null // canto de SURGE na tela
let parts = [] // pixels da mão: { o (origem rel. à ponta), color, word?: alvo, burst, cloud, rise, dl, blink }

function buildParticles() {
  const rand = rng(5)
  const order = handCells.map((_, i) => i).sort(() => rand() - 0.5)
  const asWord = new Map(order.slice(0, wordCells.length).map((hi, k) => [hi, wordCells[k]]))
  parts = handCells.map((cell, i) => {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.4 // para cima, aberto
    const dist = 30 + rand() * 90
    const t = asWord.get(i)
    return {
      // mão de ponta-cabeça na hora do clique: linha r fica acima da ponta
      o: [(cell.c - HAND_TIP) * HC, -(cell.r + 1) * HC],
      color: cell.color,
      word: t ? [wordBox.x + t.c * PC, wordBox.y + t.r * PC] : null,
      frac: t ? lerp(SURGE_AT[0], SURGE_AT[1], (t.c + 0.5) / PX_COLS) : 0,
      // morph 3D → mão: cada pixel chega de um ponto do corpo do cursor, na sua vez
      th: rand(),
      from: [(rand() - 0.5) * 2, (rand() - 0.5) * 2],
      burst: [Math.cos(a) * dist, Math.sin(a) * dist],
      cloud: [(rand() - 0.5) * 160, (rand() - 0.5) * 90 - 20],
      rise: [(rand() - 0.5) * 80, -(90 + rand() * 220)],
      dl: rand() * 0.35,
      blink: rand() * 10,
    }
  })
}

function measure() {
  W = window.innerWidth
  H = window.innerHeight
  dpr = Math.min(2, window.devicePixelRatio || 1)
  pxCanvas.width = Math.round(W * dpr)
  pxCanvas.height = Math.round(H * dpr)
  rib.resize(W, H)
  shift = (RIB_START - RIB_END) * W
  sceneB.style.left = `${shift + (B_CENTER - 0.5) * W}px`
  let at = shift
  P = { shift: 0 }
  for (const k of Object.keys(VH)) { P[k] = at; at += VH[k] * H }
  total = at
  document.body.style.height = `${total + H}px`
  bottomBox = { x: W * 0.03, y: H - H * 0.026 - 34, w: W * 0.94 }
  HC = Math.max(3, Math.round((AWAY.size * H) / HAND.length))
  // SURGE: célula = altura de versal / 7
  const fs = parseFloat(getComputedStyle(pxWord.parentElement).fontSize)
  PC = Math.max(4, Math.round((fs * 0.7) / 7))
  Object.assign(pxWord.style, { width: `${PX_COLS * PC}px`, height: `${7 * PC}px` })
  // mede com a trilha na posição final
  track.style.transform = `translateX(${-shift}px)`
  const s = slot.getBoundingClientRect()
  slotBox = { x: s.left, y: s.top, w: s.width }
  const wr = pxWord.getBoundingClientRect()
  wordBox = { x: wr.left, y: wr.bottom - 7 * PC }
  cueStops.forEach((el, i) => { el.style.left = `${WORD_AT[i] * 100}%` })
  buildParticles()
}

// mão em pixel: ponta em (x, y); flip 1 = aponta para cima, −1 = para baixo.
// form 0→1: os pixels chegam, cada um na sua vez, de um ponto do corpo do
// cursor 3D (centro c, raio rad) até o lugar dele na mão.
function drawHand(x, y, flip, form = 1, c = null, rad = 0) {
  handCells.forEach((cell, i) => {
    const p = parts[i]
    const a = form >= 1 ? 1 : easeInOut(ramp(form, p.th * 0.6, p.th * 0.6 + 0.4))
    if (a <= 0) return
    let cx = x + (cell.c - HAND_TIP) * HC
    let cy = flip >= 0 ? y + cell.r * HC * flip : y - (cell.r + 1) * HC * -flip
    if (a < 1 && c) {
      cx = lerp(c[0] + p.from[0] * rad, cx, a)
      cy = lerp(c[1] + p.from[1] * rad, cy, a)
    }
    px.globalAlpha = Math.min(1, a * 1.6)
    px.fillStyle = a < 0.7 ? COLORS.g : cell.color
    px.fillRect(Math.round(cx), Math.round(cy), HC, Math.max(1, Math.ceil(HC * Math.abs(flip))))
  })
  px.globalAlpha = 1
}

let lastPressed
function render() {
  if (!W) return
  const d = window.scrollY
  px.setTransform(dpr, 0, 0, dpr, 0, 0)
  px.clearRect(0, 0, W, H)

  // shift: a trilha anda, a faixa varre
  const b = Math.min(d, shift)
  track.style.transform = `translateX(${-b}px)`
  const ribX = RIB_START * W - b
  rib.draw(ribX, b)

  // régua: rodapé → linha entre as frases (sem passar dela: em cima tem texto)
  const u = ramp(d, P.burst, P.line)
  const rise = easeInOut(ramp(u, 0.15, 0.85))
  const box = { x: lerp(bottomBox.x, slotBox.x, rise), y: lerp(bottomBox.y, slotBox.y, rise), w: lerp(bottomBox.w, slotBox.w, rise) }
  Object.assign(ruler.style, { transform: `translate(${box.x}px, ${box.y}px)`, width: `${box.w}px` })
  oldStops.forEach((el) => { el.style.opacity = `${1 - ramp(u, 0.1, 0.4)}` })

  // cabeça: no rodapé ela está em 100% (fim do pin). Some devagar durante a
  // subida e reaparece no 000% — sem voltar varrendo; depois UMA passada só.
  const t = ramp(d, P.line, P.end)
  const hp = u < 0.5 ? 1 : t
  const headOn = d >= P.line ? 1 : u < 0.5 ? 1 - ramp(u, 0.05, 0.35) : ramp(u, 0.65, 0.95)
  head.style.transform = `translateX(${hp * box.w}px)`
  head.style.opacity = rFill.style.opacity = `${headOn}`
  head.classList.toggle('end', hp > 0.95)
  headVal.textContent = `${String(Math.round(hp * 100)).padStart(3, '0')}%`
  rFill.style.transform = `scaleX(${hp})`
  cueStops.forEach((el, i) => {
    el.style.opacity = `${ramp(u, 0.75, 1)}`
    el.classList.toggle('on', d >= P.line && t >= WORD_AT[i] - 0.001)
  })

  // palavras: emergem devagar de baixo da régua quando a cabeça passa
  const prog = d >= P.line ? t : -1
  cueEls.forEach((el, i) => {
    if (!el.classList.contains('w')) return
    el.style.setProperty('--in', easeInOut(ramp(prog, WORD_AT[i] - 0.02, WORD_AT[i] + 0.1)))
  })
  // relógio do O: os ponteiros acertam o meio-dia quando a régua chega ao fim
  const c = easeInOut(ramp(prog, WORD_AT[4], 1))
  clockM.setAttribute('transform', `rotate(${-(1 - c) * 360})`)
  clockH.setAttribute('transform', `rotate(${-(1 - c) * 60})`)
  ruler.classList.toggle('done', d >= P.end)
  hora.style.setProperty('--mark', easeInOut(ramp(d, P.end, P.end + VH.end * H * 0.7)))

  // ----- cursor: 3D → mão em pixel → pixels → SURGE -----
  const sAway = AWAY.size * H
  const tip0 = [AWAY.x * W, AWAY.y * H]
  // centro visível do cursor 3D (apontando para a direita: o corpo fica atrás da ponta)
  const c3 = [tip0[0] - sAway * 0.42, tip0[1] + sAway * 0.12]
  // a mão se forma centrada nesse mesmo ponto (nada muda de lugar na troca)
  const handTip0 = [c3[0] - (HAND[0].length / 2 - HAND_TIP) * HC, c3[1] - (HAND.length * HC) / 2]
  const clickPt = [bottomBox.x + bottomBox.w * CLICK_AT, bottomBox.y + 22]
  // morph enquanto a faixa passa por cima do cursor (lento: ~6 larguras da faixa de scroll)
  const R = rib.reach()
  const morph = ramp(tip0[0] + R * 1.6 - ribX, 0, R * 6)
  if (cur) {
    // o dither do cursor some em ordem Bayer (uReveal do cursor3d)
    const fade = 1 - easeInOut(ramp(morph, 0, 0.65))
    if (fade > 0) cur.set(tip0[0], tip0[1], Math.PI / 2, 1, fade, sAway, 0, cur.aimFor(AWAY_DIR))
    else cur.set(-9999, 0, 0, 1, 0)
  }
  const go = easeInOut(ramp(d, P.go, P.press))
  const press = ramp(d, P.press, P.burst)
  if (d < P.burst) {
    // arco lento até o meio da régua; no caminho a mão vira para apontar para baixo
    const g = go
    const mid = [lerp(handTip0[0], clickPt[0], 0.5) + W * 0.05, Math.min(handTip0[1], clickPt[1]) - H * 0.08]
    const k = 1 - g
    let x = k * k * handTip0[0] + 2 * k * g * mid[0] + g * g * clickPt[0]
    let y = k * k * handTip0[1] + 2 * k * g * mid[1] + g * g * clickPt[1]
    const flip = Math.cos(Math.PI * easeInOut(ramp(g, 0.15, 0.85)))
    const dip = Math.sin(Math.PI * ramp(press, 0, 0.6))
    y += dip * HC * 1.5
    if (morph > 0) drawHand(x, y, flip, morph, c3, sAway * 0.45)
    // marca de impacto na ponta, ao cruzar o meio do clique
    const pressed = press >= 0.3
    if (pressed !== lastPressed) {
      if (lastPressed !== undefined && pressed) {
        Object.assign(impact.style, { left: `${clickPt[0]}px`, top: `${clickPt[1] + HC}px` })
        impact.classList.remove('on')
        void impact.offsetWidth
        impact.classList.add('on')
      }
      lastPressed = pressed
    }
  } else {
    lastPressed = true
    // pixels: soltam em ordem aleatória; os de SURGE pairam e depois montam a palavra
    for (const p of parts) {
      const a = easeOut(ramp(u, p.dl, p.dl + 0.3))
      const ox = clickPt[0] + p.o[0]
      const oy = clickPt[1] + p.o[1]
      const bx = ox + p.burst[0] * a
      const by = oy + p.burst[1] * a
      if (!p.word) {
        // evapora devagar: sobe, desliza e apaga (sem piscar)
        const e = easeInOut(ramp(u, p.dl + 0.1, p.dl + 0.65))
        if (e >= 1) continue
        px.globalAlpha = 1 - e
        px.fillStyle = e > 0.35 ? '#FF4438' : p.color // como a caneta do ato II: vira vermelho ao evaporar
        px.fillRect(Math.round(bx + p.rise[0] * e), Math.round(by + p.rise[1] * e * e), HC, HC)
        px.globalAlpha = 1
        continue
      }
      const shimmer = Math.sin(d * 0.012 + p.blink) * 3
      const cloud = [p.word[0] + p.cloud[0], p.word[1] + p.cloud[1] + shimmer]
      const f = easeInOut(ramp(u, 0.3 + p.dl * 0.5, 1))
      let x = lerp(bx, cloud[0], f)
      let y = lerp(by, cloud[1], f)
      let size = lerp(HC, PC * 0.55, f)
      // montagem: quando a cabeça passa pela coluna do pixel
      const s = easeInOut(ramp(prog, p.frac - 0.04, p.frac + 0.03))
      x = lerp(x, p.word[0], s)
      y = lerp(y, p.word[1], s)
      size = lerp(size, PC, s)
      px.globalAlpha = s > 0 ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(p.blink + d * 0.004))
      px.fillStyle = s > 0.5 ? '#f4f3ef' : p.color
      px.fillRect(Math.round(x), Math.round(y), Math.ceil(size), Math.ceil(size))
      px.globalAlpha = 1
    }
  }

  const now = ['shift', ...Object.keys(VH)].filter((k) => d >= P[k]).pop()
  phaseOut.textContent = `fase: ${now} · ${Math.round((d / total) * 100)}%`
}

const lenis = new Lenis()
function raf(t) { lenis.raf(t); render(); requestAnimationFrame(raf) }
requestAnimationFrame(raf)
window.addEventListener('resize', () => { measure(); render() })
document.fonts.ready.then(() => { measure(); render() })
window.__lab = { render, measure } // para inspecionar pelo console
