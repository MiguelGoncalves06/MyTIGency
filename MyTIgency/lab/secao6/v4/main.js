// LAB — seção 6, v4: "O editor" no escuro. A mesma cena da v3 (linhas
// escritas uma a uma, a interface do editor fazendo o que cada linha diz,
// "apresentar" e o recuo que mostra o cartaz inteiro), agora com:
//   · imagens entre as palavras (peças do kit da MyT; trocar em IMG);
//   · lente em anel: cada unidade (letra ou imagem) é posta num cilindro visto
//     por dentro — translateZ cresce com o quadrado da distância ao eixo e a
//     letra gira para encarar o centro; a perspectiva mora em cada .t, com a
//     origem no eixo do anel. O scroll rápido curva mais e faz a onda correr;
//   · entrada das letras: sobem esticadas (scaleY), em contorno e borradas,
//     e assentam (expo-out);
//   · scroll rápido: RGB separado (vermelho) e rastro vertical (blur de
//     movimento, por text-shadow — barato e herdado por todas as letras);
//   · lupa redonda que segue o mouse e incha as letras por baixo dela;
//   · câmera e cursor com inércia (seguem o alvo com amortecimento).
// Posição = função do scroll; inércia, onda, RGB e lupa são resposta em tempo real.
import { mountLab, ramp, easeInOut, lerp, clamp01, strikeSvg, esc, REDUCE, FINE } from '../base.js'
import brilho from '../../../src/assets/kit/brilho.svg'
import estrela from '../../../src/assets/kit/estrela.svg'
import selo from '../../../src/assets/kit/selo-feito-branco.svg'
import ticket from '../../../src/assets/kit/ticket-aprovado.svg'
import alvo from '../../../src/assets/alvo.png'
import mao from '../../../src/assets/mao-halftone.png'

// imagens entre as palavras: troque o arquivo aqui (ou a classe de ajuste)
const IMG = {
  spark: { src: brilho },
  hand: { src: mao, cls: 'im--hand' },
  target: { src: alvo, cls: 'im--inv' },
  seal: { src: selo },
  ticket: { src: ticket, cls: 'im--ticket' },
  star: { src: estrela, cls: 'im--inv' },
}
const LINES = [
  { parts: ['Cada ', IMG.spark, ' linha'] },
  { parts: ['foi escrita ', IMG.hand], kind: 'type' },
  { parts: ['e posicionada ', IMG.target], kind: 'move' },
  { parts: ['exatamente assim.'], kind: 'mark' },
  { parts: ['Você ', IMG.seal, ' não está'] },
  { parts: ['lendo'], kind: 'strike' },
  { parts: ['sobre o ', IMG.ticket, ' nosso'] },
  { parts: ['trabalho.'] },
  { parts: ['Você está ', IMG.star] },
  { parts: ['vivenciando.'], kind: 'grow' },
]
const SENTENCE = 'Cada linha foi escrita e posicionada exatamente assim. Você não está lendo sobre o nosso trabalho. Você está vivenciando.'
const IN = [0, 0.2, 0.62, 1.18, 1.5, 1.66, 2.12, 2.26, 2.42, 2.56]
const SPREAD = 0.14 // atraso da última letra em relação à primeira, na entrada da linha
const UNIT = 0.16 // duração da entrada de cada letra
const P = {
  type: [0.22, 0.58],
  move: { show: [0.62, 0.72], drop: [0.84, 1.06], boxOut: [1.08, 1.18] },
  mark: [1.22, 1.4], tag: 1.38,
  strike: { mq: [1.74, 1.86], sel: [1.88, 1.98], draw: [1.98, 2.1], selOut: [2.1, 2.18] },
  grow: { box: [2.62, 2.7], drag: [2.8, 3.12] },
  present: { press: [3.36, 3.42], ui: [3.4, 3.58], fit: [3.44, 3.82] },
}
const LENGTH = 4.0
const FOCUS = 0.56
const PAN = 0.26
const MOVE_FROM = { x: 0.24, y: 0.6, rot: 5 }
// lente em anel: profundidade das pontas (em larguras da prancheta), giro máximo, quanto o scroll rápido soma, onda
// (giro baixo: girar muito encurta cada letra enquanto a projeção as afasta, e abre buraco entre elas)
const LENS = { base: 0.6, speed: 0.6, depth: 0.2, angle: 10, wave: 0.03 }
const CAM_TAU = 0.11 // s: inércia da câmera
const CUR_TAU = 0.07 // s: inércia do cursor
const LOUPE = { r: 0.085, mag: 0.7, push: 0.22, idle: 1400 }

