// LAB v12 — a transição seção 6 → Work (ver index.html).
//
// Tudo é função de T (0..1), o scroll dentro do trecho fixo (LEN alturas de
// tela, depois de HOLD0 com o cartaz parado). Uma transform só (o rig) leva a
// tela e o aparelho: começa cobrindo a viewport (o cartaz 1:1, igual ao fim da
// seção 6), encolhe até a tela 4:3 (o texto fica menor) e dá o zoom out até o
// aparelho centralizado. O buraco da tela do aparelho (bake/) cai exatamente
// na caixa do rig, então a tela nunca "troca" de lugar.
// A curva do tubo e as cores desalinhadas são o filtro SVG #crt (o mapa de
// deslocamento sai daqui); scanlines, máscara, faixa, cintilação, grão,
// vinheta e vidro são camadas. O wallpaper é um shader: o preto se desfaz em
// dither (Bayer, os 4 cinzas do site) e o dither em cor, em 8 degraus — o
// mesmo idioma das fotos da seção 6.
import Lenis from 'lenis'
import * as THREE from 'three'
import '../../../src/App.css'
import '../base.css'
import { mountS6 } from '../../../src/utils/manifestoS6'
import { strings } from '../../../src/i18n/strings'
import logoUrl from '../../../src/assets/logo.svg?url'
import { EDITOR, shadeOf, drawSprite } from '../../../src/utils/ditherSprite'
import DEV from './devices.json'

const url = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace(/\.\w+$/, ''), v]))
const IMG = url(import.meta.glob('./img/*.png', { eager: true, query: '?url', import: 'default' }))
const ICO = url(import.meta.glob('./ico/*.png', { eager: true, query: '?url', import: 'default' }))
const WALL = url(import.meta.glob('./wall/*.jpg', { eager: true, query: '?url', import: 'default' }))
const ico = (n, d = 0) => ICO[d ? `${n}-d` : n]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches
const START = new URLSearchParams(location.search).get('t') // ?t=0.5 abre o scroll nesse momento

// ---------- roteiro (frações de T) ----------
const HOLD0 = 0.35 // alturas de tela com o cartaz parado antes de começar
const LEN = 3.2 // alturas de tela da transição
const TL = {
  crt: [0, 0.42], // a curva e os efeitos do tubo se espalham aos poucos
  shrink: [0, 0.36], // o cartaz encolhe até a tela 4:3
  wall: [0.1, 0.55], // preto → dither → cor
  zoom: [0.4, 0.86], // zoom out até o aparelho
  lights: [0.42, 0.8], // o aparelho sai do escuro
  room: [0.74, 0.94], // a sala acende: preto → branco
}
// o cursor da seção 6 dentro da tela: se refaz, fecha o "Aviso", abre Trabalhos
// com dois cliques e espera (ampulheta) até a barra chegar a 100% — em T = 1,
// quando o trecho fixo solta e o Work entra
const CUR = {
  appear: [0.44, 0.48], // se refaz em pixels (o inverso de como sumiu na seção 6)
  toOk: [0.49, 0.55], ok: 0.56, // vai ao OK do "Feche esse pop-up." e clica
  toIcon: [0.575, 0.635], dbl: 0.645, // vai à pasta Trabalhos: duplo clique
  open: 0.665, // a janela abre; o cursor vira ampulheta
  toWin: [0.675, 0.73], // e encosta na janela, esperando
}
const FIT = 0.84 // a tela (antes do zoom) ocupa esta fração da altura
const FINAL = 0.6 // o aparelho no fim: fração da altura (e no máx. 70% da largura)

const DEVICES = {
  s2: ['PC da seção 2', 's2', 's2'],
  's2-d': ['PC da seção 2 · dither', 's2-d', 's2'],
  'pc-bege': ['PC bege (foto)', 'pc-bege', 'pc-bege'],
  'pc-bege-d': ['PC bege · dither', 'pc-bege-d', 'pc-bege'],
  monitor: ['monitor (foto)', 'monitor', 'monitor'],
  tv: ['TV/DVD (foto)', 'tv-memorex', 'tv-memorex'],
}
const WALLS = [
  ['ours', 'nosso morro (shader)'], ['u_-nYBR0LFTvQ', 'morro liso'], ['u_oOBMoCOgGrY', 'morro ciano'], ['u_yOkNxeFoh-s', 'morro + nuvens'],
  ['u_FQkQxgO9Kh8', 'colinas'], ['u_nnaxq9I1e3k', 'morro + cirros'], ['u_rG6HB7Af_Js', 'vale'], ['u_K-hzIFI9KM0', 'encosta'],
  ['u_BjCOQFkXE20', 'céu 1'], ['u_zlGobrmAuyE', 'céu 2'], ['u_A9_IsUtjHm4', 'nuvem'], ['u_gJILnne_HFg', 'cúmulos'],
]

