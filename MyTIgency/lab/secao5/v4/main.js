// LAB — seção 5 do Manifesto, v4. Usa a faixa e o cursor 3D reais do site
// (src/utils/manifestoRibbon.js, src/utils/cursor3d.js). Tudo preso ao scroll
// (função pura da posição: volta exatamente quando o scroll volta), menos o que
// é RESPOSTA ao scroll — as cordas, as notas e o player reagem à velocidade de
// quem rola, em tempo real — e o ponteiro dos segundos, que anda no relógio real.
//   shift+reach — UM trajeto contínuo do cursor, do lado do olho (onde o site o
//             deixa no fim da cena A) até a régua do rodapé; ele começa a andar
//             com o primeiro px de scroll e só desacelera ao chegar. No caminho
//             a faixa passa por cima e troca o 3D pela mão NA BORDA da onda (a
//             mão aponta para o mesmo lado e usa o mesmo dither). A frase 1 entra
//             letra a letra.
//   grab    — antecipa (sobe), aperta (marca de clique da v2) e a mão vira punho.
//   drag    — o punho arrasta a régua (presa a ele) até a direita da frase 1,
//             e ela se fecha como fita métrica; a câmera acompanha.
//   sweep   — sem etapas: antes de a régua assentar o punho já se desfaz e os
//             pixels voam direto para SURGE, cada um chegando na sua coluna quando
//             a cabeça (que já partiu junto) passa por ela; as palavras da frase 2
//             emergem conforme a cabeça passa.
//   end     — o relógio do HORA começa a girar quando a palavra surge e assenta
//             no meio-dia; o marca-texto passa por trás; a caneta desenha a fermata (segure).
import Lenis from 'lenis'
import { mountRibbon } from '../../../src/utils/manifestoRibbon'
import { mountCursor3D } from '../../../src/utils/cursor3d'
import { strings } from '../../../src/i18n/strings'
import logoUrl from '../../../src/assets/logo.svg?url'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - (1 - t) ** 3
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeInOutInv = (y) => (y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2) // x tal que easeInOut(x) = y
const sineInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2
const backOut = (t) => (t <= 0 ? 0 : 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2)
const lerp = (a, b, t) => a + (b - a) * t
const bez = (p0, p1, p2, p3, u) => {
  const k = 1 - u
  return [0, 1].map((i) => k * k * k * p0[i] + 3 * k * k * u * p1[i] + 3 * k * u * u * p2[i] + u * u * u * p3[i])
}

// reduced motion: estado final direto, sem distância de scroll para encenar
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches
const FINE = matchMedia('(pointer: fine)').matches

// Fases em alturas de tela de scroll (o shift é 1 px de scroll = 1 px lateral;
// o trajeto do cursor vai do 0 até o fim de reach).
const VH = { reach: 0.6, grab: 0.3, drag: 1.2, sweep: 2.4, end: 1.0 }
// sem etapas: o punho começa a se desfazer (e os pixels a voar) BURST_LEAD antes de a
// régua assentar; a cabeça parte HEAD_LEAD antes do fim do arrasto, junto com os pixels
const BURST_LEAD = 0.16
const HEAD_LEAD = 0.1
// geometria do fim do deslocamento (= site): faixa a 27% da largura; no começo espia a 97%
const RIB_START = 0.97
const RIB_END = 0.27
const ROW_LEFT = 0.38 // onde a frase 1 começa (fração da tela) no fim do shift
const ROW_RIGHT = 0.96 // onde a frase 2 termina depois que a câmera anda
const ROW_FIT = 0.92 // a linha inteira (frase 1 + régua + frase 2) cabe nisso
// cursor no fim da cena A (site: ao lado do olho, apontando para a direita)
const AWAY = { x: 0.86, y: 0.5, size: 0.08 }
const AWAY_DIR = 0.22
// trajeto do cursor (eye-trace): arco até em cima de RITMO, virada, dedilha, desce à régua
const APEX_AT = 1 // a mão chega no alto (sobre RITMO) quando o deslocamento termina (fração do shift)
const APEX_LIFT = 0.2 // quanto acima da pauta fica o alto do arco (alturas de tela)
const VIRADA = 0.08 // meia-duração da virada em torno do alto (alturas de tela de scroll)
const GRAB_AT = 0.68 // onde o punho segura a régua (fração da largura; entre "traço" e "quem", sem cobrir rótulo)
const DRAG_LEAD = 0.3 // o arrasto começa nesta fração final do aperto (sem pausa)
const GRIP_Y = 30 // px do topo da régua até onde o punho a segura (em cima da escala)
// régua se fechando no punho: as duas pontas recolhem acelerando (fita métrica)
// entre SHUT[0] e SHUT[1] do arrasto, passam um pouco do tamanho final e voltam (estalo)
const SHUT = [0.05, 0.6]
const SNAP = 0.07
// frase 1: cada letra sobe da máscara, gira e assenta; uma sobrepõe a outra
const UNIT_DUR = 0.3
const WORD_DIM = 0.15
const RULER_LABELS = ['busca', 'traço', 'quem'] // a régua do site, igual
const RULER_FRACS = [0.18, 0.5, 0.86]
// frase 2: onde (fração da varredura) cada palavra emerge. SURGE se monta entre SURGE_AT[0] e [1].
const WORD_AT = [0.1, 0.3, 0.5, 0.7, 0.9]
const SURGE_AT = [0.2, 0.4]
// cordas: harmônico de cada linha (quantas meias-ondas cabem) e sentido em que a onda corre
const STRING_N = [2, 3, 2.5, 3.5, 2]
const STRING_DIR = [1, -1, 1, -1, 1]
const AMP_MAX = 4.5 // unidades do viewBox (linhas a cada 10)
// letras de RITMO como notas: a corda em que cada uma pousa, a altura de nota
// dela parada (as da v2, em em) e quanto ela anda a mais que a corda
const RITMO_LINE = [3, 1, 2, 0, 2]
const RITMO_BASE = [0.02, -0.1, 0.06, -0.15, -0.04]
const RIDE = 1.6
// toque da mão numa corda: quanto tempo o vermelho dura (ms), a velocidade das
// frentes de onda que saem do dedo (fração da corda por segundo) e a força delas
const PLUCK_GLOW = 420
const PLUCK_SPEED = 1.3
const PLUCK_AMP = 7

