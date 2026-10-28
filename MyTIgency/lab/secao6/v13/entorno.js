// LAB v13 — o entorno do PC (fora da tela), ideias replicadas das referências
// (refs/) e escolhidas no painel:
//   A · ficha técnica — o PC como peça catalogada: créditos com fios nos cantos
//       (A24), anotações numeradas ligadas às partes do PC (Igloo), dados reais
//       da visita e a lista do que aconteceu no manifesto (Teenage Engineering).
//   B · cartaz — o PC na frente da palavra (Santioni): "TRABALHOS" gigante atrás
//       dele se preenche de vermelho com a barra de "Abrindo trabalhos…";
//       microtexto dos dois lados, moldura de página e um adesivo colado (Playdate).
//   C · mesa — o habitat de quem fez (Henry Heffernan): o PC numa mesa em 3D com
//       disquetes, as duas canecas (2 pessoas + café), bilhetes e lápis; na sala
//       escura só a tela os ilumina, depois a lâmpada.
//   D · cartaz + mesa — o cartaz (menos "manifesto · 2026") com a mesa escura
//       cobrindo a parte de baixo da tela e uma base de corte na frente do
//       teclado. Com a barra em 100%, mais scroll inclina a câmera até ver a mesa
//       de cima (Oryzo, da Lusion): o PC e a palavra saem por cima e a base de
//       corte toma a tela — e continua como o fundo da seção de trabalhos, onde
//       os cards caem sobre ela. A mesa atravessa as duas seções.
// Em A, B e C a sala escura ganha a grade de pontos da seção 6 (Nothing).
//
// Camadas (main.js): back — atrás do aparelho, na parede; desk — canvas WebGL
// dentro da câmera, atrás do rig; front — por cima de tudo, em px de tela; work —
// a seção de trabalhos, logo abaixo. frame(st) roda todo quadro (o scroll, a
// lâmpada, o cursor e a visita mudam no tempo); cada ideia só escreve no DOM
// quando algo muda. Em D, frame devolve o ajuste do PC enquanto a câmera inclina
// (o main.js o aplica no rig). Nada aqui é inventado: os textos são do
// manifesto, os números são da própria visita.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import logoRaw from '../../../src/assets/logo.svg?raw'
import './entorno.css'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const lerp = (a, b, t) => a + (b - a) * t
const easeOut = (t) => 1 - (1 - t) ** 3
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export const ENVS = [
  ['cartaz-folha', 'E · cartaz + mesa + folha'],
  ['cartaz-mesa', 'D · cartaz + mesa'],
  ['ficha', 'A · ficha técnica'],
  ['cartaz', 'B · cartaz'],
  ['mesa', 'C · mesa'],
  ['nenhum', 'só o PC'],
  ['v12', 'figurinhas (v12)'],
]

// a imagem do PC (devices.json → s2): um ponto em px dela vira px de tela
const PC = { w: 1228, h: 983 }
const at = (st, ix, iy) => [st.dev.x + (ix / PC.w) * st.dev.w, st.dev.y + (iy / PC.h) * st.dev.h]
// um ponto preso ao PC, depois do ajuste da câmera inclinando (D): escala em volta
// da base dele e desloca junto
const follow = (pc, [x, y]) => (pc ? [pc.ax + (x - pc.ax) * pc.sx + pc.dx, pc.ay + (y - pc.ay) * pc.sy + pc.dy] : [x, y])

// escreve no DOM só quando o valor muda
function css(el, name, v) {
  const c = (el.__c ||= {})
  if (c[name] === v) return
  c[name] = v
  if (name.startsWith('--')) el.style.setProperty(name, v)
  else el.style[name] = v
}
function txt(el, v) { if (el.__t !== v) { el.__t = v; el.textContent = v } }
const n3 = (v) => v.toFixed(3)
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function mountEnv(kind, layers) {
  const make = { ficha, cartaz, mesa, 'cartaz-mesa': cartazMesa, 'cartaz-folha': (l) => cartazMesa(l, { sheet: true }) }[kind]
  if (!make) return { extra: 0, frame() {}, resize() {}, dispose() {} }
  // a grade de pontos da sala escura (fora de D e E)
  const dots = kind.startsWith('cartaz-') ? null : Object.assign(document.createElement('div'), { className: 'env-dots' })
  if (dots) layers.back.append(dots)
  const inner = make(layers)
  return {
    extra: inner.extra ?? 0, // alturas de tela de scroll a mais (a transição da mesa, em D)
    frame(st) {
      if (dots) css(dots, 'opacity', n3((1 - st.lamp) * ramp(st.T, 0.45, 0.7)))
      return inner.frame(st)
    },
    resize(vw, vh) { inner.resize?.(vw, vh) },
    dispose() {
      inner.dispose?.()
      layers.back.innerHTML = ''
      layers.front.innerHTML = ''
    },
  }
}

// ========== A · ficha técnica ==========
const FICHA = {
  blocks: { tl: [0.6, 0.76], tr: [0.63, 0.79], bl: [0.66, 0.8], br: [0.68, 0.82] }, // T em que cada canto entra
  rows: [0.62, 0.025, 0.07], // linhas da tabela: começo, passo, duração
  list: [0.66, 0.022, 0.07], // itens da lista do que aconteceu, idem
  notes: [0.8, 0.03, 0.07], // anotações: começo, passo, duração
  gap: 28, // px entre o PC e o rótulo de cada anotação
}
// o que de fato aconteceu no manifesto, contado
const HAPPENED = [['01', 'traço desenhado à mão'], ['01', 'esbarrão no PC'], ['01', 'régua arrastada e trancada'],
  ['01', 'tecla enter'], ['04', 'rabiscos de caneta'], ['01', 'clique em "apresentar"']]
