// LAB — seção 5 do Manifesto, v3 ("depois"; a v2 continua em ../). Usa a faixa
// e o cursor 3D reais do site. Tudo preso ao scroll (função pura da posição),
// menos o relógio da cabeça da régua, que é o tempo real na página.
//   shift — a cena A sai pela esquerda; a faixa passa por cima do cursor 3D e
//           ele SOBREVIVE (é o mesmo personagem das seções 2–3); a frase 1 entra.
//   go    — a régua do rodapé sobe e encaixa entre as frases; o cursor vai até
//           o começo dela e assume a pose de cursor de interface.
//   press — clique no "play".
//   run   — o cursor se desfaz nos próprios pixels (o dither some em ordem
//           Bayer); os pixels viram a cabeça da régua, que anda capítulo a
//           capítulo: anda, para (batida), anda... A câmera acompanha.
//   words — no "agora", a frase 2 entra uma palavra por batida; em SURGE os
//           pixels montam a palavra e ela vira o texto real.
//   end   — o pincel que riscou "promessas" marca o HORA. Repouso.
import Lenis from 'lenis'
import { mountRibbon } from '../../../src/utils/manifestoRibbon'
import { mountCursor3D } from '../../../src/utils/cursor3d'
import brushRaw from '../../../src/assets/s4-brush.svg?raw'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - (1 - t) ** 3
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const lerp = (a, b, t) => a + (b - a) * t

// reduced motion: estado final direto, sem distância de scroll para encenar
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches

// Fases em alturas de tela de scroll (o shift é 1 px de scroll = 1 px lateral).
// ~3,9 telas no total (a v2 tinha 7,35): o ritmo vem do contraste anda/para,
// não da lentidão.
const VH = { go: 0.6, press: 0.2, run: 1.6, words: 1.0, end: 0.5 }
// geometria do fim do deslocamento (= site): faixa a 27% da largura; no começo espia a 97%
const RIB_START = 0.97
const RIB_END = 0.27
const ROW_LEFT = 0.38 // onde a frase 1 começa (fração da tela) no fim do shift
const ROW_RIGHT = 0.95 // onde a frase 2 termina quando a câmera chega
// cursor 3D ao lado do olho (onde ele já está no fim da cena A)
const AWAY = { x: 0.8, y: 0.5, size: 0.11 }
const AWAY_DIR = -0.22
const CLICK_SIZE = 0.085 // altura do cursor no clique (fração da tela)
const RULER_LABELS = ['busca', 'traço', 'quem'] // a régua do rodapé, como no site
const RULER_FRACS = [0.18, 0.5, 0.86]
// capítulos reais da página até aqui, onde a cabeça para; o último é agora
const CHAPTERS = ['conduz', 'sem', 'quem', 'mostrar', 'agora']
const STOPS = [0.16, 0.38, 0.6, 0.82, 1]
const MOVE = 0.38 // fração de cada trecho em que a cabeça anda; o resto é pausa
// batidas da frase 2 (fração da fase words): onde cada palavra entra, seca
const BEAT = { nada: 0.02, antes: 0.46, da: 0.56, hora: 0.66 }
const SNAP = 0.05
const SURGE_BUILD = 0.14 // pixels voam para SURGE, coluna a coluna (até ~0.32)
const SURGE_CRISP = [0.34, 0.42] // pixels → texto real

// Cursor de interface em pixel (k contorno, w miolo), ponta na coluna 0, linha 0:
// a silhueta da pose chapada do cursor 3D, que se solta em células.
const ARROW = [
  'k..........',
  'kk.........',
  'kwk........',
  'kwwk.......',
  'kwwwk......',
  'kwwwwk.....',
  'kwwwwwk....',
  'kwwwwwwk...',
  'kwwwwwwwk..',
  'kwwwwwwwwk.',
  'kwwwwwwwwwk',
  'kwwwwwkkkkk',
  'kwwkwwk....',
  'kwk.kwwk...',
  'kk..kwwk...',
  'k....kwwk..',
  '.....kwwk..',
  '......kk...',
]
const GRAYS = ['#5f5f5f', '#b9b9b9', '#ffffff'] // a paleta do dither do cursor
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