// dither do cursor 3D (cursor3d.js): 4 cinzas, Bayer 8×8, células de 3 px na tela,
// e a borda vermelha onde a luz de recorte bate
const PAL = ['#141414', '#5f5f5f', '#b9b9b9', '#ffffff']
const RIM = '#ff4438'
const DCELL = 3
const fr = (v) => v - Math.floor(v)
const b2 = (x, y) => { x = Math.floor(x); y = Math.floor(y); return fr(x * 0.5 + y * y * 0.75) }
const b8 = (x, y) => b2(x * 0.25, y * 0.25) * 0.0625 + b2(x * 0.5, y * 0.5) * 0.25 + b2(x, y)

// Mão de link (k contorno, w miolo), apontando para cima; o dedo na coluna 7, linha 0.
const HAND_UP = [
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
// girada 90° no sentido horário: aponta para a direita, como o cursor ao lado do olho
const HAND = [...HAND_UP[0]].map((_, c) => HAND_UP.map((row) => row[c]).reverse().join(''))
const HAND_TIP = [HAND_UP.length - 1, 7]
// Punho de "arrastando" (dedos dobrados). Centro: coluna 8, linha 7.
const FIST = [
  '.....kk.kk.kk....',
  '....kwwkwwkwwkk..',
  '..kkkwwkwwkwwkwk.',
  '.kwwkwwkwwkwwkwk.',
  '.kwwkwwwwwwwwkwk.',
  '.kwwwwwwwwwwwwwk.',
  'kwwwwwwwwwwwwwwk.',
  'kwwwwwwwwwwwwwwk.',
  '.kwwwwwwwwwwwwwk.',
  '..kwwwwwwwwwwwk..',
  '..kwwwwwwwwwwwk..',
  '...kwwwwwwwwwk...',
  '...kwwwwwwwwwk...',
  '....kkkkkkkkk....',
]
const FIST_C = [8, 7]
// notas em pixel (as que saem das cordas)
const NOTES = [
  ['...#..', '...##.', '...#.#', '...#..', '...#..', '.###..', '####..', '.##...'],
  ['..######', '..######', '..#....#', '..#....#', '..#....#', '.##...##', '###..###', '.#....#.'],
]
// fonte de pixel 5×7 (as letras de SURGE)
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

// desenho em pixel → grade de luminância para o dither: miolo claro, contorno
// escuro, luz vindo de cima/esquerda; o contorno do lado de trás é a borda
// que pega a luz vermelha (como no cursor 3D)
function shadeOf(art) {
  const rows = art.length
  const cols = art[0].length
  const grid = art.map((row, r) => [...row].map((ch, c) => {
    if (ch === '.') return null
    const k = ch === 'k'
    const shade = !k && (row[c + 1] === 'k' || art[r + 1]?.[c] === 'k')
    const light = 1.08 - 0.5 * (r / rows) - 0.18 * (c / cols)
    const rim = k && (row[c - 1] === '.' || row[c - 1] === undefined) && r > rows * 0.15
    return { l: (k ? 0.22 : shade ? 0.62 : 0.95) * light, rim }
  }))
  const cells = []
  grid.forEach((row, r) => row.forEach((g, c) => { if (g) cells.push({ c, r, ...g }) }))
  return { grid, rows, cols, cells }
}

const $ = (s) => document.querySelector(s)
const track = $('.track')
const sceneB = $('.scene--b')
const slot = $('.slot')
const blockA = $('.block-a')
const blockB = $('.block-b')
const ruler = $('.ruler')
const rStops = $('.stops')
const rFill = $('.ruler-path i')
const rScale = $('.ruler-scale')
const caps = [...document.querySelectorAll('.ruler .cap')] // pontas de metal da fita (só ao fechar)
const head = $('.head')
const headVal = head.firstChild
const impact = $('.impact')
const phaseOut = $('#phase')
const pxCanvas = $('.px-cv')
const px = pxCanvas.getContext('2d')
const pxWord = $('.px-word')
const hora = $('.hora')
const clockH = $('.clock .h')
const clockM = $('.clock .m')
const clockS = $('.clock .s')
const ritmo = $('.staff')
const stringsSvg = $('.strings')
const cueEls = [...document.querySelectorAll('[data-cue]')] // ordem da frase: nada, surge, antes, da, hora
const cvCursor = $('.cursor-cv')
const player = $('.player')
const plState = $('.pl-state')
const eqBars = [...document.querySelectorAll('.eq i')]
const bpmEl = $('.bpm')
const fermata = $('.fermata')
const hint = $('.hint')
// as letras de RITMO (notas na pauta): cada uma anda sobre uma corda
const ritmoLetters = [...ritmo.querySelectorAll(':scope > span')]
$('#restart').addEventListener('click', () => lenis.scrollTo(0, { immediate: true }))

// globais do site (réplica): logo e a faixa de frases (as frases reais do site)
$('.g-header img').src = logoUrl
const phrases = strings.pt.marquee.phrases.map((p, i) => `<span><b>[0${i + 1}]</b>${p}</span>`).join('')
$('.g-ticker-in').innerHTML = phrases + phrases
impact.firstChild.innerHTML = [0, 45, 90, 135, 180, 225, 270, 315]
  .map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('')

// frase 1: cada letra num span (menos RITMO, que entra inteiro, com as cordas)
const units = []
for (const w of document.querySelectorAll('.block-a .pw')) {
  if (w === ritmo) { units.push({ el: w, staff: true }); continue }
  for (const node of [...w.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment()
      for (const ch of node.textContent) {
        const s = document.createElement('span')
        s.className = 'ch'
        s.textContent = ch
        frag.append(s)
        units.push({ el: s })
      }
      node.replaceWith(frag)
    } else { node.classList.add('ch'); units.push({ el: node }) } // o glifo trocado
  }
}

// relógio: 12 marcas (as dos quartos mais longas); acendem quando o ponteiro passa
$('.clock .ticks').innerHTML = Array.from({ length: 12 }, (_, i) => {
  const q = i % 3 === 0
  return `<line class="tick${q ? ' q' : ''}" x1="0" y1="${q ? -24 : -27}" x2="0" y2="-33" transform="rotate(${i * 30})"/>`
}).join('')
const ticks = [...document.querySelectorAll('.clock .tick')]

// ----- cordas: ondas que correm enquanto a pessoa rola -----
stringsSvg.innerHTML = STRING_N.map(() => '<path/>').join('')
const stringEls = [...stringsSvg.querySelectorAll('path')]
let amp = 0 // amplitude atual (segue a velocidade do scroll, com inércia)
let kick = 0 // impulso extra (a mão dedilhando, o mouse passando)
// deslocamento da corda i no ponto u (0–1), em unidades do viewBox: presa nas
// pontas (sin πu) e uma onda que corre ao longo dela
const stringAt = (i, u, a, phase) => a * (1 - Math.abs(i - 2) * 0.12) * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * STRING_N[i] * u - phase * STRING_DIR[i] + i * 1.3)