// [x, y na imagem do PC, lado (−1 esquerda / 1 direita), número, parte, nota]
const NOTES = [
  [206, 430, -1, '01', 'tela', 'o manifesto, ainda aceso'],
  [866, 676, 1, '02', 'led', 'ligado desde a seção 2'],
  [700, 735, 1, '03', 'drive', 'os trabalhos estão no disco'],
  [330, 932, -1, '04', 'teclado', 'cada linha foi escrita aqui'],
]

function ficha({ front }) {
  const row = (k, v, data = '') => `<div class="ef-row"><dt>${k}</dt><dd${data}>${v}</dd></div>`
  front.innerHTML = `
    <div class="ef-blk ef-tl">
      <p class="env-mono"><b>( 06 / 06 )</b> fim do manifesto</p>
      <h3 class="ef-title">Manifesto</h3>
      <dl class="ef-tab">${row('feito por', 'miguel &amp; thiago')}${row('ano', '2026')}${row('seções', '06')}${row('tempo aqui', '00:00', ' data-v="time"')}${row('rolagem', '0 px', ' data-v="scroll"')}</dl>
    </div>
    <div class="ef-blk ef-tr">
      <p class="env-mono"><b>//////</b> o que aconteceu aqui</p>
      <ol class="ef-list">${HAPPENED.map(([n, t]) => `<li><b>${n}</b>${t}</li>`).join('')}</ol>
    </div>
    <div class="ef-blk ef-bl">
      <p class="env-mono">role para abrir os trabalhos ↓</p>
      <div class="ef-bar"><i></i></div>
      <p class="env-mono"><span data-v="pct">000%</span> · trabalhos</p>
    </div>
    <div class="ef-blk ef-br">
      <p class="env-mono" data-v="xy">x ---- · y ----</p>
      <p class="env-mono">a seguir <b>( 07 )</b> trabalhos →</p>
    </div>
    <svg class="ef-lines">${NOTES.map(() => '<polyline pathLength="1"/><circle class="ring" r="7"/><circle class="dot" r="3"/>').join('')}</svg>
    ${NOTES.map(([, , , n, part, note]) => `<div class="ef-note"><b>${n}</b><span>${part}</span><em>${note}</em></div>`).join('')}`
  const q = (s) => front.querySelector(s)
  const blocks = Object.fromEntries(Object.keys(FICHA.blocks).map((k) => [k, q(`.ef-${k}`)]))
  const rows = [...front.querySelectorAll('.ef-row')], items = [...front.querySelectorAll('.ef-list li')]
  const v = Object.fromEntries([...front.querySelectorAll('[data-v]')].map((el) => [el.dataset.v, el]))
  const bar = q('.ef-bar')
  const svg = q('.ef-lines')
  const lines = [...svg.querySelectorAll('polyline')], rings = [...svg.querySelectorAll('.ring')], dotsEl = [...svg.querySelectorAll('.dot')]
  const labels = [...front.querySelectorAll('.ef-note')]
  let labelW = null
  document.fonts.ready.then(() => { labelW = null }) // as larguras mudam quando as fontes chegam

  return {
    resize() { labelW = null },
    frame(st) {
      const { T } = st
      for (const [k, [a, b]] of Object.entries(FICHA.blocks)) css(blocks[k], '--in', n3(easeOut(ramp(T, a, b))))
      const stagger = (els, [a, step, dur]) => els.forEach((el, i) => css(el, '--in', n3(easeOut(ramp(T, a + i * step, a + i * step + dur)))))
      stagger(rows, FICHA.rows)
      stagger(items, FICHA.list)
      // dados da visita, ao vivo
      txt(v.time, clock(st.time))
      txt(v.scroll, `${Math.round(st.scrolled).toLocaleString('pt-BR')} px`)
      txt(v.pct, `${String(Math.round(st.p * 100)).padStart(3, '0')}%`)
      css(bar, '--p', n3(st.p))
      txt(v.xy, st.mouse ? `x ${String(Math.round(st.mouse[0])).padStart(4, '0')} · y ${String(Math.round(st.mouse[1])).padStart(4, '0')}` : 'x ---- · y ----')
      // anotações: o ponto na parte do PC, o fio até o rótulo, fora do aparelho
      labelW ||= labels.map((el) => el.offsetWidth)
      const [n0, ns, nd] = FICHA.notes
      NOTES.forEach(([ix, iy, side], i) => {
        const k = easeOut(ramp(T, n0 + i * ns, n0 + i * ns + nd))
        const [x, y] = at(st, ix, iy)
        const edge = side < 0 ? st.dev.x - FICHA.gap : st.dev.x + st.dev.w + FICHA.gap
        const lx = side < 0 ? edge - labelW[i] : edge
        css(lines[i], 'strokeDashoffset', n3(1 - k))
        const pts = `${x.toFixed(1)},${y.toFixed(1)} ${(edge - side * 6).toFixed(1)},${y.toFixed(1)}`
        if (lines[i].__p !== pts) { lines[i].__p = pts; lines[i].setAttribute('points', pts) }
        for (const c of [rings[i], dotsEl[i]]) {
          if (c.__x !== x || c.__y !== y) { c.__x = x; c.__y = y; c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)) }
          css(c, 'visibility', k > 0.02 ? 'visible' : 'hidden') // (o anel pulsa por animação: opacidade não o esconderia)
        }
        css(labels[i], '--in', n3(k))
        css(labels[i], 'transform', `translate(${(lx + side * (1 - k) * 10).toFixed(1)}px, ${(y - 7).toFixed(1)}px)`)
      })
    },
    dispose() {},
  }
}