// ---------- Windows antigo ----------
const win = (title, text, btns = null, icon = null) => `<div class="w98"><div class="w98-t"><span>${title}</span><i>×</i></div>`
  + `<div class="w98-b">${icon ? `<img src="${icon}" alt="">` : ''}<p>${text}</p></div>`
  + (btns ? `<div class="w98-k">${btns.map((b) => `<b>${b}</b>`).join('')}</div>` : '<div class="w98-bar"></div>') + '</div>'
// a área de trabalho dentro da tela (px de um desktop de 800 de largura)
const DESK_ICONS = [['b-17', 'Meu computador'], ['b-12', 'Lixeira'], ['c-07', 'Trabalhos'], ['b-13', 'manifesto.txt'], ['b-11', 'Prompt']]
const DESK_T = { bar: 0.26, icons: [0.28, 0.42] }
const POPS_IN = [ // [T, x, y, largura, html, classe, T em que fecha]
  // nas bordas: o cartaz continua sendo o centro da tela
  [0.46, 586, 18, 200, win('Alerta', 'Alerta de site bom demais.', ['Fechar', 'Continuar'], ico('b-19'))],
  [0.47, 96, 26, 196, win('Aviso', 'Feche esse pop-up.', ['OK']), 'aviso', CUR.ok], // o cursor obedece
  [0.57, 586, 266, 204, win('manifesto.txt', 'Este pop-up foi posicionado exatamente aqui.', ['OK'], ico('b-13'))],
  [CUR.open, 590, 150, 196, win('Trabalhos', 'Abrindo trabalhos… <span class="pct">0%</span>'), 'prog'],
]
// fora da tela (frações da caixa do aparelho; largura em fração da ALTURA dele)
const OUT = [ // [T, x, y, largura, ícone | html, dither]
  // entram no fim do zoom (antes disso o aparelho ainda é grande e elas sairiam cortadas)
  [0.7, -0.4, 0.0, 0.46, 'a-03'],
  [0.73, -0.14, -0.12, 0.16, 'a-13'],
  [0.76, 0.66, -0.1, 0.52, win('MyTi', 'Deseja continuar vivenciando?', ['Sim', 'Sim, por favor'])],
  [0.78, 1.0, 0.12, 0.08, 'a-22'],
  [0.8, 1.04, 0.4, 0.3, 'a-09'],
  [0.82, -0.34, 0.58, 0.24, 'a-01', 1],
  [0.84, 1.06, 0.74, 0.2, 'a-18'],
  [0.86, -0.14, 0.86, 0.16, 'a-20'],
  [0.88, 0.86, 0.92, 0.1, 'a-24', 1],
  [0.9, 1.24, 0.24, 0.18, 'a-23', 1],
]
const WIN_W = 300 // largura natural das janelas de fora (px), escaladas para caber

// ---------- painel (a escolha fica neste navegador) ----------
const store = (() => { try { return JSON.parse(localStorage.getItem('lab-s6-v12') || '{}') } catch { return {} } })()
const sel = { dev: 's2', wall: 'u_yOkNxeFoh-s', mode: '2', tone: 'paper', crt: '1.5', ...store } // padrão = a escolha de 27/10
const save = () => { try { localStorage.setItem('lab-s6-v12', JSON.stringify(sel)) } catch { /* sem storage: só não lembra */ } }

const q = (s) => document.querySelector(s)
const stage = q('.stage'), rig = q('.rig'), crt = q('.crt'), crtIn = q('.crt-in'), poster = q('.poster')
const devEl = q('.dev'), devImg = q('.dev img'), out = q('.out'), desk = q('.desk'), tOut = q('.panel .t')
const bend = q('#crt-bend'), offR = q('#crt-r'), offB = q('#crt-b')