// ----- o toque da mão: a corda tocada acende em vermelho e o pulso SAI DO DEDO -----
// (tempo real: um toque é um evento; o vermelho é a consequência do gesto)
const plk = STRING_N.map(() => ({ t: -1e9, u: 0.5 })) // último toque de cada corda: quando e onde
const sparks = [] // faíscas no ponto de contato
const heatOf = (i, now) => Math.exp(-(now - plk[i].t) / PLUCK_GLOW)
// duas frentes de onda saem do ponto tocado em direção às pontas, oscilando e morrendo
function pulseAt(i, u, now) {
  const age = (now - plk[i].t) / 1000
  if (age < 0 || age > 1.6) return 0
  const reach = age * PLUCK_SPEED
  const front = Math.exp(-(((u - plk[i].u - reach) / 0.07) ** 2)) + Math.exp(-(((u - plk[i].u + reach) / 0.07) ** 2))
  return PLUCK_AMP * Math.exp(-age / 0.45) * Math.cos(age * 38) * front * Math.sin(Math.PI * u)
}
function pluck(i, u, x, y, now) {
  plk[i] = { t: now, u }
  kick = Math.min(AMP_MAX, kick + 1.5)
  sparks.push({ x: x + camB, y, t: now })
  spawnNote(now, [x, y], RIM) // a nota do toque nasce vermelha, no dedo
  spawnNote(now + 70, [x, y])
}
function drawSparks(now) {
  px.strokeStyle = RIM
  px.lineCap = 'round'
  for (let n = sparks.length - 1; n >= 0; n--) {
    const s = sparks[n]
    const k = (now - s.t) / 380
    if (k >= 1) { sparks.splice(n, 1); continue }
    if (k < 0) continue
    const e = easeOut(k)
    px.globalAlpha = 1 - k
    px.lineWidth = 3 * (1 - k) + 1
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + 0.3
      const r0 = 6 + 14 * e
      const r1 = 12 + 26 * e
      px.beginPath()
      px.moveTo(s.x - camB + Math.cos(ang) * r0, s.y + Math.sin(ang) * r0)
      px.lineTo(s.x - camB + Math.cos(ang) * r1, s.y + Math.sin(ang) * r1)
      px.stroke()
    }
  }
  px.globalAlpha = 1
}

function drawStrings(phase, now) {
  const a = Math.min(AMP_MAX, amp + kick)
  const at = (i, u) => stringAt(i, u, a, phase) + pulseAt(i, u, now)
  stringEls.forEach((el, i) => {
    const y0 = i * 10
    let d = `M0 ${y0}`
    for (let x = 2; x <= 100; x += 2) d += `L${x} ${(y0 + at(i, x / 100)).toFixed(2)}`
    el.setAttribute('d', d)
    // a corda tocada brilha; logo depois do toque, acende em vermelho e engrossa
    const heat = heatOf(i, now)
    el.style.strokeOpacity = `${Math.max(0.24 + Math.min(0.55, a * 0.12), heat)}`
    el.style.stroke = heat > 0.02 ? `color-mix(in srgb, #FF4438 ${(heat * 100).toFixed(0)}%, #f4f3ef)` : ''
    el.style.strokeWidth = heat > 0.02 ? `${1 + heat * 1.6}` : ''
  })
  // as letras de RITMO são notas sobre as cordas: cada uma sobe e desce com a
  // onda da sua corda no ponto onde está, e inclina com a curva (como boia na água);
  // quando a corda dela é tocada, a letra acende em vermelho junto
  ritmoLetters.forEach((el, k) => {
    const L = letterAt[k]
    if (!L) return
    const i = RITMO_LINE[k]
    const y = at(i, L.u) * RIDE * L.unit
    const slope = (at(i, Math.min(1, L.u + 0.02)) - at(i, Math.max(0, L.u - 0.02))) * L.unit / (0.04 * L.w)
    el.style.transform = `translateY(calc(${RITMO_BASE[k]}em + ${y.toFixed(2)}px)) rotate(${(Math.atan(slope * RIDE) * 57.3).toFixed(2)}deg)`
    const heat = heatOf(i, now)
    el.style.color = heat > 0.02 ? `color-mix(in srgb, #FF4438 ${(heat * 100).toFixed(0)}%, currentColor)` : ''
  })
}