// ========== B · cartaz ==========
const CARTAZ = {
  word: 'Trabalhos', // a próxima seção: a mesma pasta que o cursor abre na tela
  rise: [0.6, 0.86, 0.022], // as letras sobem: começo, fim, atraso entre letras
  chrome: [0.66, 0.82], // moldura e legendas
  side: [0.72, 0.86], // microtexto dos lados
  stamp: 0.88, // o adesivo carimba (tempo real, ao passar rolando para baixo)
  fit: 0.94, // a palavra ocupa esta fração da largura
  away: 0.22, // (D) moldura, legendas e microtexto saem neste começo da inclinação
}
const IMPACT = `<svg viewBox="-50 -50 100 100">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('')}</svg>`
// o adesivo: novo (não é do kit), recortado com borda branca, o texto girando em volta do logo
const STICKER = (() => {
  const logo = logoRaw.replace(/fill="black"/g, 'fill="#fff"').replace('<svg ', '<svg x="52" y="70" width="96" height="51" ')
  return `<svg viewBox="0 0 200 200"><defs><path id="ec-ring" d="M100,100 m-68,0 a68,68 0 1,1 136,0 a68,68 0 1,1 -136,0"/></defs>
    <circle cx="100" cy="100" r="97" fill="#fff"/><circle cx="100" cy="100" r="89" fill="#FF4438"/>
    <circle cx="100" cy="100" r="52" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="2 5"/>
    <text font-family="JetBrains Mono, monospace" font-size="12.5" font-weight="500" letter-spacing="2.6" fill="#fff"><textPath href="#ec-ring">FEITO À MÃO · POR 2 PESSOAS · COM CAFÉ ·</textPath></text>
    ${logo}</svg>`
})()

// right: a legenda "manifesto · 2026" do canto direito (D não tem)
function cartaz({ back, front }, { right = true } = {}) {
  const letters = [...CARTAZ.word.toUpperCase()].map((c) => `<span>${c}</span>`).join('')
  back.insertAdjacentHTML('beforeend', `<div class="ec-word"><div class="ec-o">${letters}</div><div class="ec-f">${letters}</div></div>`)
  const root = Object.assign(document.createElement('div'), { className: 'ec' })
  front.append(root)
  root.innerHTML = `
    <div class="ec-frame"><i></i><i></i><i></i><i></i></div>
    <p class="env-mono ec-cap ec-tl">MyTigency ®</p>
    ${right ? '<p class="env-mono ec-cap ec-tr">manifesto · 2026</p>' : ''}
    <p class="env-mono ec-cap ec-bc">role para abrir ↓</p>
    <div class="ec-side ec-l"><p class="env-mono"><b>( 06 )</b> fim do manifesto</p><i></i></div>
    <div class="ec-side ec-r"><i></i><p class="env-mono">trabalhos <b>( 07 )</b> <span data-v="pct">000%</span></p></div>
    <div class="ec-stk">${STICKER}</div>
    <div class="s6-impact ec-imp">${IMPACT}</div>`
  const word = back.querySelector('.ec-word')
  const spans = [...word.querySelectorAll('.ec-o span')].map((el, i) => [el, word.querySelectorAll('.ec-f span')[i]])
  const q = (s) => root.querySelector(s)
  const chrome = [q('.ec-frame'), ...root.querySelectorAll('.ec-cap')]
  const sideL = q('.ec-l'), sideR = q('.ec-r'), lineL = sideL.querySelector('i'), lineR = sideR.querySelector('i')
  const pct = q('[data-v="pct"]')
  const stk = q('.ec-stk'), imp = q('.ec-imp')
  let wordH = 80, prevT = null, textL = 0, textR = 0
  const measure = (vw) => {
    // a palavra ocupa CARTAZ.fit da largura: mede a 100 px e escala
    css(word, 'fontSize', '100px')
    css(word, 'fontSize', `${((100 * vw * CARTAZ.fit) / word.offsetWidth).toFixed(1)}px`)
    wordH = word.offsetHeight
    textL = sideL.firstElementChild.offsetWidth
    textR = sideR.lastElementChild.offsetWidth
  }
  let vwNow = innerWidth
  document.fonts.ready.then(() => measure(vwNow)) // as medidas mudam quando as fontes chegam

  return {
    resize(vw) { vwNow = vw; measure(vw) },
    frame(st) {
      const { T, pc } = st // pc: o ajuste do PC com a câmera inclinando (só em D)
      const away = pc ? ramp(pc.e, 0, CARTAZ.away) : 0
      // a palavra fica atrás do PC, centrada na altura dele; as letras sobem uma a uma.
      // Inclinando, a parede sobe junto (wallDy)
      const cy = st.dev.y + st.dev.h * 0.47
      const mx = st.mouse ? (st.mouse[0] / st.vw - 0.5) * -14 : 0 // um tiquinho de profundidade: a parede anda menos que o cursor
      css(word, 'transform', `translate(calc(-50% + ${mx.toFixed(1)}px), ${(cy - wordH / 2 + (pc?.wallDy ?? 0)).toFixed(1)}px)`)
      const [r0, r1, rd] = CARTAZ.rise
      spans.forEach(([o, f], i) => {
        const k = easeOut(ramp(T, r0 + i * rd, r1 - (spans.length - 1 - i) * rd))
        const tr = k < 1 ? `translateY(${((1 - k) * 60).toFixed(1)}%)` : ''
        css(o, 'transform', tr); css(f, 'transform', tr)
        css(o, 'opacity', n3(k)); css(f, 'opacity', n3(k))
      })
      css(word, '--fill', n3(easeInOut(st.p)))
      // moldura, legendas e o microtexto dos lados, com o fio até o PC
      const ch = n3(easeOut(ramp(T, ...CARTAZ.chrome)) * (1 - away))
      chrome.forEach((el) => css(el, '--in', ch))
      const sk = easeOut(ramp(T, ...CARTAZ.side)) * (1 - away)
      css(sideL, '--in', n3(sk)); css(sideR, '--in', n3(sk))
      txt(pct, `${String(Math.round(st.p * 100)).padStart(3, '0')}%`)
      // logo abaixo da palavra (em cima dela o microtexto se perde no vermelho)
      const y = (cy + wordH / 2 + 18).toFixed(1), m = st.vw * 0.03
      css(sideL, 'transform', `translate(${m.toFixed(1)}px, ${y}px)`)
      css(sideR, 'transform', `translate(calc(${(st.vw - m).toFixed(1)}px - 100%), ${y}px)`)
      css(lineL, 'width', `${Math.max(0, (st.dev.x - 24 - m - textL - 12) * sk).toFixed(1)}px`)
      css(lineR, 'width', `${Math.max(0, (st.vw - m - textR - 12 - (st.dev.x + st.dev.w + 24)) * sk).toFixed(1)}px`)
      // o adesivo no canto de cima do monitor: carimba ao passar do ponto rolando para baixo
      const size = st.dev.h * 0.24 * (pc?.sx ?? 1)
      const [sx, sy] = follow(pc, at(st, 912, 58))
      css(stk, 'width', `${size.toFixed(1)}px`)
      css(stk, 'transform', `translate(${(sx - size / 2).toFixed(1)}px, ${(sy - size / 2).toFixed(1)}px) rotate(-12deg)`)
      const on = T >= CARTAZ.stamp
      if (on !== stk.classList.contains('on')) {
        stk.classList.toggle('on', on)
        if (on && prevT !== null && prevT < CARTAZ.stamp) {
          stk.classList.remove('stamp'); void stk.offsetWidth; stk.classList.add('stamp')
          Object.assign(imp.style, { left: `${sx}px`, top: `${sy}px` })
          setTimeout(() => { imp.classList.remove('on'); void imp.offsetWidth; imp.classList.add('on') }, 220) // o tranco, quando ele bate
        } else stk.classList.remove('stamp')
      }
      prevT = T
    },
    dispose() {},
  }
}

