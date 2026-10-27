// LAB — seção 6, v11: a v10 refinada. "foi escrita" é digitada pelo scroll; a tecla ENTER
// fica dentro do texto (uma "letra" a mais) e leva um clique só, com o impacto do PC da
// seção 2; o cursor faz de verdade cada gesto: clica a tecla, pega e arrasta a linha,
// risca com a ponta da caneta, puxa a alça da caixa, clica em "apresentar" e some aos poucos.
// v10: a v9 com o conceito ler × vivenciar — "ler" é a tela (tecla, cursor, caixas);
// "vivenciar" é a mão (rabiscos finos de caneta, fotos reais, papel). Fotos em retângulo:
// entram em dither e assentam em cor. Stop-motion de 2 poses (~0,5 s, em degrau, fora de
// fase) nas etiquetas, caixas, rabiscos e na tecla parada. Fotos: v11/img/linha.jpg
// (caneca, provisória), nosso.jpg (mão tatuada com café).
import { mountLab, ramp, easeInOut, lerp, clamp01, esc, REDUCE, FINE } from '../base.js'
import { mountTextGL, mountGridGL, canvasFont, placeholderImage } from './gl.js'
import linhaImg from './img/linha.jpg'
import nossoImg from './img/nosso.jpg'
// tecla ENTER: render do Blender (lab/secao6/keycap/keycap.blend), 3 poses
import keyIdle from './img/enter-idle.webp'
import keyPose2 from './img/enter-pose2.webp'
import keyPressed from './img/enter-pressed.webp'

// imagens entre as palavras (sem src = placeholder abstrato)
const IMG = {
  line: { src: linhaImg, seed: 1 },
  ours: { src: nossoImg, seed: 4 },
}
const KEYCAP = {} // a tecla ENTER no fim de "foi escrita"
const LINES = [
  { parts: ['Cada ', IMG.line, ' linha'] },
  { parts: ['foi escrita ', KEYCAP], kind: 'type' },
  { parts: ['e posicionada'], kind: 'move' },
  { parts: ['exatamente assim.'], kind: 'mark' },
  { parts: ['Você não está'] },
  { parts: ['lendo'], kind: 'strike' },
  { parts: ['sobre o ', IMG.ours, ' nosso'], kind: 'ours' },
  { parts: ['trabalho.'], kind: 'wide' },
  { parts: ['Você está'], kind: 'stair' },
  { parts: ['vivenciando.'], kind: 'grow' },
]
const SENTENCE = 'Cada linha foi escrita e posicionada exatamente assim. Você não está lendo sobre o nosso trabalho. Você está vivenciando.'
const IN = [0, 0.2, 0.56, 1.18, 1.5, 1.66, 2.16, 2.3, 2.46, 2.62]
const ENTER = 0.24 // quanto scroll a linha leva para assentar
const P = {
  type: [0.2, 0.44], key: 0.52, // a digitação acompanha o scroll; o clique na tecla
  move: { show: [0.56, 0.66], grab: 0.72, drop: [0.75, 1.08], boxOut: [1.1, 1.18] },
  mark: [1.22, 1.4], tag: 1.38, circle: [1.38, 1.52],
  ours: 2.34,
  strike: { draw: [1.8, 2.0], hollow: [1.94, 2.08] },
  grow: { box: [2.7, 2.78], drag: [2.84, 3.14] },
  marker: [3.18, 3.28],
  hand: { arrow: [3.29, 3.36], tag: 3.36 },
  present: { press: [3.42, 3.48], ui: [3.46, 3.64], fit: [3.5, 3.88] },
}
const LENGTH = 4.0
const FOCUS = 0.56
const PAN = 0.26
const MOVE_FROM = { x: 0.24, y: 0.6, rot: 5 }
const PAD = { x: 0.4, y: 1.15 } // folga do quad em volta do texto (em), para curva, rastro e onda
// entrada: as letras sobem de trás da máscara, uma depois da outra, ondulando como na
// água e deixando rastro vermelho (stagger: quanto a última letra espera; rise e trail
// em alturas da linha)
const FX = { bend: 1.0, stagger: 0.6, rise: 1.05, wave: 0.06, blur: 14, trail: 0.8, rgb: 7, grain: 0.12 }
const SPEED = { bend: 0.45, rgb: 5, motion: 1.4 }
const DEFOCUS = { blur: 0.6, dim: 0.18 } // linhas anteriores à da vez (bem leve)
const TAU = { line: 0.16, cam: 0.11, cur: 0.07, focus: 0.25 } // inércias (s)
const BALL = { r: 46, strength: 1 }
// ritmo da digitação (ms de roteiro, esticados sobre P.type): intervalo base + variação,
// pausa depois de espaço, respiro antes da tecla
const TYPE = { first: 140, base: 72, jitter: 58, space: 120, image: 240 }
// onda de choque do "apresentar" (tempo real): velocidade (px/s), força inicial (px) e quanto dura (s)
const SHOCK = { speed: 1500, amp: 28, life: 1.4 }
const FIT = 0.74 // o cartaz final ocupa esta fração da altura
// fotos: o dither segura um pouco e se desfaz em cor, célula a célula, em 8 degraus
// (12,5 qps, o ritmo dos pontos da grade)
const DITHER = { hold: 0.45, dur: 0.64, steps: 8 }
const POSE = 500 // ms por pose do stop-motion
// cliques (tempo real, como o esbarrão no PC da seção 2): quanto a tecla fica afundada (s),
// o recuo do cursor (px) e o giro dele (graus)
const HIT = { pressed: 0.16, bump: 7, spin: 14 }
const FADE = { hold: 0.45, dur: 1.4 } // depois do "apresentar", o cursor some aos poucos (s)