// ----- notas em pixel que saem das cordas tocadas -----
const notes = []
const noteRand = rng(11)
let camB = 0 // deslocamento atual da trilha (as notas vivem na trilha)
// at: [x, y] na tela (o ponto do toque); color: força a cor (a do toque é vermelha)
function spawnNote(now, at = null, color = null) {
  if (notes.length > 22) return
  const r = stringsSvg.getBoundingClientRect()
  const line = Math.floor(noteRand() * 5)
  const k = noteRand()
  const nx = noteRand()
  notes.push({
    x: (at ? at[0] : r.left + nx * r.width) + camB, // em coordenadas da trilha: anda junto com a pauta
    y: at ? at[1] : r.top + (line / 4) * r.height,
    vx: (noteRand() - 0.5) * 50,
    vy: -(70 + noteRand() * 90),
    born: now,
    life: 1100 + noteRand() * 700,
    art: NOTES[noteRand() < 0.6 ? 0 : 1],
    color: color ?? (k < 0.14 ? RIM : k < 0.4 ? PAL[2] : '#f4f3ef'),
    seed: noteRand() * 10,
  })
}
function drawNotes(now) {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i]
    const t = (now - n.born) / 1000
    const life = (now - n.born) / n.life
    if (life >= 1) { notes.splice(i, 1); continue }
    if (t < 0) continue // dedilhado: ainda não nasceu
    const pop = 1 + 0.3 * (1 - easeOut(ramp(life, 0, 0.12))) // nasce maior e assenta
    const cell = Math.max(2, Math.round(DCELL * pop))
    const x = n.x - camB + n.vx * t + Math.sin(t * 6 + n.seed) * 6
    const y = n.y + n.vy * t + 30 * t * t
    px.globalAlpha = 1 - ramp(life, 0.6, 1)
    px.fillStyle = n.color
    n.art.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '#') px.fillRect(Math.round(x + c * cell), Math.round(y + (r - row.length) * cell), cell, cell)
    }))
  }
  px.globalAlpha = 1
}
// o mouse que atravessa a pauta toca as cordas (força ∝ velocidade)
let lastPY = null
if (FINE && !REDUCE) {
  window.addEventListener('pointermove', (e) => {
    const r = stringsSvg.getBoundingClientRect()
    const prev = lastPY
    lastPY = e.clientY
    if (prev === null || e.clientX < r.left || e.clientX > r.right) return
    if (e.clientY < r.top - 6 || e.clientY > r.bottom + 6) return
    kick = Math.min(AMP_MAX, kick + Math.abs(e.clientY - prev) * 0.08)
    if (Math.abs(e.clientY - prev) > 4) spawnNote(performance.now())
  })
}

const rib = mountRibbon($('canvas.ribbon'))
let cur = null
if (!REDUCE) mountCursor3D(cvCursor, { size: 90 }).then((c) => { cur = c })

rStops.innerHTML = RULER_LABELS.map((t, i) => `<span class="stop"><b>0${i + 1}</b> ${t}</span>`).join('')
const stops = [...rStops.querySelectorAll('.stop')]
stops.forEach((el, i) => { el.style.left = `${RULER_FRACS[i] * 100}%` })

const hand = shadeOf(HAND)
const fist = shadeOf(FIST)
const wordCells = []
;[...PX_WORD].forEach((ch, li) => GLYPHS[ch].forEach((row, r) => [...row].forEach((v, c) => {
  if (v === '#') wordCells.push({ c: li * 6 + c, r })
})))
console.assert(fist.cells.length >= wordCells.length, 'o punho precisa de pixels para montar SURGE')

let W = 0
let H = 0
let dpr = 1
let shift = 0
let extra = 0 // quanto a câmera anda no arrasto, para enquadrar a linha inteira
let P = {}
let total = 0
let bottomBox = null
let slotT = null // lugar da régua, em coordenadas da trilha
let wordT = null // canto de SURGE em pixel, em coordenadas da trilha
let HC = 4 // px por célula do desenho da mão
let PC = 8 // px por célula de SURGE
let parts = [] // pixels do punho: { o (rel. ao centro), color, word?: alvo, burst, cloud, rise, dl, blink }
let letterAt = [] // RITMO: { u (fração na pauta), unit (px por unidade do viewBox), w }
let staffT = null // a pauta, em coordenadas da trilha