// o mapa da curva: R/G = deslocamento em x/y (0,5 = parado); a borda puxa de fora → barril
;(() => {
  const N = 256, c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d'), img = ctx.createImageData(N, N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x / (N - 1)) * 2 - 1, v = (y / (N - 1)) * 2 - 1, r2 = u * u + v * v
    const k = (y * N + x) * 4
    img.data[k] = 128 + 127 * (u * r2) / 2
    img.data[k + 1] = 128 + 127 * (v * r2) / 2
    img.data[k + 2] = 128
    img.data[k + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  q('#crt-map').setAttribute('href', c.toDataURL())
})()

// ---------- a seção 6 real, parada no cartaz ----------
const host = poster.querySelector('.s6')
host.dataset.s6 = JSON.stringify(strings.pt.manifesto.act2.c)
mountS6(host, { still: true })

// ---------- área de trabalho e janelas ----------
desk.innerHTML = DESK_ICONS.map(([n, label], i) => `<div class="pop ico" style="left:10px;top:${12 + i * 76}px"><img src="${ico(n)}" alt=""><span>${label}</span></div>`).join('')
  + POPS_IN.map(([, x, y, w, html, kind]) => `<div class="pop${kind ? ` ${kind}` : ''}" style="left:${x}px;top:${y}px;width:${w}px">${html}</div>`).join('')
  + `<div class="pop tb"><b><img src="${logoUrl}" alt="">MyTi</b><b class="task">manifesto.txt</b><b class="task t2">Trabalhos</b><span class="clock"></span></div>`
  + `<canvas class="cur"></canvas><div class="s6-impact"><svg viewBox="-50 -50 100 100">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('')}</svg></div>`
const deskPops = [...desk.querySelectorAll('.pop')]
const deskOn = [ // [abre, fecha]
  ...DESK_ICONS.map((_, i) => [lerp(...DESK_T.icons, i / (DESK_ICONS.length - 1)), 2]),
  ...POPS_IN.map(([t, , , , , , off = 2]) => [t, off]),
  [DESK_T.bar, 2],
]
const prog = desk.querySelector('.prog .w98'), pct = desk.querySelector('.pct')
const clock = desk.querySelector('.clock')
const [task1, task2] = desk.querySelectorAll('.tb .task')
const folder = deskPops[2], okBtn = desk.querySelector('.aviso b')

out.innerHTML = OUT.map(([, , , , what, d]) => `<div class="pop">${what.startsWith('<') ? `<div class="stk" style="width:${WIN_W}px;transform-origin:0 0">${what}</div>` : `<img class="stk" src="${ico(what, d)}" alt="">`}</div>`).join('')
const outPops = [...out.querySelectorAll('.pop')]
const stks = outPops.map((p) => p.firstElementChild)
const wobble = stks.filter((el, i) => el.tagName === 'IMG' && !OUT[i][5] && OUT[i][4] !== 'a-03') // a cascata de erros é janela também

// ---------- o cursor da seção 6, de volta (dentro da tela) ----------
// O mesmo cursor em dither que digitou, arrastou, clicou em "apresentar" e se
// desfez em pixels: aqui ele se refaz na área de trabalho. Posição pelo scroll
// (com inércia); cliques, impacto e troca de forma em tempo real, disparados ao
// passar do ponto rolando para baixo — como na seção 6 (manifestoS6.js).
const HOURGLASS = [[
  'kkkkkkkkkkk',
  'kwwwwwwwwwk',
  'kkkkkkkkkkk',
  '.kwwwwwwwk.',
  '.kwkkkkkwk.',
  '.kwwkkkwwk.',
  '..kwwkwwk..',
  '...kwwwk...',
  '....kwk....',
  '....kwk....',
  '...kwwwk...',
  '..kwwwwwk..',
  '.kwwwkwwwk.',
  '.kwwkkkwwk.',
  '.kwkkkkkwk.',
  '.kkkkkkkkk.',
  'kkkkkkkkkkk',
  'kwwwwwwwwwk',
  'kkkkkkkkkkk',
], [5, 9]]
const SPR = Object.fromEntries(Object.entries({ arrow: EDITOR.arrow, wait: HOURGLASS }).map(([k, [art, anchor]]) => [k, { art: shadeOf(art), anchor }]))
const CELL = 2.1 // px do desktop por pixel do desenho: a seta fica com ~40 px (lê até com a tela pequena)
const RES = 2 // canvas do cursor em 2× (a célula do dither fica com 1,5 px do desktop)
const HIT = { bump: 7, spin: 14, dbl: 0.18 } // recuo (px), giro (graus), intervalo do duplo clique (s)
const MORPH_MS = 160 // troca de forma (seta ↔ ampulheta), por limiar de Bayer
const TAU = 0.14 // inércia (s)
const damp = (a, b, tau, dt) => b + (a - b) * Math.exp(-dt / tau)
const jolt = (a, f = 26) => (a < 1.4 ? Math.exp(-a * 6) * Math.sin(a * f + 0.5) : 0)
const squash = (a, d) => 1 - d * (a < 1 ? Math.exp(-a * 10) : 0)

const curCv = desk.querySelector('.cur'), cx = curCv.getContext('2d'), impact = desk.querySelector('.s6-impact')
// um ponto (frações) de um elemento, em px do desktop (offsets: a transform da tela não entra)
const at = (el, fx = 0.5, fy = 0.5) => {
  let x = el.offsetWidth * fx, y = el.offsetHeight * fy
  for (let e = el; e && e !== desk; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop }
  return [x, y]
}
let P = null // pontos do trajeto (medidos no layout)
const cursor = { pos: null, shown: 'arrow', prev: null, morph0: 0, last: 0, prevT: null, hit: { ok: null, dbl: null }, lastHit: null, dbl2: false, drawn: '' }
function measureCursor(DH) {
  curCv.width = 800 * RES; curCv.height = Math.round(DH * RES)
  curCv.style.height = `${DH}px`
  P = { start: [455, DH * 0.6], ok: at(okBtn, 0.5, 0.55), icon: at(folder.querySelector('img'), 0.55, 0.5), win: at(prog, 0.8, 0.72) }
  cursor.drawn = ''
}
function curTarget(T) {
  const seg = ([a, b], p0, p1) => { const e = easeInOut(ramp(T, a, b)); return [lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e)] }
  if (T < CUR.toOk[1]) return seg(CUR.toOk, P.start, P.ok)
  if (T < CUR.toWin[0]) return seg(CUR.toIcon, P.ok, P.icon)
  return seg(CUR.toWin, P.icon, P.win)
}
function fireImpact([x, y]) {
  Object.assign(impact.style, { left: `${x}px`, top: `${y}px` })
  impact.classList.remove('on')
  void impact.offsetWidth // reinicia a animação
  impact.classList.add('on')
}
function cursorFrame(now, T) {
  const c = cursor
  const dt = c.last ? Math.min(0.05, (now - c.last) / 1000) : 0
  c.last = now
  const tgt = curTarget(T)
  c.pos = c.pos && dt && !REDUCE ? [damp(c.pos[0], tgt[0], TAU, dt), damp(c.pos[1], tgt[1], TAU, dt)] : tgt
  // cliques: só quando o scroll PASSA do ponto (abrir a página no meio não clica)
  for (const [h, th] of [['ok', CUR.ok], ['dbl', CUR.dbl]]) {
    if (c.prevT !== null && c.prevT < th && T >= th && !REDUCE) { c.hit[h] = now; c.lastHit = h; c.dbl2 = false; fireImpact(tgt) }
  }
  c.prevT = T
  let ha = c.lastHit ? (now - c.hit[c.lastHit]) / 1000 : 99
  if (c.lastHit === 'dbl' && ha >= HIT.dbl) {
    if (!c.dbl2) { c.dbl2 = true; fireImpact(tgt) } // o segundo clique do duplo
    ha -= HIT.dbl
  }
  // forma: esperando a janela abrir, ampulheta; a barra em 100%, seta de novo
  const want = T >= CUR.open && T < 1 ? 'wait' : 'arrow'
  if (want !== c.shown) { c.prev = c.shown; c.shown = want; c.morph0 = now }
  const u = c.prev && !REDUCE ? clamp01((now - c.morph0) / MORPH_MS) * 1.01 : 1.01
  const a = REDUCE ? 1.01 : ramp(T, ...CUR.appear) * 1.01
  const key = `${c.pos[0].toFixed(1)},${c.pos[1].toFixed(1)},${a.toFixed(3)},${c.shown},${u.toFixed(2)},${ha < 1.4 ? ha.toFixed(3) : ''}`
  if (key === c.drawn) return
  c.drawn = key
  cx.clearRect(0, 0, curCv.width, curCv.height)
  if (a <= 0) return
  // clique: o cursor recua, gira e achata (como na seção 6)
  const cj = jolt(ha) * HIT.bump
  const spin = (jolt(ha, 20) * HIT.spin * Math.PI) / 180
  const hc = CELL * squash(ha, 0.2) * RES
  const x = (c.pos[0] - cj * 0.4) * RES, y = (c.pos[1] - cj) * RES
  const draw = (name, show) => { const { art, anchor } = SPR[name]; drawSprite(cx, art, x, y, anchor[0], anchor[1], hc, show, spin) }
  if (u < 1 && c.prev) draw(c.prev, (t) => t >= u && t < a)
  draw(c.shown, (t) => t < Math.min(a, u))
}