// ========== C · mesa (3D) ==========
// Unidades: 1 = a altura da imagem do PC na tela. Origem: o centro da borda de
// baixo da imagem (a frente do teclado, onde o PC encosta na mesa); x para a
// direita, y para cima, z para a câmera. A câmera é posta, a cada quadro, para
// que a origem caia exatamente ali e 1 unidade meça a altura do PC na tela.
const MESA = {
  fov: 18, pitch: 13, // graus: abertura da câmera e o quanto ela olha de cima (o render do PC é um pouco de cima)
  screen: [-0.093, 0.644, -0.42], // o centro da tela do PC (de onde sai a luz na sala escura)
  light: 2.4, // intensidade da luz da tela, com a sala apagada (cai com o quadrado da distância)
  notes: [0.82, 0.9], // o bilhete do monitor entra
}
// A base de corte (D): grafite, grade cor de papel a cada 0,05 (as linhas fortes a
// cada 0,25), centrada no meio dela — é a mesma grade do fundo da seção de trabalhos
const MAT = { w: 2.4, d: 2.1, z0: 0.1, cell: 0.05, major: 5, color: '#1c1d1f' }
// A inclinação (D): depois da barra em 100%, LEN mais alturas de tela de scroll; a
// câmera vai de MESA.pitch a quase 90° e para em cima do meio da base de corte,
// com 1 unidade = metade da largura da tela (a base toma a tela toda)
const TRAVEL = { len: 1.6, pitch: 89.5 }
// A folha (E): uma folha A3 branca deitada na base de corte, um pouco torta, na
// frente do teclado. A inclinação termina sobre ela, perto o bastante para que a
// folha cubra a tela (e a câmera gira junto para endireitá-la): a seção de
// trabalhos, branca, é essa folha
const SHEET = { w: 0.84, d: 0.594, x: 0.04, z: 0.8, rot: 0.05 }
const PAPER = '#f4f1ea', INK = '#26231c', RED = '#FF4438'
const handFont = '"Nothing You Could Do", cursive'