const expoOut = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
const HANDLES = '<i></i>'.repeat(6)
const unitHtml = (part) => (typeof part === 'string'
  ? [...part].map((c) => `<span class="lt">${esc(c)}</span>`).join('')
  : `<span class="lt im ${part.cls ?? ''}"><img src="${part.src}" alt="" /></span>`)
function lineHtml({ parts, kind }) {
  const inner = parts.map(unitHtml).join('')
  if (kind === 'type') return `<p class="ln"><span class="t">${inner}<span class="caret"></span></span></p>`
  if (kind === 'move') return `<p class="ln"><span class="t">${inner}<span class="box box--red">${HANDLES}</span></span><span class="snap">← 0 px</span></p>`
  if (kind === 'mark') return `<p class="ln"><span class="t mark">${inner}</span><span class="tag tag-xy"></span></p>`
  if (kind === 'strike') return `<p class="ln"><span class="t sel strike-w">${inner}${strikeSvg()}<span class="lasso"></span></span></p>`
  if (kind === 'grow') return `<p class="ln ln--grow"><span class="t it">${inner}<span class="box">${HANDLES}</span></span><span class="tag tag-scale"></span></p>`
  return `<p class="ln"><span class="t">${inner}</span></p>`
}
const ICONS = '<svg class="c-arrow" viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.3 3.2 6.8 2.6-1.2-3.2-6.7H14Z"/></svg>'
  + '<svg class="c-move" viewBox="0 0 14 14"><path d="M7 0v14M0 7h14M7 0 5 2M7 0l2 2M7 14l-2-2M7 14l2-2M0 7l2-2M0 7l2 2M14 7l-2-2M14 7l-2 2"/></svg>'
  + '<svg class="c-text" viewBox="0 0 10 22"><path d="M1 1h8M1 21h8M5 1v20"/></svg>'
  + '<svg class="c-resize" viewBox="0 0 16 22"><path d="M2 2h6L6 4l8 8 2-2v6h-6l2-2-8-8-2 2Z"/></svg>'