// ---------- vida no PC: pouso, inclinação pelo scroll, olhar para o cursor, LEDs ----------
// As molas da TV da seção 2 (tv3d.js: Euler semi-implícito em passos fixos). O
// corpo (tela + aparelho) gira pela base; o PC só "existe" a partir do zoom —
// antes disso a tela é o cartaz e não pode balançar.
const SPRING = {
  tilt: { k: 48, zeta: 0.26 }, // a inclinação do scroll: solta, balança quando o scroll para
  look: { k: 70, zeta: 0.62 }, // olhar para o cursor: segue com um leve passar do ponto
  land: { k: 90, zeta: 0.32 }, // o pouso: afunda, volta e assenta
}
const TILT = { gain: 2.4, max: 5 } // graus por (altura de tela / s) de scroll, e teto
const LOOK = { y: 3.5, x: 2.2 } // graus no máximo, com o cursor na borda da janela
const LAND = { drop: 300, kick: 18 } // impulso do pouso: px/s por 1000 px de altura do aparelho (afunda ~2%) e graus/s
// LEDs (px da imagem do aparelho); só o render do PC da seção 2 tem os pontos medidos
const LEDS = { s2: { pow: [866, 676], hd: [527, 729] } }
const HD_BLINK = 0.45 // s piscando a cada janela que abre