// texturas desenhadas num canvas (a letra à mão espera a fonte carregar e redesenha)
function canvasTex(w, h, draw, { hand = true } = {}) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const paint = () => { draw(c.getContext('2d'), w, h); tex.needsUpdate = true }
  paint()
  if (hand) document.fonts.load(`40px ${handFont}`).then(paint, () => {})
  return tex
}
// um traço à mão (tremido) por pontos
function scribble(ctx, pts, width = 5) {
  ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = RED
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}
// nogueira escura: veios longos e ondulados em tons próximos, poros curtos
const walnutTex = () => canvasTex(2048, 1024, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#3d291d'); g.addColorStop(0.5, '#33221a'); g.addColorStop(1, '#3a2719')
  x.fillStyle = g; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 1100; i++) {
    const y0 = Math.random() * h, amp = 4 + Math.random() * 26, f = 0.0012 + Math.random() * 0.0028, ph = Math.random() * 6.28
    const dark = Math.random() < 0.62
    x.strokeStyle = dark ? `rgba(16,9,5,${(0.05 + Math.random() * 0.13).toFixed(3)})` : `rgba(150,104,68,${(0.03 + Math.random() * 0.08).toFixed(3)})`
    x.lineWidth = 0.6 + Math.random() * 2.4
    x.beginPath()
    for (let px = -24; px <= w + 24; px += 24) {
      const y = y0 + Math.sin(px * f + ph) * amp + Math.sin(px * f * 3.1 + ph * 2) * amp * 0.22
      if (px === -24) x.moveTo(px, y); else x.lineTo(px, y)
    }
    x.stroke()
  }
  for (let i = 0; i < 7000; i++) { x.fillStyle = `rgba(12,6,3,${(0.08 + Math.random() * 0.16).toFixed(3)})`; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 7, 1) }
}, { hand: false })
// a base de corte: grade cor de papel centrada, números de régua nas bordas e um
// guia de 45° vermelho no canto (fora do miolo que vira o fundo da seção)
const matTex = () => {
  const ppu = 2048 / MAT.w // px de textura por unidade
  return canvasTex(2048, Math.round(MAT.d * ppu), (x, w, h) => {
    x.fillStyle = MAT.color; x.fillRect(0, 0, w, h)
    const cell = MAT.cell * ppu, cx = w / 2, cy = h / 2
    for (let pass = 0; pass < 2; pass++) {
      x.strokeStyle = pass ? 'rgba(244,243,239,.2)' : 'rgba(244,243,239,.08)'
      x.lineWidth = pass ? 1.8 : 1.3
      const step = pass ? cell * MAT.major : cell
      for (let k = -Math.ceil(cx / step); k <= Math.ceil(cx / step); k++) { const px = cx + k * step; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke() }
      for (let k = -Math.ceil(cy / step); k <= Math.ceil(cy / step); k++) { const py = cy + k * step; x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke() }
    }
    // a margem com a numeração (a régua)
    x.fillStyle = MAT.color; x.globalAlpha = 0.86
    x.fillRect(0, 0, w, cell * 1.2); x.fillRect(0, 0, cell * 1.2, h)
    x.globalAlpha = 1
    x.fillStyle = 'rgba(244,243,239,.5)'; x.font = '500 17px "JetBrains Mono", monospace'
    for (let k = 1; k * cell < w; k++) if (k % 5 === 0) x.fillText(String(k), k * cell - 9, cell * 0.85)
    for (let k = 1; k * cell < h; k++) if (k % 5 === 0) x.fillText(String(k), 6, k * cell + 6)
    x.strokeStyle = 'rgba(244,243,239,.35)'; x.lineWidth = 2; x.strokeRect(cell * 1.2, cell * 1.2, w - cell * 2.4, h - cell * 2.4)
    // o guia de 45° no canto de baixo à esquerda
    x.strokeStyle = 'rgba(255,68,56,.75)'; x.lineWidth = 2.4
    x.beginPath(); x.moveTo(cell * 1.2, h - cell * 7); x.lineTo(cell * 7, h - cell * 1.2); x.stroke()
    x.fillStyle = 'rgba(255,68,56,.85)'; x.font = '500 15px "JetBrains Mono", monospace'; x.fillText('45°', cell * 4.4, h - cell * 4.4)
  }, { hand: false })
}
const noteTex = (bg, lines, mark) => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h)
  x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(0, 0, w, 26) // a faixa de cola
  x.fillStyle = INK; x.font = `40px ${handFont}`
  lines.forEach((t, i) => x.fillText(t, 20, 96 + i * 54))
  mark?.(x)
})
const labelTex = (text) => canvasTex(512, 320, (x, w, h) => {
  x.fillStyle = PAPER; x.fillRect(0, 0, w, h)
  x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 3
  for (let y = 120; y < h; y += 60) { x.beginPath(); x.moveTo(24, y); x.lineTo(w - 24, y); x.stroke() }
  x.fillStyle = INK; x.font = `92px ${handFont}`; x.fillText(text, 36, 160)
  scribble(x, [[40, 190], [180, 196], [330, 186], [450, 194]], 7)
})
const keyTex = () => canvasTex(256, 192, (x, w, h) => {
  x.fillStyle = '#f1eee7'; x.fillRect(0, 0, w, h)
  x.fillStyle = '#7a776f'; x.font = '500 34px "JetBrains Mono", monospace'; x.fillText('ENTER', 28, 70)
  x.strokeStyle = '#7a776f'; x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round'
  x.beginPath(); x.moveTo(200, 110); x.lineTo(200, 150); x.lineTo(130, 150); x.moveTo(150, 132); x.lineTo(130, 150); x.lineTo(150, 168); x.stroke()
}, { hand: false })