// aleatório com semente: o mesmo desfazer a cada scroll
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// cabeça da régua: p 0→1 atravessa os capítulos; em cada trecho ela anda
// (MOVE) e depois para no capítulo — a batida e a pausa
function stepHead(p) {
  const n = STOPS.length
  const seg = Math.min(n - 1, Math.floor(p * n))
  const from = seg ? STOPS[seg - 1] : 0
  return lerp(from, STOPS[seg], easeInOut(ramp(p * n - seg, 0, MOVE)))
}

const fmtClock = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const $ = (s) => document.querySelector(s)
const track = $('.track')
const sceneB = $('.scene--b')
const slot = $('.slot')
const blockB = $('.block-b')
const ruler = $('.ruler')
const rStops = $('.stops')
const rFill = $('.ruler-path i')
const head = $('.head')
const headVal = head.querySelector('span')
const impact = $('.impact')
const phaseOut = $('#phase')
const pxCanvas = $('.px-cv')
const px = pxCanvas.getContext('2d')
const pxWord = $('.px-word')
const hora = $('.hora')
const words = [...document.querySelectorAll('.w')]
const T0 = performance.now()
// o traço do pincel é fino (~7 de 19 unidades): cinco passadas empilhadas,
// como marca-texto passado de lá para cá, fazem a faixa atrás do HORA
const BRUSH_D = brushRaw.match(/ d="([^"]+)"/)[1]
const horaSvg = hora.querySelector('svg')
horaSvg.setAttribute('viewBox', '0 0 359 34')
horaSvg.innerHTML = [0, 1, 2, 3, 4].map((i) => `<path transform="translate(${i % 2 ? 6 : 0} ${i * 3.8})" d="${BRUSH_D}"/>`).join('')
impact.firstChild.innerHTML = [0, 45, 90, 135, 180, 225, 270, 315]
  .map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('')
$('#restart').addEventListener('click', () => lenis.scrollTo(0, { immediate: true }))

const rib = mountRibbon($('canvas.ribbon'))
let cur = null
if (!REDUCE) mountCursor3D($('.cursor-cv'), { size: 90 }).then((c) => { cur = c })

rStops.innerHTML = RULER_LABELS.map((t, i) => `<span class="stop old"><b>0${i + 1}</b> ${t}</span>`).join('')
  + CHAPTERS.map((t) => `<span class="stop cue">${t}</span>`).join('')
const oldStops = [...rStops.querySelectorAll('.old')]
const cueStops = [...rStops.querySelectorAll('.cue')]
oldStops.forEach((el, i) => { el.style.left = `${RULER_FRACS[i] * 100}%` })
cueStops.forEach((el, i) => { el.style.left = `${STOPS[i] * 100}%` })

const arrowCells = []
ARROW.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') arrowCells.push({ c, r, k: ch }) }))
const wordCells = []
;[...PX_WORD].forEach((ch, li) => GLYPHS[ch].forEach((row, r) => [...row].forEach((v, c) => {
  if (v === '#') wordCells.push({ c: li * 6 + c, r })
})))
console.assert(arrowCells.length >= wordCells.length, 'o cursor precisa de pixels para montar SURGE')

let W = 0
let H = 0
let dpr = 1
let shift = 0
let extra = 0 // quanto a câmera anda depois do shift, para a frase 2 entrar
let P = {}
let total = 0
let bottomBox = null
let slotT = null // lugar da régua, em coordenadas da trilha
let wordT = null // canto de SURGE em pixel, em coordenadas da trilha
let AC = 4 // px por célula do cursor
let PC = 8 // px por célula de SURGE
let parts = []