const stepSpring = (s, target, { k, zeta }, dt) => {
  const c = 2 * zeta * Math.sqrt(k)
  for (let left = dt; left > 1e-6; left -= 1 / 120) {
    const h = Math.min(left, 1 / 120)
    s.v += (k * (target - s.x) - c * s.v) * h
    s.x += s.v * h
  }
}
const bodyEl = q('.body'), shadowEl = q('.shadow'), ledsEl = q('.leds')
const ledPow = q('.led-pow'), ledHd = q('.led-hd')
const life = { tilt: { x: 0, v: 0 }, lookX: { x: 0, v: 0 }, lookY: { x: 0, v: 0 }, land: { x: 0, v: 0 }, last: 0, lastY: null, prevT: null, hd: -9, opened: 0 }
let mouse = null
if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', (e) => { mouse = [e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5] })
let devBox = null // { dh } do aparelho, em px do rig (medido no layout)

function lifeFrame(now, T) {
  const L = life
  const dt = L.last ? Math.min(0.05, (now - L.last) / 1000) : 0
  L.last = now
  if (REDUCE || !devBox || !dt) { L.lastY = scrollY; L.prevT = T; return }
  const on = ramp(T, TL.zoom[0], TL.zoom[0] + 0.15) // o PC passa a ter corpo
  // inclinação: contra o scroll (rolando para baixo, o topo vai para trás) e balança ao parar
  const vel = (scrollY - (L.lastY ?? scrollY)) / innerHeight / dt
  L.lastY = scrollY
  const tiltT = Math.max(-TILT.max, Math.min(TILT.max, vel * TILT.gain)) * on
  stepSpring(L.tilt, tiltT, SPRING.tilt, dt)
  // olhar para o cursor (só mouse)
  stepSpring(L.lookY, mouse ? mouse[0] * 2 * LOOK.y * on : 0, SPRING.look, dt)
  stepSpring(L.lookX, mouse ? -mouse[1] * 2 * LOOK.x * on : 0, SPRING.look, dt)
  // o pouso: ao passar do fim do zoom rolando para baixo, afunda e balança
  if (L.prevT !== null && L.prevT < TL.zoom[1] && T >= TL.zoom[1]) { L.land.v += LAND.drop * (devBox.dh / 1000); L.tilt.v += LAND.kick }
  stepSpring(L.land, 0, SPRING.land, dt)
  // LED do HD: pisca quando uma janela abre (e enquanto "Abrindo trabalhos…" lê o disco)
  const opened = deskOn.filter(([a, b]) => T >= a && T < b).length + (T >= CUR.open ? 1 : 0)
  if (L.prevT !== null && opened > L.opened) L.hd = now
  L.opened = opened
  L.prevT = T
  const reading = (now - L.hd) / 1000 < HD_BLINK || (T >= CUR.open && T < 1 && Math.abs(vel) > 0.02)
  ledHd.style.opacity = reading && Math.random() > 0.45 ? 1 : 0.12
  ledPow.style.opacity = ramp(T, TL.zoom[0], TL.zoom[0] + 0.1)

  const rx = L.tilt.x + L.lookX.x, ry = L.lookY.x
  bodyEl.style.transform = `perspective(${devBox.dh * 4}px) translateY(${L.land.x.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`
  // o reflexo do vidro corre ao contrário do giro
  crt.style.setProperty('--gx', `${28 - ry * 5}%`)
  crt.style.setProperty('--gy', `${18 + rx * 4}%`)
  // a sombra no chão: aparece com a luz; o PC afundando a aperta, inclinando a desloca
  const lit = easeInOut(ramp(T, ...TL.room))
  const press = 1 + L.land.x / devBox.dh
  shadowEl.style.opacity = (lit * Math.min(1.3, press)).toFixed(3)
  shadowEl.style.transform = `translateX(${(ry * devBox.dh * 0.004).toFixed(2)}px) scale(${(press * (1 - Math.abs(rx) * 0.01)).toFixed(4)}, 1)`
}