// rabiscos à mão (viewBox 100 × 100): cada passada é um traço com o próprio tremor;
// duas poses = duas sementes, para o stop-motion. [desenho, passadas, tremor]
const SCRIBBLE = {
  // risco de "lendo": vai, volta e vai de novo, cada passada numa altura
  strike: [(k) => (t) => [lerp(2, 98, k % 2 ? 1 - t : t), [42, 62, 50][k] - t * [6, -4, 8][k]], 3, 4],
  // círculo de "exatamente": passa do ponto de partida e não fecha igual
  circle: [(k) => (t) => { const a = -2.7 + t * Math.PI * 2 * [1.1, 0.92][k]; const r = [1, 1.05][k]; return [50 + Math.cos(a) * 49 * r, 52 + Math.sin(a) * 45 * r] }, 2, 2.2],
  // sublinhado de "vivenciando.": vai e volta mais baixo
  under: [(k) => (t) => (k ? [lerp(97, 8, t), 78 - t * 10] : [lerp(0, 100, t), 30 + Math.sin(t * Math.PI) * 12]), 2, 5],
  // seta da etiqueta "feito à mão" até o sublinhado: haste curva + duas farpas
  arrow: [(k) => (t) => (k === 0 ? [lerp(92, 14, t) + Math.sin(t * Math.PI) * 18, lerp(94, 10, t) + Math.sin(t * Math.PI) * 14]
    : k === 1 ? [lerp(14, 40, t), lerp(10, 14, t)] : [lerp(14, 20, t), lerp(10, 38, t)]), 3, 1.6],
}
// o traço em px do próprio svg (w × h); o tremor em px (amp)
function scribblePath(fn, seed, amp, w, h) {
  let s = seed
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280
  const ph = [r(), r(), r(), r()].map((v) => v * 6.283)
  const pts = Array.from({ length: 29 }, (_, i) => {
    const t = i / 28
    const [x, y] = fn(t)
    return [(x * w) / 100 + amp * 0.3 * Math.sin(t * 13 + ph[0]), (y * h) / 100 + amp * (0.6 * Math.sin(t * 9 + ph[1]) + 0.4 * Math.sin(t * 23 + ph[2]))]
  })
  // curva suave pelos pontos médios
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i++) d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1)} ${((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1)}`
  return `${d} L${pts.at(-1)[0].toFixed(1)} ${pts.at(-1)[1].toFixed(1)}`
}
const scribbleSvg = (kind) => `<svg class="scr scr--${kind}" data-kind="${kind}" data-n="${SCRIBBLE[kind][1]}" data-pose="0" aria-hidden="true"></svg>`
// (re)desenha as passadas no tamanho atual do svg; tremor em centésimos do corpo da linha
function buildScribble(svg, fs) {
  const [make, n, amp] = SCRIBBLE[svg.dataset.kind]
  const w = svg.clientWidth
  const h = svg.clientHeight
  const pose = (p) => `<g class="p${p}">${Array.from({ length: n }, (_, k) => `<path pathLength="1" data-k="${k}" d="${scribblePath(make(k), 11 + k * 7 + p * 101, (amp * fs) / 100, w, h)}"/>`).join('')}</g>`
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.innerHTML = pose(0) + pose(1)
}

const HANDLES = '<i></i>'.repeat(6)
const unitHtml = (part) => (typeof part === 'string'
  ? [...part].map((c) => `<span class="lt">${esc(c)}</span>`).join('')
  : part === KEYCAP
    ? `<span class="lt kc" data-s="idle"><img class="k-idle" src="${keyIdle}" alt=""><img class="k-pose2" src="${keyPose2}" alt=""><img class="k-pressed" src="${keyPressed}" alt=""></span>`
    : `<span class="lt im" data-img="${Object.values(IMG).indexOf(part)}"></span>`)
const T_CLS = { mark: 'mark', strike: 'hollow-w', grow: 'it' }
const LN_CLS = { grow: 'ln--grow', wide: 'ln--wide', stair: 'ln--stair' }
const lineHtml = ({ parts, kind }) => `<p class="ln ${LN_CLS[kind] ?? ''}"><span class="t ${T_CLS[kind] ?? ''}">${parts.map(unitHtml).join('')}</span></p>`
const FG = {
  type: '<span class="caret"></span>',
  move: `<span class="box">${HANDLES}</span><span class="snap">← 0 px</span>`,
  mark: `${scribbleSvg('circle')}<span class="tag tag-xy"></span>`,
  strike: scribbleSvg('strike'),
  ours: '<span class="tag tag--paper tag-ours">2 pessoas + café</span>',
  grow: `<span class="box">${HANDLES}</span><span class="tag tag-scale"></span>${scribbleSvg('under')}${scribbleSvg('arrow')}<span class="tag tag--paper tag-hand">feito à mão</span>`,
}
const ICONS = '<svg class="c-arrow" viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.3 3.2 6.8 2.6-1.2-3.2-6.7H14Z"/></svg>'
  + '<svg class="c-move" viewBox="0 0 14 14"><path d="M7 0v14M0 7h14M7 0 5 2M7 0l2 2M7 14l-2-2M7 14l2-2M0 7l2-2M0 7l2 2M14 7l-2-2M14 7l-2 2"/></svg>'
  + '<svg class="c-text" viewBox="0 0 10 22"><path d="M1 1h8M1 21h8M5 1v20"/></svg>'
  + '<svg class="c-resize" viewBox="0 0 16 22"><path d="M2 2h6L6 4l8 8 2-2v6h-6l2-2-8-8-2 2Z"/></svg>'
  + '<svg class="c-brush" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/><circle class="dot" cx="10" cy="10" r="2"/></svg>'
// painel de ferramentas (só as que a cena usa)
const TOOLS = [
  ['arrow', '<path d="M4 2v12l3-3 2.2 4.6 1.8-.9L8.8 10H13Z" class="fill"/>'],
  ['move', '<path d="M9 1v16M1 9h16M9 1 7 3M9 1l2 2M9 17l-2-2M9 17l2-2M1 9l2-2M1 9l2 2M17 9l-2-2M17 9l-2 2"/>'],
  ['text', '<path d="M3 3h12M9 3v12M6 15h6"/>'],
  ['brush', '<path d="M12.5 2.5 15.5 5.5 6 15H3v-3Z M10.5 4.5l3 3"/>'], // lápis: os rabiscos à mão
  ['resize', '<path d="M3 3h5M3 3v5M3 3l12 12M15 15h-5M15 15v-5"/>'],
]

mountLab({
  title: 'LAB — Seção 6 · v11',
  links: [['../v9/', 'v9'], ['../v10/', 'v10'], ['./', 'v11', true]],
  scene(host) {
    host.innerHTML = `
      <h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${esc(SENTENCE)}</h2>
      <div class="ed is-center is-upper" aria-hidden="true">
        <canvas class="grid-gl"></canvas><div class="ed-grid"></div>
        <div class="chrome"><div class="guide"></div></div>
        <div class="art-clip">
          <div class="art">${LINES.map(lineHtml).join('')}</div>
          <canvas class="gl"></canvas>
          <div class="art fg">${LINES.map(({ kind }) => `<div class="fgl">${FG[kind] ?? ''}</div>`).join('')}</div>
        </div>
        <div class="chrome">
          <div class="bar"><span class="sp"></span>
            <span class="present"><svg viewBox="0 0 8 9"><path d="M0 0 8 4.5 0 9Z"/></svg>apresentar</span></div>
          <div class="tools">${TOOLS.map(([name, svg]) => `<i data-tool="${name}"><svg viewBox="0 0 18 18">${svg}</svg></i>`).join('')}</div>
        </div>
        <div class="impact"><svg viewBox="-50 -50 100 100">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('')}</svg></div>
        <div class="cur" data-m="arrow">${ICONS}</div>
        <div class="ball"></div>
      </div>`

    const q = (s) => host.querySelector(s)
    const ed = q('.ed')
    const art = q('.art')
    const fg = q('.fg')
    const guide = q('.guide')
    const lns = [...art.querySelectorAll('.ln')]
    const ts = lns.map((l) => l.querySelector('.t'))
    const fgls = [...fg.querySelectorAll('.fgl')]
    const at = (kind) => LINES.findIndex((l) => l.kind === kind)
    const iType = at('type'), iMove = at('move'), iMark = at('mark'), iStrike = at('strike'), iGrow = at('grow')
    const caret = fgls[iType].querySelector('.caret')
    const moveBox = fgls[iMove].querySelector('.box')
    const snap = fgls[iMove].querySelector('.snap')
    const tagXY = q('.tag-xy')
    const growBox = fgls[iGrow].querySelector('.box')
    const tagScale = q('.tag-scale')
    const fgOf = (kind, s) => fgls[at(kind)].querySelector(s)
    const scr = { circle: fgOf('mark', '.scr'), strike: fgOf('strike', '.scr'), under: fgOf('grow', '.scr--under'), arrow: fgOf('grow', '.scr--arrow') }
    const tagOurs = q('.tag-ours')
    const tagHand = q('.tag-hand')
    const key = q('.kc')
    const impact = q('.impact')
    const growHandle = growBox.querySelector('i:nth-child(6)')
    // stop-motion: cada peça com a sua fase (fora de fase entre si)
    const POSED = [[tagXY, 0], [tagScale, 0.5], [tagOurs, 0.25], [tagHand, 0.75], [moveBox, 0.4], [growBox, 0.9],
      [scr.circle, 0.15], [scr.strike, 0.6], [scr.under, 0.35], [scr.arrow, 0.85]]
    const present = q('.present')
    const cur = q('.cur')
    const ball = q('.ball')
    const tools = Object.fromEntries([...host.querySelectorAll('.tools [data-tool]')].map((el) => [el.dataset.tool, el]))
    const typeUnits = [...ts[iType].querySelectorAll('.lt')]

    const gl = mountTextGL(q('.gl'))
    ed.classList.toggle('gl-on', !!gl)
    const grid = mountGridGL(q('.grid-gl')) // sem WebGL, a grade em CSS (.ed-grid) assume
    ed.classList.toggle('grid-on', !!grid)
    const glLines = gl ? LINES.map(() => gl.addLine()) : []
    const st = LINES.map(() => ({ e: 0, foc: 0 })) // estado com inércia de cada linha

    // imagens: placeholder até a foto carregar (aí a linha é redesenhada)
    const imgSlots = Object.values(IMG).map((slot) => {
      const s = { src: placeholderImage(slot.seed), lines: [] }
      if (slot.src) {
        const img = new Image()
        img.onload = () => { s.src = img; s.lines.forEach((i) => drawLine(i)) }
        img.src = slot.src
      }
      return s
    })
    lns.forEach((ln, i) => ln.querySelectorAll('.im').forEach((el) => imgSlots[+el.dataset.img].lines.push(i)))

    // digitação: o roteiro de cada tecla, com ritmo humano (fixo: semente), esticado sobre P.type
    let seed = 7
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
    let acc = TYPE.first
    const typeAt = typeUnits.map((el, i) => {
      if (i > 0) acc += TYPE.base + rnd() * TYPE.jitter + (typeUnits[i - 1].textContent === ' ' ? TYPE.space : 0) + (el === key ? TYPE.image : 0)
      return acc
    })
    // cliques (tempo real): disparam ao passar do ponto no scroll; subir rearma
    const HITS = { key: P.key, grab: P.move.grab, present: P.present.press[0] }
    const hitT0 = { key: null, grab: null, present: null }
    let lastHit = null
    // fotos: instante em que cada linha mostrou a sua (o dither se desfaz a partir dele)
    const imgT0 = LINES.map(() => null)
    const hasImg = LINES.map(({ parts }) => parts.some((pt) => typeof pt !== 'string'))

    // rabisco desenhado até u (0..1): as passadas, uma depois da outra
    const drawn = new Map()
    const drawScribble = (svg, u) => {
      if (drawn.get(svg) === u) return
      drawn.set(svg, u)
      const n = +svg.dataset.n
      svg.querySelectorAll('path').forEach((pth) => { pth.style.strokeDashoffset = 1 - clamp01(u * n - pth.dataset.k) })
    }
    const setPose = (el, pose) => { if (el.dataset.pose !== String(pose)) el.dataset.pose = pose }

    let vw = 0
    let vh = 0
    let W = 0
    let ax0 = 0
    let gsMax = 1
    let fsBase = []
    let view = null
    let curPos = null
    let moveOff = { x: 0, y: 0, rot: 0 }
    let lastNow = 0
    let lastAy = 0
    let speed = 0
    let toolOn = ''

    const fsOf = (i, gs = 1) => fsBase[i] * (i === iGrow ? gs : 1)
    const placeFg = (i) => {
      const t = ts[i]
      const fsz = getComputedStyle(lns[i]).fontSize
      Object.assign(fgls[i].style, {
        left: `${lns[i].offsetLeft + t.offsetLeft}px`, top: `${lns[i].offsetTop + t.offsetTop}px`,
        width: `${t.offsetWidth}px`, height: `${t.offsetHeight}px`, fontSize: fsz,
      })
      fgls[i].style.setProperty('--lfs', fsz)
    }
    // a textura de uma linha: cada letra e cada cápsula no x/y que o DOM mediu
    function drawLine(i) {
      if (!gl) return
      const t = ts[i]
      const units = [...t.querySelectorAll('.lt:not(.im):not(.kc)')]
      const cs = getComputedStyle(units[0])
      const upper = cs.textTransform === 'uppercase'
      const fs = parseFloat(cs.fontSize)
      glLines[i].draw({
        width: t.offsetWidth, height: t.offsetHeight,
        font: canvasFont(cs).font,
        glyphs: units.map((el) => ({ ch: upper ? el.textContent.toUpperCase() : el.textContent, x: el.offsetLeft, top: el.offsetTop, h: el.offsetHeight })),
        images: [...t.querySelectorAll('.im')].map((el) => ({ x: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, src: imgSlots[+el.dataset.img].src })),
        pad: { x: PAD.x * fs, y: PAD.y * fs },
        res: Math.min(2, devicePixelRatio || 1),
      })
    }

    function measure(size) {
      ({ vw, vh } = size)
      const fs = Math.max(40, Math.min(vw * 0.06, vh * 0.1, 116))
      ed.style.setProperty('--fs', `${fs}px`)
      lns[iGrow].style.setProperty('--gs', 1)
      W = vw * 0.62
      ax0 = (vw - W) / 2
      art.style.width = fg.style.width = `${W}px`
      fsBase = lns.map((l) => parseFloat(getComputedStyle(l).fontSize))
      gsMax = Math.min(2.6, (W * 0.98) / ts[iGrow].offsetWidth)
      // a guia marca onde "e posicionada" encaixa
      guide.style.left = `${ax0 + W / 2}px`
      snap.style.left = '-64px'
      snap.style.top = '.38em'
      tagXY.style.left = `${ts[iMark].offsetWidth + 18}px`
      tagXY.style.top = '.2em'
      tagScale.style.left = '0px'
      tagScale.style.top = 'calc(100% + 14px)'
      tagXY.textContent = `x ${Math.round(lns[iMark].offsetLeft + ts[iMark].offsetLeft)} · y ${Math.round(lns[iMark].offsetTop + ts[iMark].offsetTop)}`
      // o círculo à mão abraça só "exatamente" (as 10 primeiras letras)
      const ex = [...ts[iMark].querySelectorAll('.lt')].slice(0, 10)
      const exL = ex[0].offsetLeft
      const exR = ex.at(-1).offsetLeft + ex.at(-1).offsetWidth
      const exPad = (exR - exL) * 0.07
      Object.assign(scr.circle.style, { left: `${exL - exPad}px`, width: `${exR - exL + exPad * 2}px` })
      // "2 pessoas + café" colada no canto de cima da foto
      const ours = ts[at('ours')].querySelector('.im')
      Object.assign(tagOurs.style, { left: `${ours.offsetLeft + ours.offsetWidth * 0.55}px`, top: `${ours.offsetTop - 26}px` })
      lns.forEach((_, i) => { if (i !== iGrow) { placeFg(i); drawLine(i) } })
      buildScribble(scr.circle, fsBase[iMark])
      buildScribble(scr.strike, fsBase[iStrike])
      // "vivenciando." é desenhada já no tamanho final (o quad só escala); os rabiscos dela também
      lns[iGrow].style.setProperty('--gs', gsMax)
      drawLine(iGrow)
      placeFg(iGrow)
      buildScribble(scr.under, fsOf(iGrow, gsMax))
      buildScribble(scr.arrow, fsOf(iGrow, gsMax))
      drawn.clear()
      lns[iGrow].style.setProperty('--gs', 1)
      placeFg(iGrow)
      gl?.resize(vw, vh)
      grid?.resize(vw, vh)
      view = null
    }

    // bola que inverte a cor (cursor de quem visita)
    let mouse = null
    let inside = false
    let ballA = 0
    if (FINE) {
      ed.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return
        const r = ed.getBoundingClientRect()
        mouse = [e.clientX - r.left, e.clientY - r.top]
        inside = true
        ball.style.transform = `translate3d(${mouse[0]}px, ${mouse[1]}px, 0)`
      })
      ed.addEventListener('pointerleave', () => { inside = false })
    }

    const tBox = (i) => {
      const x = lns[i].offsetLeft + ts[i].offsetLeft + (i === iMove ? moveOff.x : 0)
      const y = lns[i].offsetTop + ts[i].offsetTop + (i === iMove ? moveOff.y : 0)
      return { x, y, w: ts[i].offsetWidth, h: ts[i].offsetHeight }
    }
    const toScene = (x, y) => [view.ax + x * view.s, view.ay + y * view.s]
    const focusY = (i) => { const b = tBox(i); return b.y + b.h / 2 }
    // pontos do trajeto do cursor do editor (frações da caixa de cada linha)
    const caretPt = () => { const b = tBox(iType); return toScene(b.x + caret.offsetLeft + 3, b.y + caret.offsetTop + caret.offsetHeight * 0.5) }
    const movePt = () => { const b = tBox(iMove); return toScene(b.x + b.w * 0.42, b.y + b.h * 0.55) }
    // um ponto (frações) de um elemento da tela, em px do editor
    const elAt = (el, fx_ = 0.5, fy_ = 0.5) => {
      const r = el.getBoundingClientRect()
      const e = ed.getBoundingClientRect()
      return [r.left - e.left + r.width * fx_, r.top - e.top + r.height * fy_]
    }
    const presentAt = (fx_ = 0.55, fy_ = 0.6) => elAt(present, fx_, fy_)
    // a ponta da caneta: onde o rabisco está sendo desenhado agora (u = o quanto já foi)
    const penAt = (svg, u = drawn.get(svg) ?? 0) => {
      const n = +svg.dataset.n
      const k = Math.min(n - 1, Math.floor(clamp01(u) * n))
      const pth = svg.querySelector(`.p${svg.dataset.pose} [data-k="${k}"]`)
      const pt = pth.getPointAtLength(clamp01(u * n - k) * pth.getTotalLength())
      const r = svg.getBoundingClientRect()
      const e = ed.getBoundingClientRect()
      const sc = r.width / svg.viewBox.baseVal.width
      return [r.left - e.left + pt.x * sc, r.top - e.top + pt.y * sc]
    }
    const pen = (svg, u) => () => penAt(svg, u)
    const start = () => [vw * 0.86, vh * 0.78]
    // [de, até, origem, destino, cursor, preso]; preso = segue o alvo sem inércia
    // (a linha que arrasta, a ponta do traço, a alça da caixa)
    const PATH = [
      [-1, IN[iType], start, caretPt, 'arrow'],
      [IN[iType], P.type[1] + 0.01, caretPt, caretPt, 'text', 1],
      [P.type[1] + 0.01, P.key - 0.02, caretPt, () => elAt(key, 0.42, 0.34), 'arrow'],
      [P.key - 0.02, P.move.show[1], () => elAt(key, 0.42, 0.34), () => elAt(key, 0.42, 0.34), 'arrow', 1],
      [P.move.show[1], P.move.grab, () => elAt(key, 0.42, 0.34), movePt, 'arrow'],
      [P.move.grab, P.move.drop[1] + 0.02, movePt, movePt, 'move', 1],
      [P.move.drop[1] + 0.02, P.circle[0], movePt, pen(scr.circle, 0), 'arrow'],
      [P.circle[0], P.circle[1], pen(scr.circle), pen(scr.circle), 'brush', 1],
      [P.circle[1], P.strike.draw[0], pen(scr.circle, 1), pen(scr.strike, 0), 'arrow'],
      [P.strike.draw[0], P.strike.draw[1], pen(scr.strike), pen(scr.strike), 'brush', 1],
      [P.strike.draw[1], P.grow.box[1], pen(scr.strike, 1), () => elAt(growHandle), 'arrow'],
      [P.grow.box[1], P.grow.drag[1] + 0.01, () => elAt(growHandle), () => elAt(growHandle), 'resize', 1],
      [P.grow.drag[1] + 0.01, P.marker[0], () => elAt(growHandle), pen(scr.under, 0), 'arrow'],
      [P.marker[0], P.marker[1], pen(scr.under), pen(scr.under), 'brush', 1],
      [P.marker[1], P.hand.arrow[0], pen(scr.under, 1), pen(scr.arrow, 0), 'arrow'],
      [P.hand.arrow[0], P.hand.arrow[1], pen(scr.arrow), pen(scr.arrow), 'brush', 1],
      [P.hand.arrow[1], P.present.press[0], pen(scr.arrow, 1), () => presentAt(), 'arrow'],
      [P.present.press[0], 99, () => presentAt(), () => presentAt(), 'arrow', 1],
    ]
    const damp = (a, b, tau, dt) => (REDUCE || !dt ? b : lerp(a, b, 1 - Math.exp(-dt / tau)))
    const easeOut3 = (x) => 1 - (1 - x) ** 3

    return {
      length: LENGTH,
      measure,
      update(p, { now, v, shift }) {
        const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0
        lastNow = now
        const live = !REDUCE
        speed = damp(speed, live ? Math.min(1, Math.abs(v) / 40) : 0, 0.18, dt)
        // a grade entra com a troca de seção (a 5 não tem grade): varre em pixels da
        // direita para a esquerda e termina já com a 1ª linha na tela
        const gridIn = ramp(shift, 0.25, 1) * 0.7 + ramp(p, 0, 0.35) * 0.3
        ed.style.setProperty('--grid', easeInOut(ramp(shift, 0.3, 1)))

        // ---- digitação: acompanha o scroll, letra a letra (subir apaga) ----
        const typeU = ramp(p, ...P.type)
        const typed = p < IN[iType] ? 0 : typeAt.filter((t) => t <= typeU * typeAt.at(-1)).length
        const typing = typed > 0 && typed < typeUnits.length
        const last = typeUnits[typed - 1]
        caret.style.left = typed ? `${last.offsetLeft + last.offsetWidth + 2}px` : '0px'
        caret.classList.toggle('on', p >= IN[iType] && p < P.move.show[0])
        caret.classList.toggle('typing', typing) // digitando: cursor de texto fixo; parado: pisca

        // ---- stop-motion: 2 poses em degrau, cada peça na sua fase ----
        const poseAt = (ph) => (REDUCE ? 0 : Math.floor(now / POSE + ph) % 2)
        for (const [el, ph] of POSED) setPose(el, poseAt(ph))


        // ---- estados da história ----
        const k = easeInOut(ramp(p, ...P.move.drop))
        moveOff = { x: MOVE_FROM.x * W * (1 - k), y: MOVE_FROM.y * ts[iMove].offsetHeight * (1 - k), rot: MOVE_FROM.rot * (1 - k) }
        const mvT = `translate(${moveOff.x}px, ${moveOff.y}px) rotate(${moveOff.rot}deg)`
        ts[iMove].style.transform = mvT
        fgls[iMove].style.transform = mvT
        moveBox.style.opacity = p >= P.move.grab ? 1 - ramp(p, ...P.move.boxOut) : 0
        const snapped = k >= 1 && p < P.move.boxOut[1]
        snap.style.opacity = snapped ? 1 : 0
        guide.classList.toggle('flash', snapped)
        const hl = easeInOut(ramp(p, ...P.mark))
        ts[iMark].style.setProperty('--hl', hl)
        tagXY.classList.toggle('on', p >= P.tag)
        drawScribble(scr.circle, easeInOut(ramp(p, ...P.circle)))
        tagOurs.classList.toggle('on', p >= P.ours)
        drawScribble(scr.strike, easeInOut(ramp(p, ...P.strike.draw)))
        const hollow = easeInOut(ramp(p, ...P.strike.hollow))
        ts[iStrike].classList.toggle('is-hollow', hollow > 0.5) // (sem WebGL)
        const gs = lerp(1, gsMax, easeInOut(ramp(p, ...P.grow.drag)))
        if (lns[iGrow].style.getPropertyValue('--gs') !== String(gs)) {
          lns[iGrow].style.setProperty('--gs', gs)
          placeFg(iGrow)
        }
        drawScribble(scr.under, easeInOut(ramp(p, ...P.marker)))
        drawScribble(scr.arrow, easeInOut(ramp(p, ...P.hand.arrow)))
        tagHand.classList.toggle('on', p >= P.hand.tag)
        const ui = 1 - easeInOut(ramp(p, ...P.present.ui))
        growBox.style.opacity = ramp(p, ...P.grow.box) * ui
        tagScale.textContent = `escala ${Math.round(gs * 100)}%`
        tagScale.classList.toggle('on', p >= P.grow.drag[0])
        ed.style.setProperty('--ui', ui)

        // ---- cliques (tempo real; subir rearma): a tecla, a pega da linha, o "apresentar" ----
        let fired = null
        for (const k in HITS) {
          if (p >= HITS[k] && hitT0[k] === null) { hitT0[k] = now; lastHit = fired = k }
          if (p < HITS[k] - 0.02) hitT0[k] = null
        }
        const hitAge = (k) => (hitT0[k] === null || REDUCE ? 99 : (now - hitT0[k]) / 1000)
        // o impacto (= esbarrão no PC da seção 2): afunda, treme e volta
        const jolt = (a, f = 26) => (a < 1.4 ? Math.exp(-a * 6) * Math.sin(a * f + 0.5) : 0)
        const squash = (a, d) => 1 - d * (a < 1 ? Math.exp(-a * 10) : 0)
        // tecla ENTER: a última "letra"; o clique a afunda; parada, o stop-motion
        const ka = hitAge('key')
        key.classList.toggle('on', typed === typeUnits.length)
        const keyS = ka < HIT.pressed ? 'pressed' : poseAt(0.3) ? 'pose2' : 'idle'
        if (key.dataset.s !== keyS) key.dataset.s = keyS
        key.style.transform = `translateX(${jolt(ka, 40) * 3}px) scale(${squash(ka, -0.06)}, ${squash(ka, 0.12)})`
        const pa = hitAge('present')
        present.classList.toggle('press', pa < 0.3)
        present.style.transform = `translateY(${jolt(pa) * 3}px) scale(${squash(pa, 0.14)})`

        // ---- onda de choque: o clique em "apresentar" a dispara ----
        const shockT0 = hitT0.present
        let shock = null
        let swept = null // pontos: o que a onda já varreu não volta
        if (live && shockT0 !== null) {
          const age = (now - shockT0) / 1000
          const [cx, cy] = presentAt(0.5, 0.5)
          swept = [cx, cy, age * SHOCK.speed]
          if (age < SHOCK.life) shock = [cx, cy, age * SHOCK.speed, SHOCK.amp * (1 - age / SHOCK.life) ** 1.5]
        }

        // ---- câmera (alvo pelo scroll, posição com inércia) ----
        let fy = focusY(0)
        for (let i = 1; i < LINES.length; i++) if (p >= IN[i]) fy = lerp(focusY(i - 1), focusY(i), easeInOut(ramp(p, IN[i], IN[i] + PAN)))
        const lastB = tBox(LINES.length - 1)
        const artH = lastB.y + lastB.h
        const fitS = Math.min(1, (vh * FIT) / artH)
        const fit = easeInOut(ramp(p, ...P.present.fit))
        const target = {
          s: lerp(1, fitS, fit),
          ax: lerp(ax0, (vw - W * fitS) / 2, fit),
          ay: lerp(vh * FOCUS - fy, (vh - artH * fitS) / 2 + 16, fit),
        }
        view = view ? { s: damp(view.s, target.s, TAU.cam, dt), ax: damp(view.ax, target.ax, TAU.cam, dt), ay: damp(view.ay, target.ay, TAU.cam, dt) } : target
        const artT = `translate3d(${view.ax}px, ${view.ay}px, 0) scale(${view.s})`
        art.style.transform = artT
        fg.style.transform = artT
        const vy = dt ? (view.ay - lastAy) / (dt * 60) : 0
        lastAy = view.ay

        // ---- bola ----
        ballA = damp(ballA, inside && shift > 0.6 ? 1 : 0, 0.12, dt)
        ball.classList.toggle('is-visible', inside && shift > 0.6)
        ed.classList.toggle('has-ball', inside && shift > 0.6)

        // ---- cada linha: entrada com inércia + efeitos (WebGL) ----
        const fi = IN.findLastIndex((t) => p >= t)
        for (let i = 0; i < LINES.length; i++) {
          const s = st[i]
          const eT = i === iType ? (typed ? 1 : 0)
            : i === iMove ? ramp(p, ...P.move.show)
              : ramp(p, IN[i], IN[i] + ENTER)
          s.e = i === iType ? eT : damp(s.e, eT, TAU.line, dt)
          s.foc = damp(s.foc, live && i < fi && fit < 1 ? 1 - fit : 0, TAU.focus, dt)
          const kk = i === iType ? 0 : 1 - easeOut3(clamp01(s.e))

          if (!gl) {
            lns[i].style.opacity = clamp01(s.e * 2)
            continue
          }
          const b = tBox(i)
          const fsl = fsOf(i, gs)
          const L = glLines[i]
          const u = L.u
          const px = PAD.x * fsl
          const py = PAD.y * fsl
          const w = (b.w + px * 2) * view.s
          const h = (b.h + py * 2) * view.s
          const left = view.ax + (b.x - px) * view.s
          const top = view.ay + (b.y - py) * view.s
          L.place(left + w / 2, top + h / 2, w, h, i === iMove ? (moveOff.rot * Math.PI) / 180 : 0)
          L.show(s.e > 0.001)
          const qh = b.h + py * 2
          // a entrada em si é calculada por pixel no shader, a partir de uE
          u.uE.value = s.e
          u.uFx.value = live && i !== iType ? 1 : 0
          u.uType.value = i === iType ? 1 : 0
          u.uStag.value = FX.stagger
          u.uRise.value = (b.h * FX.rise) / qh
          u.uBoxBot.value = (py - 0.2 * fsl) / qh // a máscara fica um pouco abaixo, para não cortar as descendentes
          u.uWave.value = FX.wave
          u.uBlurMax.value = FX.blur
          u.uTrail.value = (b.h * FX.trail) / qh
          u.uRgbMax.value = FX.rgb
          u.uAlpha.value = 1 - s.foc * DEFOCUS.dim
          u.uBend.value = live ? kk * FX.bend + speed * SPEED.bend * kk : 0
          u.uRGB.value = live ? speed * SPEED.rgb * kk : 0 // só na linha que está entrando
          u.uMotion.value = live ? Math.min(30, Math.abs(vy) * SPEED.motion) : 0
          u.uDefocus.value = live ? s.foc * DEFOCUS.blur : 0
          u.uGrain.value = live ? FX.grain : 0
          u.uHollow.value = i === iStrike ? hollow : 0
          // foto: dither na entrada, depois cor em degraus
          if (hasImg[i]) {
            const seen = i === iType ? typed === typeUnits.length : s.e > 0.6
            if (!seen) imgT0[i] = null
            else if (imgT0[i] === null) imgT0[i] = now
            const age = imgT0[i] === null ? 0 : (now - imgT0[i]) / 1000 - DITHER.hold
            u.uImgMode.value = REDUCE ? 1 : Math.floor(clamp01(age / DITHER.dur) * DITHER.steps) / DITHER.steps
          }
          // "exatamente assim.": as letras sob o bloco de papel viram tinta
          u.uInvX.value = i === iMark ? (px + (-0.1 * fsl + hl * (b.w + 0.2 * fsl))) / (b.w + px * 2) : -1
          // "foi escrita": só o que já foi digitado
          u.uRevealX.value = i === iType
            ? (typed === typeUnits.length ? 2 : typed ? (px + last.offsetLeft + last.offsetWidth) / (b.w + px * 2) : -1)
            : 2
          if (shock) u.uShock.value.set(...shock)
          else u.uShock.value.w = 0
          // a bola incha o texto por baixo
          if (mouse && ballA > 0.01 && live) {
            u.uMouse.value.set(mouse[0] - left, top + h - mouse[1], ballA * BALL.strength)
            u.uMouseR.value = BALL.r
          } else u.uMouse.value.z = 0
        }
        gl?.render(now / 1000)

        grid?.render(now / 1000, REDUCE ? 1 : easeInOut(gridIn), ui, shock, swept)

        // ---- cursor do editor (alvo pelo trajeto, posição com inércia) ----
        const seg = PATH.findLast((sg) => p >= sg[0]) ?? PATH[0]
        const a0 = seg[2]()
        const b0 = seg[3]()
        const uu = easeInOut(ramp(p, seg[0], seg[1]))
        const cTarget = [lerp(a0[0], b0[0], uu), lerp(a0[1], b0[1], uu)]
        curPos = curPos && !seg[5] ? [damp(curPos[0], cTarget[0], TAU.cur, dt), damp(curPos[1], cTarget[1], TAU.cur, dt)] : cTarget
        cur.dataset.m = seg[4]
        // clique: o cursor afunda, recua e gira (a pega da linha, mais leve)
        const ha = lastHit ? hitAge(lastHit) : 99
        const hs = lastHit === 'grab' ? 0.4 : 1
        const cj = jolt(ha) * HIT.bump * hs
        cur.style.transform = `translate3d(${curPos[0] - cj * 0.4}px, ${curPos[1] - cj}px, 0) rotate(${jolt(ha, 20) * HIT.spin * hs}deg) scale(${squash(ha, 0.2 * hs)})`
        // a marca de impacto (riscos vermelhos que se abrem e somem) na ponta do cursor
        if (fired && fired !== 'grab' && live) {
          Object.assign(impact.style, { left: `${cTarget[0]}px`, top: `${cTarget[1]}px` })
          impact.classList.remove('on')
          void impact.offsetWidth // reinicia a animação
          impact.classList.add('on')
        }
        // depois do "apresentar", o cursor some aos poucos (tempo real)
        cur.style.opacity = REDUCE ? ui : hitT0.present === null ? 1 : 1 - clamp01((pa - FADE.hold) / FADE.dur)
        if (seg[4] !== toolOn) {
          tools[toolOn]?.classList.remove('on')
          tools[seg[4]]?.classList.add('on')
          toolOn = seg[4]
        }

        return p < IN[iMark] ? 'escrita e posicionada' : p < IN[iStrike] + 0.18 ? 'exatamente assim' : p < IN[iGrow] ? 'não está lendo' : ui > 0 ? 'vivenciando' : 'apresentar'
      },
    }
  },
})