function buildParticles() {
  const rand = rng(7)
  const order = arrowCells.map((_, i) => i).sort(() => rand() - 0.5)
  const asWord = new Map(order.slice(0, wordCells.length).map((ai, k) => [ai, wordCells[k]]))
  parts = arrowCells.map((cell, i) => {
    const t = asWord.get(i)
    const a = rand() * Math.PI * 2
    const rr = Math.sqrt(rand())
    return {
      o: [cell.c * AC, cell.r * AC], // relativo à ponta
      color: cell.k === 'k' ? GRAYS[0] : GRAYS[1 + Math.floor(rand() * 2)],
      word: t ? [t.c * PC, t.r * PC] : null,
      frac: t ? (t.c + 0.5) / PX_COLS : 0,
      th: rand(),
      swarm: [Math.cos(a) * rr * 15, Math.sin(a) * rr * 9],
      rise: [(rand() - 0.5) * 50, -(50 + rand() * 120)],
      lag: rand(),
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
  sceneB.style.left = `${shift + ROW_LEFT * W}px`
  // mede com a trilha parada: coordenadas da trilha = da tela
  track.style.transform = 'none'
  const s = slot.getBoundingClientRect()
  slotT = { x: s.left, y: s.top, w: s.width }
  extra = Math.max(0, blockB.getBoundingClientRect().right - shift - ROW_RIGHT * W)
  // SURGE: célula = altura de versal / 7, centrada no texto real
  const fs = parseFloat(getComputedStyle(pxWord).fontSize)
  PC = Math.max(4, Math.round((fs * 0.7) / 7))
  const wr = pxWord.getBoundingClientRect()
  wordT = { x: wr.left + (wr.width - PX_COLS * PC) / 2, y: wr.top + (wr.height - 7 * PC) / 2 }
  AC = Math.max(3, Math.round((CLICK_SIZE * H) / ARROW.length))
  let at = shift
  P = { shift: 0 }
  for (const k of Object.keys(VH)) { P[k] = at; at += VH[k] * H }
  total = at
  document.body.style.height = `${REDUCE ? H : total + H}px`
  bottomBox = { x: W * 0.03, y: H - H * 0.026 - 34, w: W * 0.94 }
  buildParticles()
}

let lastPressed
let lastClock = ''
function render() {
  if (!W) return
  const d = REDUCE ? total : window.scrollY
  px.setTransform(dpr, 0, 0, dpr, 0, 0)
  px.clearRect(0, 0, W, H)

  // câmera: o shift (a faixa varre), depois acompanha a cabeça da régua
  const runHead = P.run + 0.2 * VH.run * H // a cabeça parte depois do enxame se formar
  const cam = extra * easeInOut(ramp(d, runHead, P.words + 0.15 * VH.words * H))
  const b = Math.min(d, shift) + cam
  track.style.transform = `translateX(${-b}px)`
  rib.draw(RIB_START * W - b, b)

  // régua: rodapé → entre as frases; troca as paradas do trajeto pelos capítulos
  const g = ramp(d, P.go, P.press)
  const rise = easeInOut(ramp(g, 0, 0.6))
  const box = { x: lerp(bottomBox.x, slotT.x - b, rise), y: lerp(bottomBox.y, slotT.y, rise), w: lerp(bottomBox.w, slotT.w, rise) }
  Object.assign(ruler.style, { transform: `translate(${box.x}px, ${box.y}px)`, width: `${box.w}px` })
  oldStops.forEach((el) => { el.style.opacity = `${1 - ramp(g, 0.05, 0.3)}` })
  cueStops.forEach((el) => { el.style.opacity = `${ramp(g, 0.45, 0.7)}` })

  // cabeça: no rodapé ela está em 100% (fim do pin); some na subida e volta no 0
  const headProg = ramp(d, runHead, P.words)
  const hp = stepHead(headProg)
  const shown = d < P.go || g < 0.5 ? 1 : hp
  const headOn = d < P.go ? 1 : g < 0.5 ? 1 - ramp(g, 0.05, 0.3) : ramp(g, 0.7, 0.95)
  head.style.transform = `translateX(${shown * box.w}px)`
  head.style.opacity = rFill.style.opacity = `${headOn}`
  head.classList.toggle('end', shown > 0.95)
  rFill.style.transform = `scaleX(${shown})`
  const clock = fmtClock(performance.now() - T0) // tempo real na página
  if (clock !== lastClock) { headVal.textContent = clock; lastClock = clock }
  cueStops.forEach((el, i) => el.classList.toggle('on', d >= runHead && hp >= STOPS[i] - 0.001))

  // frase 2: uma palavra por batida, seca
  const wp = ramp(d, P.words, P.end)
  words.forEach((el) => {
    const at = BEAT[el.dataset.cue]
    el.style.setProperty('--in', easeOut(ramp(wp, at, at + SNAP)))
  })
  const crisp = ramp(wp, SURGE_CRISP[0], SURGE_CRISP[1])
  pxWord.style.setProperty('--crisp', crisp)
  hora.style.setProperty('--mark', easeInOut(ramp(d, P.end, P.end + VH.end * H * 0.7)))

  // ----- cursor 3D: vai até o "play", clica e se desfaz -----
  const clickPt = [box.x, box.y + 30] // começo da escala (segue a régua na subida)
  const m = easeInOut(ramp(g, 0.25, 1))
  const press = ramp(d, P.press, P.run)
  const dip = Math.sin(Math.PI * ramp(press, 0, 0.6)) * 6
  const u = ramp(d, P.run, P.words)
  if (cur) {
    const reveal = 1 - easeInOut(ramp(u, 0, 0.1)) // o dither some em ordem Bayer
    if (reveal > 0) {
      const tip0 = [AWAY.x * W, AWAY.y * H]
      const mid = [lerp(tip0[0], clickPt[0], 0.5) + W * 0.02, Math.min(tip0[1], clickPt[1]) - H * 0.06]
      const k = 1 - m
      const x = k * k * tip0[0] + 2 * k * m * mid[0] + m * m * clickPt[0]
      const y = k * k * tip0[1] + 2 * k * m * mid[1] + m * m * clickPt[1] + dip
      const aim = lerp(cur.aimFor(AWAY_DIR), cur.flatZ, m) // gira até a pose de interface
      cur.set(x, y, Math.PI / 2, 1, reveal, lerp(AWAY.size * H, CLICK_SIZE * H, m), m, aim)
    } else cur.set(-9999, 0, 0, 1, 0)
  }
  const pressed = press >= 0.3
  if (pressed !== lastPressed) {
    if (lastPressed !== undefined && pressed && !REDUCE) {
      Object.assign(impact.style, { left: `${clickPt[0]}px`, top: `${clickPt[1]}px` })
      impact.classList.remove('on')
      void impact.offsetWidth
      impact.classList.add('on')
    }
    lastPressed = pressed
  }

  // ----- pixels do cursor: enxame na cabeça → SURGE -----
  if (u > 0 && crisp < 1) {
    const tipT = [slotT.x, slotT.y + 30] // onde ele clicou, em coordenadas da trilha
    for (const p of parts) {
      const appear = ramp(u, p.th * 0.07, p.th * 0.07 + 0.03) // nasce onde o dither some
      if (appear <= 0) continue
      const ox = tipT[0] + p.o[0]
      const oy = tipT[1] + p.o[1]
      if (!p.word) {
        // sobra: evapora em cinza enquanto os outros se juntam
        const e = easeInOut(ramp(u, 0.1 + p.lag * 0.05, 0.24 + p.lag * 0.05))
        if (e >= 1) continue
        px.globalAlpha = appear * (1 - e)
        px.fillStyle = p.color
        px.fillRect(Math.round(ox + p.rise[0] * e - b), Math.round(oy + p.rise[1] * e * e), AC, AC)
        continue
      }
      // enxame em cima do fio da cabeça; cada pixel com um atraso (rastro curto)
      const gather = easeInOut(ramp(u, 0.1 + p.lag * 0.04, 0.2 + p.lag * 0.04))
      const lh = stepHead(clamp01(headProg - p.lag * 0.025))
      const sx = slotT.x + lh * slotT.w + p.swarm[0]
      const sy = slotT.y - 6 + p.swarm[1] + Math.sin(d * 0.01 + p.blink) * 1.5
      let x = lerp(ox, sx, gather)
      let y = lerp(oy, sy, gather)
      let size = lerp(AC, AC * 0.7, gather)
      // SURGE: voa coluna a coluna para a palavra
      const at = SURGE_BUILD + p.frac * 0.1
      const s = easeInOut(ramp(wp, at, at + 0.08))
      x = lerp(x, wordT.x + p.word[0], s)
      y = lerp(y, wordT.y + p.word[1], s)
      size = lerp(size, PC, s)
      px.globalAlpha = appear * (1 - crisp)
      px.fillStyle = s > 0.5 ? '#f4f3ef' : p.color
      px.fillRect(Math.round(x - b), Math.round(y), Math.ceil(size), Math.ceil(size))
    }
    px.globalAlpha = 1
  }

  const now = ['shift', ...Object.keys(VH)].filter((k) => d >= P[k]).pop()
  phaseOut.textContent = `fase: ${now} · ${Math.round((d / total) * 100)}%`
}

const lenis = new Lenis()
function raf(t) { lenis.raf(t); render(); requestAnimationFrame(raf) }
requestAnimationFrame(raf)
window.addEventListener('resize', () => { measure(); render() })
document.fonts.ready.then(() => { measure(); render() })
window.__lab = { render, measure, P: () => P } // para inspecionar pelo console