// postit: o bilhete no monitor; mat: a base de corte e a mesa funda (cobre a
// parte de baixo da tela); travel: a câmera inclina até a mesa vista de cima (D);
// sheet: a folha branca na base, onde a inclinação termina (E)
function mesa({ desk, front }, { postit = true, mat = false, travel = false, sheet = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: desk, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const scene = new THREE.Scene()
  // reflexos de estúdio (o verniz da mesa, as canecas): só com a lâmpada acesa
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  const camera = new THREE.PerspectiveCamera(MESA.fov, 1, 0.05, 40)
  const std = (color, roughness = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra })
  const add = (mesh, { shadow = true, receive = true } = {}) => { mesh.castShadow = shadow; mesh.receiveShadow = receive; return mesh }

  // luzes: a lâmpada (céu + sol + preenchimento) e a tela
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc4b3, 0)
  const sun = new THREE.DirectionalLight(0xfff2e2, 0)
  sun.position.set(-1.4, 3.4, 2.6)
  sun.castShadow = true
  Object.assign(sun.shadow.camera, { left: -2.8, right: 2.8, top: 2.8, bottom: -2.8, near: 0.5, far: 10 })
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  const fill = new THREE.DirectionalLight(0xffffff, 0)
  fill.position.set(2.6, 1.4, 1.8)
  const scr = new THREE.PointLight(0xffffff, 0, 4, 2)
  scr.position.set(...MESA.screen)
  scr.castShadow = true
  scr.shadow.mapSize.set(512, 512)
  scr.shadow.bias = -0.002
  scene.add(hemi, sun, sun.target, fill, scr)

  // a mesa: nogueira escura com verniz acetinado, borda arredondada e pés de metal preto
  const wood = walnutTex()
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping
  const back = -0.95, frontZ = mat ? 2.6 : 0.355 // com a base de corte a mesa vem até perto da câmera
  const depth = frontZ - back
  wood.repeat.set(1.6, depth / 2.2)
  const deskMat = new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.34 })
  const top = add(new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.07, depth, 4, 0.02), deskMat), { shadow: false })
  top.position.set(0, -0.035, (back + frontZ) / 2)
  scene.add(top)
  const legMat = std(0x161616, 0.4, { metalness: 0.7 })
  for (const x of [-1.82, 1.82]) for (const z of [frontZ - 0.07, back + 0.07]) {
    const leg = add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 2.6, 0.045), legMat), { receive: false })
    leg.position.set(x, -1.37, z)
    scene.add(leg)
  }
  if (mat) {
    // fosca (Lambert: sem o reflexo do ambiente): com a lâmpada acesa a luz direta
    // soma ~1, então renderizada a base fica no mesmo grafite da grade em CSS que a
    // substitui no fim da inclinação
    const m = new THREE.Mesh(new THREE.PlaneGeometry(MAT.w, MAT.d), new THREE.MeshLambertMaterial({ map: matTex() }))
    m.rotation.x = -Math.PI / 2
    m.position.set(0, 0.0012, MAT.z0 + MAT.d / 2)
    m.receiveShadow = true
    scene.add(m)
  }
  if (sheet) {
    // fosca; a cor passa um pouco de 1 e puxa para o azul para anular o sol quente da
    // lâmpada: renderizada fica no mesmo branco da seção de trabalhos
    const paper = new THREE.Color().setRGB(1.04, 1.12, 1.22, THREE.LinearSRGBColorSpace)
    const s = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.w, SHEET.d), new THREE.MeshLambertMaterial({ color: paper }))
    s.rotation.set(-Math.PI / 2, 0, SHEET.rot)
    s.position.set(SHEET.x, 0.0018, SHEET.z)
    s.receiveShadow = true
    scene.add(s)
  }

  // disquetes (os trabalhos estão no disco): uma pilha, o de cima com etiqueta
  const metal = std(0xb9bcc1, 0.3, { metalness: 0.85 })
  const floppy = (color, label = null) => {
    const g = new THREE.Group()
    g.add(add(new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.0075, 0.21, 2, 0.003), std(color, 0.38))))
    const shutter = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.0082, 0.072), metal))
    shutter.position.set(0.012, 0, 0.066)
    g.add(shutter)
    if (label) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.094), std(0xffffff, 0.85, { map: label }))
      l.rotation.x = -Math.PI / 2
      l.position.set(0, 0.0039, -0.048)
      l.receiveShadow = true
      g.add(l)
    }
    return g
  }
  const stack = new THREE.Group()
  ;[[0x2a2a2a, 0.1], [0xe8e2d6, -0.08], [0x141414, 0.05], [0xd8432f, -0.12, labelTex('trabalhos')]].forEach(([c, r, lab], i) => {
    const f = floppy(c, lab)
    f.position.set(Math.sin(i * 2.3) * 0.012, 0.00375 + i * 0.0078, Math.cos(i * 1.7) * 0.01)
    f.rotation.y = r
    stack.add(f)
  })
  stack.position.set(-0.93, 0, -0.26)
  stack.rotation.y = 0.16
  scene.add(stack)

  // as duas canecas (2 pessoas + café): uma branca, uma vermelha
  const mug = (color) => {
    const g = new THREE.Group()
    const prof = [[0, 0], [0.068, 0], [0.077, 0.006], [0.08, 0.022], [0.08, 0.2], [0.072, 0.2], [0.072, 0.014], [0, 0.014]].map(([x, y]) => new THREE.Vector2(x, y))
    const mt = std(color, 0.22)
    g.add(add(new THREE.Mesh(new THREE.LatheGeometry(prof, 56), mt)))
    const handle = add(new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.011, 12, 28, Math.PI), mt))
    handle.rotation.z = -Math.PI / 2
    handle.position.set(0.077, 0.108, 0)
    g.add(handle)
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0725, 40), std(0x2a160b, 0.1))
    coffee.rotation.x = -Math.PI / 2
    coffee.position.y = 0.172
    g.add(coffee)
    return g
  }
  const mugW = mug(0xf3f0ea), mugR = mug(0xff4438)
  mugW.position.set(1.12, 0, -0.1); mugW.rotation.y = -2.4
  mugR.position.set(0.9, 0, -0.34); mugR.rotation.y = -0.6
  scene.add(mugW, mugR)

  // bilhetes na mesa
  const note = (tex, x, z, r) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), std(0xffffff, 0.9, { map: tex }))
    m.rotation.set(-Math.PI / 2, 0, r)
    m.position.set(x, 0.0024, z)
    m.receiveShadow = true
    scene.add(m)
  }
  note(noteTex('#f6eda8', ['2 pessoas', '+ café'], (x) => scribble(x, [[150, 214], [196, 186], [232, 140], [216, 150], [232, 140], [240, 160]], 6)), 1.02, 0.17, 0.18)
  note(noteTex(PAPER, ['cada linha', 'foi escrita', 'aqui'], (x) => scribble(x, [[120, 236], [170, 228], [222, 206], [208, 214], [222, 206], [218, 224]], 6)), -0.88, 0.13, -0.22)

  // a tecla ENTER (a da seção 6), solta na mesa
  const cap = add(new THREE.Mesh(new RoundedBoxGeometry(0.118, 0.056, 0.09, 3, 0.012), std(0xf1eee7, 0.5)))
  const capTop = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.068), std(0xffffff, 0.5, { map: keyTex() }))
  capTop.rotation.x = -Math.PI / 2
  capTop.position.y = 0.0285
  const key = new THREE.Group()
  key.add(cap, capTop)
  key.position.set(0.66, 0.029, 0.2)
  key.rotation.y = 0.42
  scene.add(key)

  // o lápis, atravessado na frente do teclado
  const pencil = new THREE.Group()
  const part = (geo, mt, x) => { const m = add(new THREE.Mesh(geo, mt)); m.rotation.z = Math.PI / 2; m.position.x = x; pencil.add(m); return m }
  part(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 6), std(0x1d1d1d, 0.45), 0)
  part(new THREE.ConeGeometry(0.013, 0.05, 6), std(0xe2c79c, 0.8), 0.195).rotation.z = -Math.PI / 2
  part(new THREE.ConeGeometry(0.0045, 0.016, 8), std(0x2e2e2e, 0.4), 0.226).rotation.z = -Math.PI / 2
  part(new THREE.CylinderGeometry(0.0138, 0.0138, 0.026, 14), metal, -0.183)
  part(new THREE.CylinderGeometry(0.0128, 0.0128, 0.022, 14), std(0xff4438, 0.7), -0.207)
  pencil.position.set(-0.34, 0.0145, 0.24)
  pencil.rotation.y = -0.38
  scene.add(pencil)

  // o bilhete no monitor (DOM, colado na imagem do PC): uma lista de tarefas
  let post = null, check = null
  if (postit) {
    front.insertAdjacentHTML('beforeend', `<div class="em-note">
      <p><i><svg viewBox="0 0 24 24"><path pathLength="1" style="stroke-dashoffset:0" d="M3 13l6 6L22 3"/></svg></i><s>manifesto</s></p>
      <p><i><svg viewBox="0 0 24 24"><path pathLength="1" d="M3 13l6 6L22 3"/></svg></i>trabalhos</p></div>`)
    post = front.querySelector('.em-note')
    check = post.querySelectorAll('path')[1]
  }

  // os materiais com reflexo: a intensidade segue a lâmpada (no escuro, só a tela ilumina)
  const mats = []
  scene.traverse((o) => [].concat(o.material ?? []).forEach((m) => { if (m.isMeshStandardMaterial && !mats.includes(m)) mats.push(m) }))
  let envLamp = -1

  let w = 0, h = 0, last = ''
  const glowColor = new THREE.Color()
  const v = new THREE.Vector3()
  const proj = (x, y, z) => { v.set(x, y, z).project(camera); return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] }
  // a câmera em e (0 = de frente, a origem na base do PC; 1 = de cima, no meio da
  // base de corte — ou, com a folha, sobre ela e perto o bastante para que ela cubra a tela)
  const place = (st, e) => {
    const fov = (MESA.fov * Math.PI) / 180, t = Math.tan(fov / 2)
    const D0 = h / (2 * t * st.dev.h) // 1 unidade = altura do PC
    const D1 = sheet ? (Math.min(SHEET.d, (SHEET.w * h) / w) * 0.94) / (2 * t) : h / (t * w) // a folha cobre a tela | 1 unidade = metade da largura
    const pitch = (lerp(MESA.pitch, TRAVEL.pitch, e) * Math.PI) / 180, D = lerp(D0, D1, e)
    const tx = lerp(0, sheet ? SHEET.x : 0, e), tz = lerp(0, sheet ? SHEET.z : MAT.z0 + MAT.d / 2, e)
    camera.position.set(tx, D * Math.sin(pitch), tz + D * Math.cos(pitch))
    camera.lookAt(tx, 0, tz)
    if (sheet) camera.rotateZ(SHEET.rot * easeInOut(ramp(e, 0.55, 1))) // endireita a folha no fim (o PC já saiu de quadro)
    camera.near = D * 0.05; camera.far = D * 8
    const ox = st.dev.x + st.dev.w / 2, oy = st.dev.y + st.dev.h
    camera.aspect = w / h
    camera.setViewOffset(w, h, lerp(w / 2 - ox, 0, e), lerp(h / 2 - oy, 0, e), w, h)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }

  return {
    resize(vw, vh) { w = vw; h = vh; renderer.setSize(vw, vh, false); last = '' },
    frame(st) {
      if (post) {
        // o bilhete: colado na borda direita do monitor, metade para fora (não cobre a tela);
        // "trabalhos" é marcado quando a barra chega a 100%
        const [px, py] = at(st, 900, 150)
        const s = st.dev.h / 560
        css(post, '--in', n3(easeOut(ramp(st.T, ...MESA.notes))))
        css(post, 'transform', `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(7deg) scale(${s.toFixed(3)})`)
        css(post, 'transformOrigin', '0 0')
        css(check, 'strokeDashoffset', n3(1 - easeInOut(ramp(st.p, 0.94, 1))))
      }

      if (!w || st.T < 0.38) return null // antes do zoom a mesa está fora de quadro
      const e = travel ? easeInOut(st.T2 ?? 0) : 0
      // o PC (imagem) acompanha a mesa enquanto a câmera inclina: a base dele fica
      // presa ao mesmo ponto da mesa, e ele encolhe como a câmera o veria
      let pc = null
      if (e > 0) {
        place(st, 0)
        const O0 = proj(0, 0, 0), U0 = proj(0, 1, 0), L0 = proj(-0.5, 0, 0), R0 = proj(0.5, 0, 0), W0 = proj(0, 0.5, -1.6)
        place(st, e)
        const O = proj(0, 0, 0), U = proj(0, 1, 0), L = proj(-0.5, 0, 0), R = proj(0.5, 0, 0), Wp = proj(0, 0.5, -1.6)
        pc = {
          e: st.T2, ax: O0[0], ay: O0[1], dx: O[0] - O0[0], dy: O[1] - O0[1],
          sx: (R[0] - L[0]) / (R0[0] - L0[0]), sy: (O[1] - U[1]) / (O0[1] - U0[1]), wallDy: Wp[1] - W0[1],
        }
      } else place(st, 0)

      const sig = `${st.T.toFixed(4)}|${e.toFixed(4)}|${st.lamp}|${st.glow.toFixed(3)}|${st.dev.x.toFixed(1)}|${st.dev.y.toFixed(1)}|${st.dev.h.toFixed(1)}|${st.gc}`
      if (sig === last) return pc
      last = sig
      // a luz: a tela sozinha na sala escura; a lâmpada acende o resto (e os reflexos)
      const Lm = st.lamp
      hemi.intensity = 0.04 + 0.95 * Lm
      sun.intensity = 2.6 * Lm
      fill.intensity = 0.5 * Lm
      scr.intensity = MESA.light * st.glow
      glowColor.setRGB(st.gc[0] / 255, st.gc[1] / 255, st.gc[2] / 255, THREE.SRGBColorSpace)
      scr.color.copy(glowColor)
      if (envLamp !== Lm) { envLamp = Lm; mats.forEach((m) => { m.envMapIntensity = 0.06 + 0.7 * Lm }) }
      renderer.render(scene, camera)
      return pc
    },
    dispose() {
      // o canvas fica (o painel pode voltar para a mesa): só os recursos vão embora
      scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material ?? []).forEach((m) => { m.map?.dispose(); m.dispose() }) })
      envTex.dispose()
      pmrem.dispose()
      renderer.clear()
      renderer.dispose()
    },
  }
}