function buildParticles() {
  const rand = rng(5)
  const order = fist.cells.map((_, i) => i).sort(() => rand() - 0.5)
  const asWord = new Map(order.slice(0, wordCells.length).map((fi, k) => [fi, wordCells[k]]))
  parts = fist.cells.map((cell, i) => {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.4 // para cima, aberto
    const dist = 30 + rand() * 90
    const t = asWord.get(i)
    return {
      o: [(cell.c - FIST_C[0]) * HC, (cell.r - FIST_C[1]) * HC],
      color: cell.rim ? RIM : PAL[Math.max(1, Math.min(3, Math.round(cell.l * 3)))],
      word: t ? [t.c * PC, t.r * PC] : null,
      frac: t ? lerp(SURGE_AT[0], SURGE_AT[1], (t.c + 0.5) / PX_COLS) : 0,
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
  sceneB.style.left = `${shift + ROW_LEFT * W}px`
  // mede com a trilha parada: coordenadas da trilha = da tela
  track.style.transform = 'none'
  // a régua leva o que sobra para a linha caber na tela
  const gap = parseFloat(getComputedStyle(slot.parentElement).columnGap)
  const free = ROW_FIT * W - blockA.offsetWidth - blockB.offsetWidth - 2 * gap
  slot.style.width = `${Math.min(0.3 * W, Math.max(0.16 * W, free))}px`
  const s = slot.getBoundingClientRect()
  slotT = { x: s.left, y: s.top, w: s.width }
  extra = Math.max(0, blockB.getBoundingClientRect().right - shift - ROW_RIGHT * W)
  // SURGE: célula = altura de versal / 7; a palavra apoiada na linha de base
  const fs = parseFloat(getComputedStyle(pxWord.parentElement).fontSize)
  PC = Math.max(4, Math.round((fs * 0.7) / 7))
  Object.assign(pxWord.style, { width: `${PX_COLS * PC}px`, height: `${7 * PC}px` })
  const wr = pxWord.getBoundingClientRect()
  wordT = { x: wr.left, y: wr.bottom - 7 * PC }
  // RITMO: onde cada letra cai sobre a pauta (fração u) e quantos px vale uma unidade do viewBox
  const sr = stringsSvg.getBoundingClientRect()
  letterAt = ritmoLetters.map((el) => {
    const r = el.getBoundingClientRect()
    return { u: clamp01((r.left + r.width / 2 - sr.left) / sr.width), unit: sr.height / 40, w: sr.width }
  })
  staffT = { x: sr.left, y: sr.top, w: sr.width, h: sr.height } // a pauta, em coordenadas da trilha (onde a mão dedilha)
  // fermata sobre o ponto final de "HORA." — o ponto faz as vezes de barra de compasso
  // (fermata na barra = pausa entre seções) e ali o SURGE de cima não atrapalha
  const dotNode = [...hora.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).pop()
  const range = document.createRange()
  range.setStart(dotNode, dotNode.length - 1)
  range.setEnd(dotNode, dotNode.length)
  const pr = range.getBoundingClientRect()
  fermata.style.setProperty('--fx', `${pr.left + pr.width / 2 - hora.getBoundingClientRect().left}px`)
  let at = shift
  P = { shift: 0 }
  for (const k of Object.keys(VH)) { P[k] = at; at += VH[k] * H }
  total = at
  document.body.style.height = `${REDUCE ? H : total + H}px`
  bottomBox = { x: W * 0.03, y: H - H * 0.026 - 34, w: W * 0.94 }
  HC = Math.max(3, Math.round((AWAY.size * H) / HAND.length))
  buildParticles()
}

// desenho em pixel no dither do cursor 3D, com âncora (ax, ay) em (x, y). A
// grade do dither é a da TELA (como o shader): ao andar, o padrão corre por
// dentro do desenho, igual ao cursor 3D. show(t): quais células aparecem
// (troca entre desenhos por limiar de Bayer, como o uReveal do cursor).
// rot: giro (rad) em torno da âncora; flip: escala vertical da tela em torno da
// âncora (1 → −1 = a virada da v2, como carta que gira; perto de 0 a mão fica de
// lado e vira um fio com a borda vermelha). O dither continua preso à tela.
function drawDither(art, x, y, ax, ay, show = null, rot = 0, flip = 1) {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  // canto do desenho → tela (para o retângulo de varredura)
  const toScreen = (lx, ly) => [x + lx * c - ly * s, y + (lx * s + ly * c) * flip]
  const corners = [[-ax, -ay], [art.cols - ax, -ay], [-ax, art.rows - ay], [art.cols - ax, art.rows - ay]].map(([u, v]) => toScreen(u * HC, v * HC))
  const gx0 = Math.floor(Math.min(...corners.map((p) => p[0])) / DCELL)
  const gx1 = Math.floor(Math.max(...corners.map((p) => p[0])) / DCELL)
  const gy0 = Math.floor(Math.min(...corners.map((p) => p[1])) / DCELL)
  const gy1 = Math.floor(Math.max(...corners.map((p) => p[1])) / DCELL)
  const edgeOn = Math.abs(flip) < 0.12
  const shadeK = 0.55 + 0.45 * Math.min(1, Math.abs(flip)) // de lado, mais escura
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const t = b8(gx, gy)
      if (show && !show(t)) continue
      // tela → desenho (inverso de toScreen)
      const dx = gx * DCELL + DCELL / 2 - x
      const dy = gy * DCELL + DCELL / 2 - y
      if (edgeOn) {
        // de lado: só o fio da mão, com a luz vermelha de recorte
        if (Math.abs(dy) > DCELL) continue
        px.fillStyle = t < 0.7 ? RIM : PAL[2]
        px.fillRect(gx * DCELL, gy * DCELL, DCELL, DCELL)
        continue
      }
      const ry = dy / flip
      const g = art.grid[Math.floor((-dx * s + ry * c) / HC + ay)]?.[Math.floor((dx * c + ry * s) / HC + ax)]
      if (!g) continue
      let col
      if (g.rim && t < 0.7) col = RIM
      else {
        const i = Math.max(0, Math.min(3, Math.floor(g.l * shadeK * 3 + t)))
        if (i === 0) continue // a tinta do fundo
        col = PAL[i]
      }
      px.fillStyle = col
      px.fillRect(gx * DCELL, gy * DCELL, DCELL, DCELL)
    }
  }
}

// ponto de pega (= o punho) em g (0→1) do rodapé até o lugar da régua: sobe
// primeiro, depois vai de lado — um arco, como mão que puxa
function gripAt(g, G0, dockGrip) {
  return [lerp(G0[0], dockGrip[0], easeInOut(ramp(g, 0.15, 1))), lerp(G0[1], dockGrip[1], easeInOut(ramp(g, 0, 0.8)))]
}

let lastTip = null // ponta da mão no quadro anterior (para saber quando ela cruza uma corda)
let lastNow = performance.now()
let spawnAcc = 0
let smoothV = 0
let lastPressed
function render() {
  if (!W) return
  const now = performance.now()
  const dt = Math.min(0.1, (now - lastNow) / 1000)
  lastNow = now
  const d = REDUCE ? total : window.scrollY
  px.setTransform(dpr, 0, 0, dpr, 0, 0)
  px.clearRect(0, 0, W, H)

  // arrasto: a régua vai presa ao punho (um progresso só); a câmera acompanha
  const grabLen = VH.grab * H
  const dragA = P.drag - grabLen * DRAG_LEAD
  const gD = ramp(d, dragA, P.sweep)
  const cam = extra * easeInOut(gD)
  const b = Math.min(d, shift) + cam
  camB = b
  track.style.transform = `translateX(${-b}px)`
  const ribX = RIB_START * W - b
  rib.draw(ribX, b)

  // ----- frase 1: letra a letra (sobe da máscara, gira e assenta); RITMO inteiro -----
  const enter = ramp(d, shift * 0.12, shift * 1.02)
  const step = (1 - UNIT_DUR) / (units.length - 1)
  units.forEach((u, i) => {
    const raw = ramp(enter, i * step, i * step + UNIT_DUR)
    if (u.staff) {
      const k = sineInOut(raw)
      u.el.style.opacity = `${lerp(WORD_DIM, 1, k)}`
      u.el.style.filter = k < 1 ? `blur(${(1 - k) * 3}px)` : ''
      u.el.style.transform = k < 1 ? `translateY(${(1 - k) * 0.06}em)` : ''
      return
    }
    const k = easeOut(raw)
    u.el.style.transform = k < 1 ? `translateY(${(1 - k) * 1.35}em) rotate(${(1 - k) * 9}deg)` : ''
    u.el.style.opacity = `${lerp(0.2, 1, k)}`
  })

  // ----- cordas + notas + player: respondem à velocidade de quem rola -----
  const v = REDUCE ? 0 : Math.abs(lenis.velocity || 0)
  smoothV += (v - smoothV) * (1 - Math.exp(-dt * 8))
  amp += (Math.min(AMP_MAX, smoothV * 0.35) - amp) * (1 - Math.exp(-dt * 6))
  kick *= Math.exp(-dt * 2.2) // o dedilhado (da mão, do mouse) decai como corda solta
  drawStrings(d * 0.03, now)
  const sr = stringsSvg.getBoundingClientRect()
  if (!REDUCE && sr.right > 0 && sr.left < W) {
    spawnAcc += Math.min(30, smoothV) * dt * 0.5
    while (spawnAcc >= 1) { spawnAcc -= 1; spawnNote(now) }
  } else spawnAcc = 0
  const level = clamp01((amp + kick) / AMP_MAX)
  const playing = level > 0.06
  // no fim, parado, o player fica em fermata (segurando) e a dica vira "a tempo" (segue)
  const held = ramp(d, P.end, P.end + VH.end * H) > 0.8
  player.classList.toggle('is-playing', playing)
  plState.textContent = playing ? 'tocando' : held ? 'fermata' : 'pausa'
  hint.textContent = held ? 'a tempo ↓' : 'role para tocar ↓'
  bpmEl.textContent = String(playing ? Math.round(60 + level * 120) : 0).padStart(3, '0')
  eqBars.forEach((el, i) => {
    el.style.transform = `scaleY(${0.15 + 0.85 * level * (0.45 + 0.55 * Math.abs(Math.sin(now * 0.011 * (i + 1) + i * 1.7)))})`
  })

  // ----- régua: rodapé → à direita da frase 1, arrastada pelo punho (igual, só menor) -----
  const dock = { x: slotT.x - b, y: slotT.y, w: slotT.w }
  const G0 = [bottomBox.x + bottomBox.w * GRAB_AT, bottomBox.y + GRIP_Y] // onde ele pega a régua no rodapé
  const dockGrip = [dock.x + dock.w * GRAB_AT, dock.y + GRIP_Y]
  const grip = gripAt(gD, G0, dockGrip)
  // fechando, como fita métrica: (1) os rótulos dobram para dentro da escala, das
  // pontas para o punho; (2) a fita recolhe acelerando — desfoca e achata com a
  // velocidade, e as duas pontas de metal aparecem; (3) estala: passa um pouco,
  // volta, dá um tranco e as pontas chicoteiam; (4) os rótulos desdobram do punho para fora
  const rwAt = (g) => lerp(bottomBox.w, dock.w, ramp(g, SHUT[0], SHUT[1]) ** 3) * (1 - SNAP * Math.sin(Math.PI * ramp(g, SHUT[1] - 0.02, SHUT[1] + 0.15)))
  const rw = rwAt(gD)
  const speed = clamp01((rwAt(gD - 0.012) - rw) / (bottomBox.w * 0.035)) // 0 parada → 1 recolhendo rápido
  const snapT = ramp(gD, SHUT[1] - 0.02, SHUT[1] + 0.26)
  const jolt = Math.sin(snapT * Math.PI * 3) * (1 - snapT)
  const box = { x: grip[0] - rw * GRAB_AT, y: grip[1] - GRIP_Y, w: rw }
  // peso: gira em torno do punho conforme ele anda (as pontas ficam para trás)
  const prev = gripAt(Math.max(0, gD - 0.03), G0, dockGrip)
  const tilt = Math.max(-4, Math.min(4, (grip[0] - prev[0]) * 0.025 - (grip[1] - prev[1]) * 0.02)) + jolt * 1.2
  Object.assign(ruler.style, {
    transform: `translate(${box.x}px, ${box.y - jolt * 5}px) rotate(${tilt}deg)`,
    transformOrigin: `${GRAB_AT * 100}% ${GRIP_Y}px`,
    width: `${box.w}px`,
  })
  rScale.style.filter = speed > 0.02 ? `blur(${(speed * 1.6).toFixed(2)}px)` : ''
  rScale.style.transform = speed > 0.02 ? `scaleY(${1 - 0.5 * speed})` : ''
  const capOn = ramp(gD, SHUT[0], SHUT[0] + 0.05) * (1 - ramp(gD, SHUT[1] + 0.22, SHUT[1] + 0.32))
  caps.forEach((el, i) => {
    el.style.opacity = `${capOn}`
    el.style.transform = `rotate(${(i ? 1 : -1) * (jolt * 14 + speed * 8)}deg)`
  })
  stops.forEach((el, i) => {
    const far = Math.abs(RULER_FRACS[i] - GRAB_AT) / Math.max(GRAB_AT, 1 - GRAB_AT) // 1 = na ponta
    const fold = ramp(gD, SHUT[0] - 0.04 + (1 - far) * 0.08, SHUT[0] + 0.05 + (1 - far) * 0.08)
    const open = ramp(gD, SHUT[1] + 0.08 + far * 0.1, SHUT[1] + 0.18 + far * 0.1)
    const k = clamp01(fold - open)
    el.style.transform = k > 0 ? `translateX(-50%) perspective(70px) rotateX(${(k * 90).toFixed(1)}deg)` : ''
    el.style.opacity = k > 0 ? `${1 - 0.85 * k}` : ''
  })

  // linha do tempo contínua: o punho se desfaz (B0) enquanto a régua assenta e
  // a cabeça parte (HS0) junto com os pixels — nada espera nada
  const B0 = P.sweep - BURST_LEAD * H
  const HS0 = P.sweep - HEAD_LEAD * H
  const HS1 = P.end
  const tRaw = ramp(d, HS0, HS1)
  const t = easeInOut(tRaw)
  const dAt = (y) => HS0 + easeInOutInv(y) * (HS1 - HS0) // scroll em que a cabeça chega na fração y
  // cabeça: no rodapé ela está em 100% (fim do pin); some no arrasto e volta no 000% já andando
  const hp = d < HS0 ? (gD < 0.5 ? 1 : 0) : t
  const headOn = d < B0 ? 1 - ramp(gD, 0.05, 0.3) : ramp(d, B0, HS0 + 0.08 * H)
  head.style.transform = `translateX(${hp * box.w}px)`
  head.style.opacity = rFill.style.opacity = `${headOn}`
  head.classList.toggle('end', hp > 0.95)
  headVal.textContent = `${String(Math.round(hp * 100)).padStart(3, '0')}%`
  rFill.style.transform = `scaleX(${hp})`
  stops.forEach((el, i) => el.classList.toggle('on', hp >= RULER_FRACS[i] - 0.001))
  ruler.classList.toggle('done', d >= HS1)

  // ----- frase 2: cada palavra emerge quando a cabeça passa (o NADA da v2) -----
  const prog = d >= HS0 ? t : -1
  cueEls.forEach((el, i) => {
    if (!el.classList.contains('w')) return
    el.style.setProperty('--in', easeInOut(ramp(prog, WORD_AT[i] - 0.02, WORD_AT[i] + 0.1)))
  })

  // ----- HORA: o relógio gira assim que a palavra começa a surgir, e assenta -----
  const e = ramp(d, dAt(WORD_AT[4] - 0.02), P.end + VH.end * H)
  const spin = easeInOut(ramp(e, 0, 0.5))
  const settle = ramp(e, 0.5, 0.72)
  const wob = 10 * Math.sin(settle * Math.PI * 3) * (1 - settle) // tranco de ponteiro que encaixa
  const mA = -720 * (1 - spin) + wob
  clockM.setAttribute('transform', `rotate(${mA})`)
  clockH.setAttribute('transform', `rotate(${-60 * (1 - spin) + wob * 0.3})`)
  // marcas: acendem quando o ponteiro dos minutos passa e apagam devagar atrás dele
  const m360 = ((mA % 360) + 360) % 360
  const spinning = spin > 0 && spin < 1
  ticks.forEach((el, i) => {
    const behind = (((m360 - i * 30) % 360) + 360) % 360
    el.style.opacity = spinning ? `${0.3 + 0.7 * Math.exp(-behind / 70)}` : ''
  })
  // assentado, o relógio passa a ser de verdade: o ponteiro dos segundos anda no tempo real
  clockS.style.opacity = `${ramp(e, 0.7, 0.8)}`
  clockS.setAttribute('transform', `rotate(${(Math.floor(Date.now() / 1000) % 60) * 6})`)
  hora.style.setProperty('--mark', easeInOut(ramp(e, 0.55, 0.85)))
  // fermata: a caneta desenha o arco sobre o relógio e o ponto cai — "segure, é a hora"
  fermata.style.setProperty('--draw', `${1 - easeInOut(ramp(e, 0.68, 0.86))}`)
  fermata.style.setProperty('--dot', `${backOut(ramp(e, 0.84, 0.94))}`)

  // ----- cursor: o caminho guia o olhar (eye-trace): do olho, sobe num arco até
  // em cima de RITMO levantando o dedo; no alto, a VIRADA (da v2: gira como carta,
  // de lado vira um fio com a borda vermelha) e passa a apontar para baixo; desce
  // dedilhando as cordas (cada corda cruzada é tocada e solta notas) e segue,
  // desacelerando, até a régua do rodapé. Nunca parado: o único respiro é o alto
  // do arco, onde a virada acontece (antecipação). -----
  const sz = AWAY.size * H
  const S0 = [AWAY.x * W, AWAY.y * H]
  const dA = shift * APEX_AT // a mão chega no alto quando a trilha para
  const A = [staffT.x - shift + staffT.w * 0.5, staffT.y - APEX_LIFT * H] // em cima de RITMO (tela, trilha parada)
  let cx
  let cy
  if (d < dA) {
    ;[cx, cy] = bez(S0, [S0[0] + 0.02 * W, A[1] + 0.02 * H], [A[0] + 0.14 * W, A[1] - 0.03 * H], A, sineInOut(ramp(d, 0, dA)))
  } else {
    ;[cx, cy] = bez(A, [A[0], A[1] + 0.42 * H], [G0[0] + 0.03 * W, G0[1] - 0.3 * H], G0, easeInOut(ramp(d, dA, P.grab)))
  }
  // dedo levantado na segunda metade da subida; a virada no alto
  const rot = -Math.PI / 2 * easeInOut(ramp(d, dA * 0.45, dA))
  const flip = Math.cos(Math.PI * easeInOut(ramp(d, dA - VIRADA * H, dA + VIRADA * H)))
  // a ponta cruzou uma corda? toca aquela corda (dedilhado de cima para baixo)
  if (!REDUCE && lastTip && d < P.grab) {
    const r = stringsSvg.getBoundingClientRect()
    if (cx > r.left && cx < r.right) {
      for (let i = 0; i < 5; i++) {
        const yi = r.top + (i / 4) * r.height
        if ((lastTip[1] - yi) * (cy - yi) < 0) pluck(i, (cx - r.left) / r.width, cx, yi, now)
      }
    }
  }
  lastTip = [cx, cy]
  const len = HAND[0].length * HC // a mão inteira fica à esquerda da ponta
  const before = ribX - rib.reach() >= cx + 6 // a faixa ainda não chegou na ponta
  const passed = ribX + rib.reach() <= cx - len - 6 // já passou pela mão inteira
  const wiping = !before && !passed
  const edge = (y) => rib.at(y, ribX, b)
  if (cur) {
    // nivela a ponta (do leve "para cima" do site para a horizontal da mão) logo no começo
    const dir = lerp(AWAY_DIR, 0, sineInOut(ramp(d, 0, 140)))
    if (!passed && d < P.grab) cur.set(cx, cy, dir, 1, 1, sz, 0, cur.aimFor(dir))
    else cur.set(-9999, 0, 0, 1, 0)
  }
  // a faixa troca o cursor na borda dela: à esquerda da onda ainda 3D, à direita já a mão
  if (wiping) {
    const pts = []
    for (let y = 0; y <= H; y += 24) pts.push(`${edge(y).toFixed(1)}px ${y}px`)
    pts.push(`${edge(H).toFixed(1)}px ${H}px`)
    cvCursor.style.clipPath = `polygon(0px 0px, ${pts.join(', ')}, 0px ${H}px)`
  } else cvCursor.style.clipPath = ''

  // aperto: antecipa (sobe), aperta (afunda) e a mão vira punho — troca no
  // dither (a mão some célula a célula enquanto o punho aparece nas mesmas)
  const gk = ramp(d, P.grab, P.drag)
  const lift = -Math.sin(Math.PI * ramp(gk, 0, 0.35)) * HC * 1.4
  const press = Math.sin(Math.PI * ramp(gk, 0.3, 0.8)) * HC * 1.8
  const m = easeInOut(ramp(gk, 0.35, 0.7)) * 1.34 // b8 vai até ~1.33
  const pressed = gk >= 0.5
  if (pressed !== lastPressed) {
    if (lastPressed !== undefined && pressed && !REDUCE) {
      Object.assign(impact.style, { left: `${G0[0]}px`, top: `${G0[1]}px` })
      impact.classList.remove('on')
      void impact.offsetWidth // reinicia a marca
      impact.classList.add('on')
    }
    lastPressed = pressed
  }
  const G = grip // onde a régua está segura agora
  if (d < P.grab) {
    if (wiping) {
      // durante a passagem da faixa, só do lado já varrido
      px.save()
      px.beginPath()
      px.moveTo(W, 0)
      for (let y = 0; y <= H; y += 24) px.lineTo(edge(y), y)
      px.lineTo(edge(H), H)
      px.lineTo(W, H)
      px.closePath()
      px.clip()
      drawDither(hand, cx, cy, HAND_TIP[0], HAND_TIP[1], null, rot, flip)
      px.restore()
    } else if (passed) drawDither(hand, cx, cy, HAND_TIP[0], HAND_TIP[1], null, rot, flip)
  } else if (d < P.sweep) {
    // segura em G0 até o arrasto começar; depois vai com a régua (presa ao punho).
    // No fim do arrasto o punho já se desfaz no dither enquanto os pixels saem dele.
    const at = d < dragA ? G0 : grip
    const y = at[1] + lift + press
    const keep = (1 - ramp(d, B0, B0 + 0.12 * H)) * 1.34
    if (m < 1.34) drawDither(hand, at[0], y, HAND_TIP[0], HAND_TIP[1], (tb) => tb >= m, rot, flip) // apontando para baixo
    if (m > 0) drawDither(fist, at[0], y, FIST_C[0], FIST_C[1], (tb) => tb < Math.min(m, keep))
  }
  if (d >= B0) {
    // os pixels voam direto do punho para a palavra, sem parar: cada um sai do
    // seu lugar no punho, abre para fora, faz a curva e chega na sua coluna de
    // SURGE no instante em que a cabeça da régua passa por ela
    for (const p of parts) {
      const o = [G[0] + p.o[0], G[1] + p.o[1]]
      const appear = ramp(d, B0, B0 + 0.05 * H)
      if (!p.word) {
        // sobra: abre e evapora em cinza enquanto os outros seguem
        const a = easeOut(ramp(d, B0 + p.dl * 0.1 * H, B0 + (0.18 + p.dl * 0.1) * H))
        const ev = easeInOut(ramp(d, B0 + (0.05 + p.dl * 0.1) * H, B0 + (0.4 + p.dl * 0.25) * H))
        if (ev >= 1) continue
        px.globalAlpha = appear * (1 - ev)
        px.fillStyle = p.color
        px.fillRect(Math.round(o[0] + p.burst[0] * a + p.rise[0] * ev), Math.round(o[1] + p.burst[1] * a + p.rise[1] * ev * ev), HC, HC)
        continue
      }
      const tx = wordT.x - b + p.word[0]
      const ty = wordT.y + p.word[1]
      const q = sineInOut(ramp(d, B0 + p.dl * 0.08 * H, dAt(p.frac)))
      const [x, y] = bez(o, [o[0] + p.burst[0] * 1.3, o[1] + p.burst[1] * 1.3], [tx + p.cloud[0], ty + p.cloud[1]], [tx, ty], q)
      const sway = Math.sin(Math.PI * q) * Math.sin(d * 0.012 + p.blink) * 4 // flutua no meio do voo
      const size = lerp(HC, PC, q)
      px.globalAlpha = appear
      px.fillStyle = q > 0.85 ? '#f4f3ef' : p.color
      px.fillRect(Math.round(x), Math.round(y + sway), Math.ceil(size), Math.ceil(size))
    }
    px.globalAlpha = 1
  }
  drawSparks(now)
  drawNotes(now) // por cima de tudo no canvas

  const ph = ['shift', ...Object.keys(VH)].filter((k) => d >= P[k]).pop()
  phaseOut.textContent = `fase: ${ph} · ${Math.round((d / total) * 100)}%`
}

const lenis = new Lenis()
function raf(t) { lenis.raf(t); render(); requestAnimationFrame(raf) }
requestAnimationFrame(raf)
window.addEventListener('resize', () => { measure(); render() })
document.fonts.ready.then(() => { measure(); render() })
window.__lab = { render, measure, P: () => P, strum: () => { kick = AMP_MAX } } // para inspecionar pelo console