// ---------- wallpaper (shader) ----------
const wallCv = q('.wall')
const wall = (() => {
  const renderer = new THREE.WebGLRenderer({ canvas: wallCv, antialias: false })
  const pr = Math.min(devicePixelRatio, 1.5)
  renderer.setPixelRatio(pr)
  const u = {
    uTex: { value: null }, uTexA: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) }, uOurs: { value: 1 },
    uDis: { value: 0 }, uCol: { value: 0 }, uCell: { value: 3 * pr },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; uniform float uTexA, uOurs, uDis, uCol, uCell; uniform vec2 uRes;
      varying vec2 vUv;
      float b2(vec2 p) { p = floor(p); return fract(p.x * .5 + p.y * p.y * .75); }
      float b8(vec2 p) { return b2(p * .25) * .0625 + b2(p * .5) * .25 + b2(p); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y); }
      float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= .5; } return v; }
      // o nosso morro: céu em degradê, nuvens de ruído, a curva do morro (uv com y para cima)
      vec3 ours(vec2 uv) {
        float asp = uRes.x / uRes.y;
        vec3 sky = mix(vec3(.6, .8, .98), vec3(.1, .36, .86), smoothstep(.3, 1., uv.y));
        float c = smoothstep(.52, .78, fbm(vec2(uv.x * asp * 2.4, uv.y * 5.) + 3.)) * smoothstep(.42, .8, uv.y);
        sky = mix(sky, vec3(1.), c * .92);
        float h = .4 + .07 * sin(uv.x * 3.1 + .5) + .022 * sin(uv.x * 7.3 + 1.4);
        vec3 grass = mix(vec3(.16, .46, .08), vec3(.46, .76, .18), smoothstep(h - .38, h, uv.y));
        grass *= .88 + .24 * fbm(uv * vec2(30., 80.));
        return mix(grass, sky, smoothstep(h - .002, h + .002, uv.y));
      }
      vec3 src(vec2 uv) {
        if (uOurs > .5) return ours(uv);
        float ra = (uRes.x / uRes.y) / uTexA; // cover
        vec2 t = uv;
        if (ra > 1.) t.y = (t.y - .5) / ra + .5; else t.x = (t.x - .5) * ra + .5;
        return texture2D(uTex, t).rgb;
      }
      void main() {
        vec2 cell = floor(gl_FragCoord.xy / uCell);
        float th = b8(cell);
        vec3 col = src(vUv);
        // dither: a cor da célula inteira, em 4 cinzas
        float l = dot(src((cell + .5) * uCell / uRes), vec3(.299, .587, .114));
        float v = clamp((l - .5) * 1.25 + .5, 0., 1.) * 3.;
        float lv = min(3., floor(v) + step(th, fract(v)));
        vec3 pal = lv < .5 ? vec3(.078) : lv < 1.5 ? vec3(.373) : lv < 2.5 ? vec3(.725) : vec3(1.);
        vec3 o = th < uDis ? pal : vec3(.078);
        gl_FragColor = vec4(th < uCol ? col : o, 1.);
      }`,
  })
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat))
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const loader = new THREE.TextureLoader()
  let dirty = true
  return {
    size(w, h) { renderer.setSize(w, h, false); u.uRes.value.set(w * pr, h * pr); dirty = true },
    set(name) {
      u.uOurs.value = name === 'ours' ? 1 : 0
      if (name !== 'ours') loader.load(WALL[name], (t) => { u.uTex.value?.dispose(); u.uTex.value = t; u.uTexA.value = t.image.width / t.image.height; dirty = true; invalidate() })
      dirty = true
    },
    draw(dis, col) {
      if (!dirty && u.uDis.value === dis && u.uCol.value === col) return
      u.uDis.value = dis; u.uCol.value = col; dirty = false
      renderer.render(scene, cam)
    },
  }
})()

// ---------- medidas ----------
let vw, vh, W1, H1, cs, k0, kf, fcx, fcy, lastT = -1, dirty = true
function invalidate() { dirty = true } // a textura do wallpaper chegou depois do quadro
function layout() {
  vw = innerWidth; vh = innerHeight
  const [, img, geo] = DEVICES[sel.dev]
  const d = DEV[geo], s = d.screen
  devImg.src = IMG[img]
  // a tela antes do zoom: FIT da altura, na proporção do buraco do aparelho
  H1 = vh * FIT; W1 = (H1 * s.w) / s.h
  if (W1 > vw * 0.92) { W1 = vw * 0.92; H1 = (W1 * s.h) / s.w }
  const ds = W1 / s.w // px da imagem → px do rig
  cs = Math.min(W1 / vw, H1 / vh) // o cartaz (viewport inteira) cabe na tela
  k0 = 1 / cs // no começo o rig cobre a viewport e o cartaz fica 1:1
  const dw = d.w * ds, dh = d.h * ds
  kf = Math.min(vh * FINAL, (vw * 0.7 * d.h) / d.w) / dh
  fcx = vw / 2 + (s.x + s.w / 2 - d.w / 2) * ds * kf
  fcy = vh / 2 + (s.y + s.h / 2 - d.h / 2) * ds * kf
  Object.assign(rig.style, { width: `${W1}px`, height: `${H1}px` })
  crt.style.setProperty('--h', `${H1}px`)
  const box = { left: `${-s.x * ds}px`, top: `${-s.y * ds}px`, width: `${dw}px`, height: `${dh}px` }
  Object.assign(devEl.style, box)
  Object.assign(ledsEl.style, box)
  // o corpo gira pela base do aparelho; a sombra é uma elipse rente a ela
  devBox = { dh }
  bodyEl.style.transformOrigin = `${-s.x * ds + dw / 2}px ${-s.y * ds + dh}px`
  Object.assign(shadowEl.style, { left: `${-s.x * ds + dw * 0.04}px`, top: `${-s.y * ds + dh * 0.955}px`, width: `${dw * 0.92}px`, height: `${dh * 0.09}px` })
  const led = LEDS[geo]
  ledsEl.style.display = led ? '' : 'none'
  if (led) for (const [el, [x, y]] of [[ledPow, led.pow], [ledHd, led.hd]]) Object.assign(el.style, { left: `${(x / d.w) * 100}%`, top: `${(y / d.h) * 100}%` })
  Object.assign(out.style, box)
  Object.assign(poster.style, { width: `${vw}px`, height: `${vh}px`, left: `${(W1 - vw * cs) / 2}px`, top: `${(H1 - vh * cs) / 2}px`, transform: `scale(${cs})` })
  Object.assign(desk.style, { height: `${(800 * H1) / W1}px`, transform: `scale(${W1 / 800})` })
  measureCursor((800 * H1) / W1)
  OUT.forEach(([, x, y, w], i) => {
    Object.assign(outPops[i].style, { left: `${x * dw}px`, top: `${y * dh}px`, width: `${w * dh}px` })
    if (stks[i].tagName === 'DIV') stks[i].style.transform = `scale(${(w * dh) / WIN_W})`
    else stks[i].style.width = '100%'
  })
  wall.size(W1, H1)
  dirty = true
}

const rgb = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`
function frame(now) {
  const T = REDUCE ? 1 : clamp01((scrollY - HOLD0 * vh) / (LEN * vh))
  // stop-motion das figurinhas de fora: 2 poses, cada uma na sua fase (janelas não balançam)
  wobble.forEach((el, i) => { const p = String(Math.floor(now / 500 + i * 0.37) % 2); if (el.dataset.pose !== p) el.dataset.pose = p })
  cursorFrame(now, T) // inércia, cliques e troca de forma andam no tempo real
  lifeFrame(now, T) // molas do PC e LEDs, idem
  if (T === lastT && !dirty) return
  lastT = T; dirty = false
  tOut.textContent = T.toFixed(2)

  // o tubo
  const c = ramp(T, ...TL.crt) * Number(sel.crt)
  stage.style.setProperty('--crt', c)
  crt.style.setProperty('--rad', `${c * 3.4}% / ${c * 4.4}%`)
  crtIn.classList.toggle('curved', c > 0.001) // sem efeito, sem filtro: o cartaz nítido como na seção 6
  bend.setAttribute('scale', (0.1 * c).toFixed(4))
  offR.setAttribute('dx', (0.0013 * c).toFixed(5))
  offB.setAttribute('dx', (-0.0013 * c).toFixed(5))
  // o texto sobre o wallpaper ganha a sombra dos rótulos da área de trabalho
  const sh = ramp(T, ...TL.wall)
  poster.style.filter = [
    sel.tone === 'phos' && c > 0 && `sepia(${0.5 * c}) hue-rotate(${70 * c}deg) saturate(${1 + 1.4 * c}) brightness(${1 + 0.1 * c}) drop-shadow(0 0 ${5 * c}px rgba(150,255,200,${0.5 * c}))`,
    sh > 0 && `drop-shadow(0 4px 3px rgba(0,0,0,${0.75 * sh}))`,
  ].filter(Boolean).join(' ')

  // o rig: encolhe (cobrindo → tela 4:3) e dá o zoom out (tela → aparelho)
  const e1 = easeInOut(ramp(T, ...TL.shrink)), e2 = easeInOut(ramp(T, ...TL.zoom))
  const k = Math.exp(lerp(Math.log(k0), 0, e1) + lerp(0, Math.log(kf), e2))
  const cx = lerp(vw / 2, fcx, e2), cy = lerp(vh / 2, fcy, e2)
  rig.style.transform = `translate3d(${cx - (W1 / 2) * k}px, ${cy - (H1 / 2) * k}px, 0) scale(${k})`
  // scanlines e máscara somem quando a tela fica pequena (abaixo disso viram moiré)
  stage.style.setProperty('--fine', ramp(k, 0.5, 0.85))

  // o wallpaper: preto → dither → cor (8 degraus)
  const w = ramp(T, ...TL.wall)
  const steps = (x) => Math.floor(x * 8) / 8
  const [dis, col] = sel.mode === '2' ? [ramp(w, 0, 0.55), steps(ramp(w, 0.55, 1))] : sel.mode === '1' ? [0, steps(w)] : [w, 0]
  wall.draw(dis, col)

  // o aparelho sai do escuro; a sala acende
  stage.style.setProperty('--lit', lerp(0.04, 1, easeInOut(ramp(T, ...TL.lights))))
  stage.style.setProperty('--room', rgb([20, 20, 20], [255, 255, 255], easeInOut(ramp(T, ...TL.room))))

  // a área de trabalho, as janelas e as figurinhas
  deskPops.forEach((el, i) => el.classList.toggle('on', T >= deskOn[i][0] && T < deskOn[i][1]))
  outPops.forEach((el, i) => el.classList.toggle('on', T >= OUT[i][0]))
  // o OK afunda um instante antes de o pop-up fechar; a pasta fica selecionada no 1º clique
  okBtn.classList.toggle('down', T >= CUR.ok - 0.006 && T < CUR.ok)
  folder.classList.toggle('sel', T >= CUR.dbl)
  // Trabalhos aberto: a barra anda com o scroll e chega a 100% quando o Work entra (T = 1)
  const p = ramp(T, CUR.open, 1)
  prog.style.setProperty('--prog', p)
  pct.textContent = `${Math.round(p * 100)}%`
  task1.classList.toggle('up', T >= CUR.open)
  task2.classList.toggle('on', T >= CUR.open)
  clock.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ---------- o Work logo abaixo ----------
const W = strings.pt.work
q('.work-lab').innerHTML = `<span class="eyebrow">${W.eyebrow}</span><h2>${W.heading}</h2>`
  + `<div class="grid">${W.cases.map((c) => `<div class="card">${c.thumb}</div>`).join('')}</div>`

// ---------- painel ----------
const fill = (k, list) => { const s = q(`[data-k="${k}"]`); s.innerHTML = list.map(([v, l]) => `<option value="${v}">${l}</option>`).join('') }
fill('dev', Object.entries(DEVICES).map(([k, [l]]) => [k, l]))
fill('wall', WALLS)
document.querySelectorAll('.panel [data-k]').forEach((el) => {
  el.value = sel[el.dataset.k]
  el.addEventListener('input', () => {
    sel[el.dataset.k] = el.value
    save()
    if (el.dataset.k === 'wall') wall.set(el.value)
    if (el.dataset.k === 'dev') layout()
    dirty = true
  })
})

q('.tr').style.height = `${(HOLD0 + LEN + 1) * 100}vh`
wall.set(sel.wall)
layout()
addEventListener('resize', layout)
const lenis = REDUCE ? null : new Lenis()
history.scrollRestoration = 'manual' // recarregar volta ao ?t, não à posição antiga
if (START !== null) { const y = (HOLD0 + LEN * Number(START)) * vh; scrollTo(0, y); lenis?.scrollTo(y, { immediate: true }) }
requestAnimationFrame(function raf(t) { lenis?.raf(t); frame(t); requestAnimationFrame(raf) })