mountLab({
  title: 'LAB — Seção 6 · v4 O editor (escuro)',
  links: [['../v3/', 'v3 · editor claro'], ['./', 'v4 · editor escuro', true], ['../v5/', 'v5 · webgl']],
  controls: '<span class="seg"><button type="button" data-al="left" aria-pressed="true">esquerda</button><button type="button" data-al="center" aria-pressed="false">centro</button></span>'
    + '<span class="seg"><button type="button" data-case="normal" aria-pressed="true">Aa</button><button type="button" data-case="upper" aria-pressed="false">AA</button></span>'
    + '<span class="seg"><button type="button" data-fx="on" aria-pressed="true">efeitos</button><button type="button" data-fx="off" aria-pressed="false">sem</button></span>',
  scene(host) {
    host.innerHTML = `
      <h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${esc(SENTENCE)}</h2>
      <div class="ed" aria-hidden="true">
        <div class="ed-grid"></div>
        <div class="chrome"><div class="guide"></div></div>
        <div class="art-clip"><div class="art">${LINES.map(lineHtml).join('')}</div></div>
        <div class="chrome">
          <div class="bar"><span>arquivo</span><span>editar</span><span>texto</span><span>organizar</span><span class="doc">manifesto · página 06</span><span class="sp"></span>
            <span class="present"><svg viewBox="0 0 8 9"><path d="M0 0 8 4.5 0 9Z"/></svg>apresentar</span></div>
          <div class="panels">
            <div class="pn"><h3>caractere</h3><dl>
              <dt>fonte</dt><dd data-c="family">—</dd><dt>peso</dt><dd data-c="weight">—</dd><dt>corpo</dt><dd data-c="size">—</dd>
              <dt>entrelinha</dt><dd data-c="lh">—</dd><dt>tracking</dt><dd data-c="ls">—</dd></dl></div>
            <div class="pn"><h3>camadas</h3><ol>${LINES.map(({ parts }) => `<li><b>T</b>${esc(parts.filter((x) => typeof x === 'string').join('').replace(/\s+/g, ' ').trim())}</li>`).join('')}</ol></div>
          </div>
        </div>
        <div class="loupe"></div>
        <div class="cur" data-m="arrow">${ICONS}</div>
      </div>`

    const q = (s) => host.querySelector(s)
    const ed = q('.ed')
    const art = q('.art')
    const guide = q('.guide')
    const lns = [...art.querySelectorAll('.ln')]
    const ts = lns.map((l) => l.querySelector('.t'))
    const at = (kind) => LINES.findIndex((l) => l.kind === kind)
    const iType = at('type'), iMove = at('move'), iMark = at('mark'), iStrike = at('strike'), iGrow = at('grow')
    const caret = lns[iType].querySelector('.caret')
    const moveBox = lns[iMove].querySelector('.box')
    const snap = lns[iMove].querySelector('.snap')
    const tagXY = q('.tag-xy')
    const lasso = q('.lasso')
    const growBox = lns[iGrow].querySelector('.box')
    const tagScale = q('.tag-scale')
    const present = q('.present')
    const cur = q('.cur')
    const loupe = q('.loupe')
    const layers = [...q('.pn ol').children]
    const charVals = Object.fromEntries([...host.querySelectorAll('[data-c]')].map((el) => [el.dataset.c, el]))
    // cada letra/imagem é uma unidade: entra sozinha e fica no anel
    const units = lns.flatMap((ln, li) => {
      const els = [...ln.querySelectorAll('.lt')]
      return els.map((el, k) => ({ el, li, k, n: els.length, cx: 0, cy: 0, frac: 0, last: '', ol: null, blur: -1 }))
    })
    const typeUnits = units.filter((u) => u.li === iType)

    // controles do LAB
    let fx = true
    const pressed = (sel) => document.querySelector(sel).getAttribute('aria-pressed') === 'true'
    document.querySelectorAll('.panel [data-al], .panel [data-case], .panel [data-fx]').forEach((b) => b.addEventListener('click', () => {
      const key = Object.keys(b.dataset)[0]
      document.querySelectorAll(`.panel [data-${key}]`).forEach((o) => o.setAttribute('aria-pressed', String(o === b)))
      ed.classList.toggle('is-center', pressed('.panel [data-al="center"]'))
      ed.classList.toggle('is-upper', pressed('.panel [data-case="upper"]'))
      fx = pressed('.panel [data-fx="on"]')
      dispatchEvent(new Event('lab:relayout'))
    }))

    let vw = 0
    let vh = 0
    let W = 0
    let ax0 = 0
    let gsMax = 1
    let center = false
    let fsPx = 0
    let view = null // câmera de fato (com inércia)
    let curPos = null
    let moveOff = { x: 0, y: 0 }
    let lastNow = 0
    let lastAy = 0
    let speed = 0 // velocidade do scroll, amortecida (0..1)

    function placeUnits(li) {
      const ln = lns[li]
      const t = ts[li]
      const ox = ln.offsetLeft + t.offsetLeft
      const oy = ln.offsetTop + t.offsetTop
      t.style.perspectiveOrigin = `${W / 2 - ox}px 50%`
      for (const u of units) {
        if (u.li !== li) continue
        u.cx = ox + u.el.offsetLeft + u.el.offsetWidth / 2
        u.cy = oy + u.el.offsetTop + u.el.offsetHeight / 2
        u.frac = (u.el.offsetLeft + u.el.offsetWidth / 2) / t.offsetWidth
      }
    }

    function measure(size) {
      ({ vw, vh } = size)
      center = ed.classList.contains('is-center')
      fsPx = Math.max(40, Math.min(vw * 0.06, vh * 0.1, 116))
      ed.style.setProperty('--fs', `${fsPx}px`)
      ed.style.setProperty('--gs', 1)
      lns[iGrow].style.setProperty('--gs', 1)
      W = vw * (center ? 0.62 : 0.6)
      ax0 = center ? (vw - W) / 2 : vw * 0.09
      art.style.width = `${W}px`
      gsMax = Math.min(2.6, (W * 0.98) / ts[iGrow].offsetWidth)
      guide.style.left = `${center ? ax0 + W / 2 : ax0}px`
      snap.style.left = `${ts[iMove].offsetLeft - 64}px`
      snap.style.top = '.38em'
      for (const [el, i, below] of [[tagXY, iMark, false], [tagScale, iGrow, true]]) {
        const t = ts[i]
        el.style.left = below ? `${t.offsetLeft}px` : `${t.offsetLeft + t.offsetWidth + 18}px`
        el.style.top = below ? 'calc(100% + 14px)' : '.2em'
      }
      tagXY.textContent = `x ${Math.round(lns[iMark].offsetLeft + ts[iMark].offsetLeft)} · y ${Math.round(lns[iMark].offsetTop + ts[iMark].offsetTop)}`
      lns.forEach((_, i) => placeUnits(i))
      loupe.style.width = loupe.style.height = `${vw * LOUPE.r * 2}px`
      view = null
    }

    // lupa: segue o mouse (só com mouse)
    let mouse = null
    let mouseAt = -1e9
    let loupeA = 0
    addEventListener('pointermove', (e) => {
      if (!FINE || e.pointerType !== 'mouse') return
      const r = ed.getBoundingClientRect()
      mouse = [e.clientX - r.left, e.clientY - r.top]
      mouseAt = performance.now()
    })

    const tBox = (i) => {
      const x = lns[i].offsetLeft + ts[i].offsetLeft + (i === iMove ? moveOff.x : 0)
      const y = lns[i].offsetTop + ts[i].offsetTop + (i === iMove ? moveOff.y : 0)
      return { x, y, w: ts[i].offsetWidth, h: ts[i].offsetHeight }
    }
    const toScene = (x, y) => [view.ax + x * view.s, view.ay + y * view.s]
    const focusY = (i) => { const b = tBox(i); return b.y + b.h / 2 }
    const caretPt = () => { const b = tBox(iType); return toScene(b.x + caret.offsetLeft + 3, b.y + caret.offsetTop + caret.offsetHeight * 0.5) }
    const movePt = () => { const b = tBox(iMove); return toScene(b.x + b.w * 0.42, b.y + b.h * 0.55) }
    const strikeA = () => { const b = tBox(iStrike); return toScene(b.x - b.h * 0.14, b.y - b.h * 0.04) }
    const strikeB = () => { const b = tBox(iStrike); return toScene(b.x + b.w + b.h * 0.14, b.y + b.h * 1.04) }
    const growPt = () => { const b = tBox(iGrow); return toScene(b.x + b.w + b.h * 0.1, b.y + b.h * 0.98) }
    const presentPt = () => {
      const r = present.getBoundingClientRect()
      const e = ed.getBoundingClientRect()
      return [r.left - e.left + r.width * 0.55, r.top - e.top + r.height * 0.6]
    }
    const start = () => [vw * 0.86, vh * 0.78]
    const PATH = [
      [-1, IN[iType], start, caretPt, 'arrow'],
      [IN[iType], P.type[1], caretPt, caretPt, 'text'],
      [P.type[1], P.move.drop[0] - 0.02, caretPt, movePt, 'arrow'],
      [P.move.drop[0] - 0.02, P.move.drop[1], movePt, movePt, 'move'],
      [P.move.drop[1], P.strike.mq[0], movePt, strikeA, 'arrow'],
      [P.strike.mq[0], P.strike.mq[1], strikeA, strikeB, 'arrow'],
      [P.strike.mq[1], P.grow.box[1], strikeB, growPt, 'arrow'],
      [P.grow.box[1], P.grow.drag[1], growPt, growPt, 'resize'],
      [P.grow.drag[1], P.present.press[0], growPt, presentPt, 'arrow'],
      [P.present.press[0], 99, presentPt, presentPt, 'arrow'],
    ]
    const damp = (a, b, tau, dt) => (REDUCE || tau <= 0 ? b : lerp(a, b, 1 - Math.exp(-dt / tau)))

    return {
      length: LENGTH,
      measure,
      update(p, { now, v }) {
        const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0
        lastNow = now
        const live = fx && !REDUCE
        speed = damp(speed, live ? Math.min(1, Math.abs(v) / 40) : 0, 0.18, dt)

        // ---- estados da história (iguais à v3) ----
        const nType = Math.round(ramp(p, ...P.type) * typeUnits.length)
        caret.style.left = nType ? `${typeUnits[nType - 1].el.offsetLeft + typeUnits[nType - 1].el.offsetWidth + 2}px` : '0px'
        caret.classList.toggle('on', p >= IN[iType] && p < P.move.show[0])
        const k = easeInOut(ramp(p, ...P.move.drop))
        moveOff = { x: MOVE_FROM.x * W * (1 - k), y: MOVE_FROM.y * ts[iMove].offsetHeight * (1 - k) }
        lns[iMove].style.opacity = ramp(p, ...P.move.show)
        ts[iMove].style.transform = `translate(${moveOff.x}px, ${moveOff.y}px) rotate(${MOVE_FROM.rot * (1 - k)}deg)`
        moveBox.style.opacity = p >= P.move.show[0] ? 1 - ramp(p, ...P.move.boxOut) : 0
        const snapped = k >= 1 && p < P.move.boxOut[1]
        snap.style.opacity = snapped ? 1 : 0
        guide.classList.toggle('flash', snapped)
        const hl = easeInOut(ramp(p, ...P.mark))
        ts[iMark].style.setProperty('--hl', hl)
        tagXY.classList.toggle('on', p >= P.tag)
        const mq = ramp(p, ...P.strike.mq)
        lasso.style.setProperty('--mq', mq)
        lasso.style.opacity = mq > 0 ? 1 - ramp(p, ...P.strike.selOut) : 0
        ts[iStrike].style.setProperty('--sel', ramp(p, ...P.strike.sel) * (1 - ramp(p, ...P.strike.selOut)))
        const dr = ramp(p, ...P.strike.draw)
        ts[iStrike].style.setProperty('--draw', easeInOut(dr))
        ts[iStrike].classList.toggle('is-hollow', dr > 0.6)
        const gs = lerp(1, gsMax, easeInOut(ramp(p, ...P.grow.drag)))
        if (lns[iGrow].style.getPropertyValue('--gs') !== String(gs)) {
          lns[iGrow].style.setProperty('--gs', gs)
          placeUnits(iGrow)
        }
        const ui = 1 - easeInOut(ramp(p, ...P.present.ui))
        growBox.style.opacity = ramp(p, ...P.grow.box) * ui
        tagScale.textContent = `escala ${Math.round(gs * 100)}%`
        tagScale.classList.toggle('on', p >= P.grow.drag[0])
        ed.style.setProperty('--ui', ui)
        present.classList.toggle('press', p >= P.present.press[0] && p < P.present.press[1])

        // ---- câmera (alvo pelo scroll, posição com inércia) ----
        let fy = focusY(0)
        for (let i = 1; i < LINES.length; i++) if (p >= IN[i]) fy = lerp(focusY(i - 1), focusY(i), easeInOut(ramp(p, IN[i], IN[i] + PAN)))
        const lastB = tBox(LINES.length - 1)
        const artH = lastB.y + lastB.h
        const fitS = Math.min(1, (vh * 0.72) / artH)
        const f = easeInOut(ramp(p, ...P.present.fit))
        const target = {
          s: lerp(1, fitS, f),
          ax: lerp(ax0, center ? (vw - W * fitS) / 2 : ax0, f),
          ay: lerp(vh * FOCUS - fy, (vh - artH * fitS) / 2 + 24, f),
        }
        view = view ? { s: damp(view.s, target.s, CAM_TAU, dt), ax: damp(view.ax, target.ax, CAM_TAU, dt), ay: damp(view.ay, target.ay, CAM_TAU, dt) } : target
        art.style.transform = `translate3d(${view.ax}px, ${view.ay}px, 0) scale(${view.s})`

        // ---- blur de movimento + RGB (pela velocidade da câmera e do scroll) ----
        const vy = dt ? (view.ay - lastAy) / (dt * 60) : 0 // px por quadro
        lastAy = view.ay
        if (live) {
          const sm = Math.max(-16, Math.min(16, vy * 0.7))
          const rgb = speed * 6
          const a = Math.abs(sm)
          art.style.textShadow = a < 0.4 && rgb < 0.3 ? 'none'
            : `${rgb.toFixed(1)}px 0 0 rgba(255,68,56,${Math.min(0.8, speed * 1.4).toFixed(2)}), ${(-rgb * 0.6).toFixed(1)}px 0 0 rgba(244,243,239,${(speed * 0.35).toFixed(2)}), `
              + `0 ${(-sm).toFixed(1)}px ${(a * 0.6).toFixed(1)}px rgba(244,243,239,.22), 0 ${(-sm * 2).toFixed(1)}px ${(a * 1.2).toFixed(1)}px rgba(244,243,239,.1)`
        } else art.style.textShadow = 'none'

        // ---- lupa ----
        const lr = vw * LOUPE.r
        loupeA = damp(loupeA, live && mouse && now - mouseAt < LOUPE.idle ? 1 : 0, 0.15, dt)
        if (mouse) loupe.style.transform = `translate(${mouse[0] - lr}px, ${mouse[1] - lr}px)`
        loupe.style.opacity = loupeA

        // ---- cada letra: entrada (esticada, contorno, borrada) + anel + lupa ----
        const L = live ? LENS.base + LENS.speed * speed : REDUCE ? LENS.base : 0
        for (const u of units) {
          let e
          if (u.li === iType) e = u.k < nType ? ramp(p, P.type[0] + (u.k / u.n) * (P.type[1] - P.type[0]), P.type[0] + ((u.k + 1) / u.n) * (P.type[1] - P.type[0]) + 0.05) : 0
          else if (u.li === iMove) e = ramp(p, ...P.move.show)
          else { const s0 = IN[u.li] + (u.k / Math.max(1, u.n - 1)) * SPREAD; e = ramp(p, s0, s0 + UNIT) }
          if (REDUCE) e = 1
          const eo = expoOut(e)
          const x = (u.cx - W / 2) / (W / 2)
          const z = LENS.depth * W * L * x * x + (live ? LENS.wave * W * speed * Math.sin(x * 2.6 + u.li * 0.7 - now * 0.005) : 0)
          const rot = -LENS.angle * L * x
          let mag = 1
          let px = 0
          let py = 0
          if (loupeA > 0.01 && mouse) {
            const sx = view.ax + u.cx * view.s
            const sy = view.ay + u.cy * view.s
            const dx = sx - mouse[0]
            const dy = sy - mouse[1]
            const d = Math.hypot(dx, dy) || 1
            const g = Math.exp(-((d / lr) ** 2)) * loupeA
            mag = 1 + LOUPE.mag * g
            px = (dx / d) * g * lr * LOUPE.push / view.s
            py = (dy / d) * g * lr * LOUPE.push / view.s
          }
          const stretch = fx ? (1 - eo) : 0
          const ey = (1 - eo) * fsPx * 0.55
          const tr = `translate3d(${px.toFixed(1)}px,${(ey + py).toFixed(1)}px,${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${((1 - stretch * 0.35) * mag).toFixed(3)},${((1 + stretch * 1.6) * mag).toFixed(3)})`
          if (tr !== u.last) { u.el.style.transform = tr; u.last = tr }
          u.el.style.opacity = clamp01(e * 2.5)
          const ol = fx && e > 0 && e < 0.6
          if (ol !== u.ol) { u.el.classList.toggle('ol', ol); u.ol = ol }
          const bl = fx && e > 0 && e < 1 ? Math.round((1 - eo) * 10) : 0
          if (bl !== u.blur) { u.el.style.filter = bl ? `blur(${bl}px)` : ''; u.blur = bl }
          if (u.li === iMark) u.el.classList.toggle('inv', hl >= u.frac)
        }

        // ---- cursor (alvo pelo trajeto, posição com inércia) ----
        const seg = PATH.findLast((s) => p >= s[0]) ?? PATH[0]
        const a0 = seg[2]()
        const b0 = seg[3]()
        const uu = easeInOut(ramp(p, seg[0], seg[1]))
        const cTarget = [lerp(a0[0], b0[0], uu), lerp(a0[1], b0[1], uu)]
        curPos = curPos ? [damp(curPos[0], cTarget[0], CUR_TAU, dt), damp(curPos[1], cTarget[1], CUR_TAU, dt)] : cTarget
        cur.dataset.m = seg[4]
        cur.style.transform = `translate3d(${curPos[0]}px, ${curPos[1]}px, 0)`
        cur.style.opacity = ui

        // ---- painéis ----
        const fi = IN.findLastIndex((t) => p >= t)
        layers.forEach((li, i) => { li.classList.toggle('made', p >= IN[i]); li.classList.toggle('on', i === fi) })
        const cs = getComputedStyle(ts[Math.max(0, fi)])
        const size = parseFloat(cs.fontSize)
        charVals.family.textContent = cs.fontFamily.split(',')[0].replace(/['"]/g, '')
        charVals.weight.textContent = ts[Math.max(0, fi)].classList.contains('it') ? '900 itálico' : cs.fontWeight
        charVals.size.textContent = `${Math.round(size)} px`
        charVals.lh.textContent = (parseFloat(cs.lineHeight) / size).toFixed(2)
        charVals.ls.textContent = Math.round((parseFloat(cs.letterSpacing) / size) * 1000)

        return p < IN[iMark] ? 'escrita e posicionada' : p < IN[iStrike] + 0.18 ? 'exatamente assim' : p < IN[iGrow] ? 'não está lendo' : ui > 0 ? 'vivenciando' : 'apresentar'
      },
    }
  },
})