// ========== D · cartaz + mesa ==========
// O cartaz (sem "manifesto · 2026") com a mesa funda e a base de corte; depois, a
// câmera inclina e a base de corte vira o fundo da seção de trabalhos.
// E (sheet): igual, mas a inclinação termina na folha branca e a seção de trabalhos é branca.
function cartazMesa(layers, { sheet = false } = {}) {
  const m = mesa(layers, { postit: false, mat: true, travel: true, sheet })
  const c = cartaz(layers, { right: false })
  // no fim da inclinação a base de corte 3D dá lugar à mesma grade em CSS, fixa na
  // tela — a mesma do fundo da seção de trabalhos, então a troca não aparece
  const matLayer = Object.assign(document.createElement('div'), { className: sheet ? 'ecm-sheet' : 'ecm-mat' })
  layers.front.prepend(matLayer)
  // a seção de trabalhos continua na base de corte; os cards caem nela quando entram
  const work = layers.work
  const on = sheet ? 'on-sheet' : 'on-mat'
  work.classList.add(on)
  const cards = [...work.querySelectorAll('.card')]
  cards.forEach((el, i) => el.style.setProperty('--r', `${[-2.2, 1.6, -1.1, 2.4, -1.8, 1.2][i % 6]}deg`))
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) en.target.classList.add('in') }), { threshold: 0.25 })
  cards.forEach((el) => io.observe(el))
  return {
    extra: TRAVEL.len,
    resize(vw, vh) { m.resize(vw, vh); c.resize(vw, vh) },
    frame(st) {
      const pc = m.frame(st)
      c.frame({ ...st, pc })
      css(matLayer, 'opacity', n3(ramp(st.T2 ?? 0, 0.86, 1)))
      return pc
    },
    dispose() {
      io.disconnect()
      cards.forEach((el) => { el.classList.remove('in'); el.style.removeProperty('--r') })
      work.classList.remove(on)
      m.dispose()
      c.dispose()
    },
  }
}
