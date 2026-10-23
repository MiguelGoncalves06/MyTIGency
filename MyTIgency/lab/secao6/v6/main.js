// LAB — seção 6, v6: a v5 (texto em WebGL, entrada por máscara + água + rastro
// vermelho, grade em pixels, bola que inverte) com os elementos das
// referências que o usuário aprovou:
//   1. marca-texto torto (o pincel da cena A) atrás de "vivenciando.";
//   2. faixa de papel atrás de "Você está", recuada em escada (ref. da citação);
//   3. borracha: depois da seleção, um traço redondo apaga parte de "lendo";
//      o risco vem por cima e o que sobrou escorre em halftone;
//   4. painel de ferramentas do editor: acende a ferramenta em uso (seta,
//      mover, texto, laço, borracha, pincel, escala);
//   5. moldura suíça no "apresentar": fios em cima e embaixo com metadados
//      reais (seção, 7 de 7 linhas, autoria, ano);
//   6. vidro canelado como transição do "apresentar" (só no texto WebGL);
//   7. grade de pontos (botão no painel do LAB, para comparar com as linhas);
//   8. tinta gasta só em "vivenciando.", no fim;
//   9. tipo largo (Archivo 125%) em "trabalho.", para contraste.
// O DOM mede o layout (o texto dele fica transparente); fundos que ficam ATRÁS
// do texto (bloco, seleção, marca-texto) moram no DOM de baixo, e a interface
// que fica POR CIMA (caixas, risco, cursor de texto) na camada .fg.
import { mountLab, ramp, easeInOut, lerp, clamp01, strikeSvg, esc, REDUCE, FINE } from '../base.js'
import { mountTextGL, mountGridGL, canvasFont } from './gl.js'
import brilho from '../../../src/assets/kit/brilho.svg'
import selo from '../../../src/assets/kit/selo-feito-branco.svg'
import ticket from '../../../src/assets/kit/ticket-aprovado.svg'
import alvo from '../../../src/assets/alvo.png'
import mao from '../../../src/assets/mao-halftone.png'

// imagens entre as palavras (provisórias): troque o arquivo aqui
const IMG = {
  spark: { src: brilho },
  hand: { src: mao, cls: 'im--hand' },
  target: { src: alvo, cls: 'im--inv' },
  seal: { src: selo },
  ticket: { src: ticket, cls: 'im--ticket' },
}
const LINES = [
  { parts: ['Cada ', IMG.spark, ' linha'] },
  { parts: ['foi escrita ', IMG.hand], kind: 'type' },
  { parts: ['e posicionada ', IMG.target], kind: 'move' },
  { parts: ['exatamente assim.'], kind: 'mark' },
  { parts: ['Você ', IMG.seal, ' não está'] },
  { parts: ['lendo'], kind: 'strike' },
  { parts: ['sobre o ', IMG.ticket, ' nosso'] },
  { parts: ['trabalho.'], kind: 'wide' },
  { parts: ['Você está'], kind: 'strip' },
  { parts: ['vivenciando.'], kind: 'grow' },
]
const SENTENCE = 'Cada linha foi escrita e posicionada exatamente assim. Você não está lendo sobre o nosso trabalho. Você está vivenciando.'
const IN = [0, 0.2, 0.62, 1.18, 1.5, 1.66, 2.34, 2.48, 2.64, 2.8]
const ENTER = 0.24 // quanto scroll a linha leva para assentar
const P = {
  type: [0.22, 0.58],
  move: { show: [0.62, 0.74], drop: [0.84, 1.06], boxOut: [1.08, 1.18] },
  mark: [1.22, 1.4], tag: 1.38,
  strike: { mq: [1.74, 1.86], sel: [1.88, 1.98], erase: [2.0, 2.16], selOut: [2.14, 2.2], draw: [2.18, 2.28], dots: [2.26, 2.48] },
  strip: [2.72, 2.88],
  grow: { box: [2.86, 2.94], drag: [3.02, 3.3] },
  marker: [3.32, 3.48],
  present: { press: [3.54, 3.6], ui: [3.58, 3.76], reed: [3.56, 3.88], fit: [3.62, 4.0], frame: [3.72, 3.92], worn: [3.8, 4.02] },
}
const LENGTH = 4.2
const FOCUS = 0.56
const PAN = 0.26
const MOVE_FROM = { x: 0.24, y: 0.6, rot: 5 }
const PAD = { x: 0.4, y: 1.15 } // folga do quad em volta do texto (em), para curva, rastro e onda
// entrada: as letras sobem de trás da máscara, uma depois da outra, ondulando como na
// água e deixando rastro vermelho (stagger: quanto a última letra espera; rise e trail
// em alturas da linha)
const FX = { bend: 1.0, stagger: 0.6, rise: 1.05, wave: 0.06, blur: 14, trail: 0.8, rgb: 7, grain: 0.12 }
const SPEED = { bend: 0.45, rgb: 5, motion: 1.4 }
const DEFOCUS = { blur: 1.4, dim: 0.42 } // linhas anteriores à da vez
const TAU = { line: 0.16, cam: 0.11, cur: 0.07, focus: 0.25 } // inércias (s)
const HALFTONE = 0.75
const BALL = { r: 46, strength: 1 }
// borracha em "lendo" (frações da caixa da palavra): de x0 até x0 + span, em volta de y, ondulando amp; raio r
const ERASER = { x0: 0.06, span: 0.88, y: 0.55, amp: 0.13, r: 0.17 }
const REED = 0.7 // força do vidro canelado no pico
const WORN = 0.8 // tinta gasta em "vivenciando."
const FIT = 0.64 // o cartaz final ocupa esta fração da altura (sobra para a moldura)

const HANDLES = '<i></i>'.repeat(6)
const unitHtml = (part) => (typeof part === 'string'
  ? [...part].map((c) => `<span class="lt">${esc(c)}</span>`).join('')
  : `<span class="lt im ${part.cls ?? ''}"><img src="${part.src}" alt="" /></span>`)
const T_CLS = { mark: 'mark', strip: 'mark', strike: 'sel', grow: 'it has-marker' }
const LN_CLS = { grow: 'ln--grow', wide: 'ln--wide', strip: 'ln--stair' }
const lineHtml = ({ parts, kind }) => `<p class="ln ${LN_CLS[kind] ?? ''}"><span class="t ${T_CLS[kind] ?? ''}">${parts.map(unitHtml).join('')}${kind === 'grow' ? `<span class="marker">${strikeSvg()}</span>` : ''}</span></p>`
const FG = {
  type: '<span class="caret"></span>',
  move: `<span class="box box--red">${HANDLES}</span><span class="snap">← 0 px</span>`,
  mark: '<span class="tag tag-xy"></span>',
  strike: `${strikeSvg()}<span class="lasso"></span>`,
  grow: `<span class="box">${HANDLES}</span><span class="tag tag-scale"></span>`,
}
const ICONS = '<svg class="c-arrow" viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.3 3.2 6.8 2.6-1.2-3.2-6.7H14Z"/></svg>'
  + '<svg class="c-move" viewBox="0 0 14 14"><path d="M7 0v14M0 7h14M7 0 5 2M7 0l2 2M7 14l-2-2M7 14l2-2M0 7l2-2M0 7l2 2M14 7l-2-2M14 7l-2 2"/></svg>'
  + '<svg class="c-text" viewBox="0 0 10 22"><path d="M1 1h8M1 21h8M5 1v20"/></svg>'
  + '<svg class="c-resize" viewBox="0 0 16 22"><path d="M2 2h6L6 4l8 8 2-2v6h-6l2-2-8-8-2 2Z"/></svg>'
  + '<svg class="c-eraser" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48"/></svg>'
  + '<svg class="c-brush" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/><circle class="dot" cx="10" cy="10" r="2"/></svg>'
// painel de ferramentas (ícones desenhados aqui, sem biblioteca)
const TOOLS = [
  ['arrow', '<path d="M4 2v12l3-3 2.2 4.6 1.8-.9L8.8 10H13Z" class="fill"/>'],
  ['move', '<path d="M9 1v16M1 9h16M9 1 7 3M9 1l2 2M9 17l-2-2M9 17l2-2M1 9l2-2M1 9l2 2M17 9l-2-2M17 9l-2 2"/>'],
  ['text', '<path d="M3 3h12M9 3v12M6 15h6"/>'],
  ['lasso', '<ellipse cx="9" cy="7.5" rx="6.5" ry="4.5" stroke-dasharray="2 2"/><path d="M5 11c-1 2 0 4 2 4"/>'],
  ['eraser', '<path d="m3 12 6-8 6 4.5-5 6.5H6Z"/><path d="M6 15h9"/>'],
  ['brush', '<path d="M14 2 7 10M5 11c-2 1-2 3-3 5 2-.5 4-1 5-3Z"/>'],
  ['resize', '<path d="M3 3h5M3 3v5M3 3l12 12M15 15h-5M15 15v-5"/>'],
]

mountLab({
  title: 'LAB — Seção 6 · v6 elementos',
  links: [['../v5/', 'v5 · webgl'], ['./', 'v6 · elementos', true]],
  controls: '<span class="seg"><button type="button" data-al="left" aria-pressed="true">esquerda</button><button type="button" data-al="center" aria-pressed="false">centro</button></span>'
    + '<span class="seg"><button type="button" data-case="normal" aria-pressed="true">Aa</button><button type="button" data-case="upper" aria-pressed="false">AA</button></span>'
    + '<span class="seg"><button type="button" data-fx="on" aria-pressed="true">efeitos</button><button type="button" data-fx="off" aria-pressed="false">sem</button></span>'
    + '<span class="seg"><button type="button" data-grid="lines" aria-pressed="true">linhas</button><button type="button" data-grid="dots" aria-pressed="false">pontos</button></span>',
  scene(host) {
    host.innerHTML = `
      <h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${esc(SENTENCE)}</h2>
      <div class="ed" aria-hidden="true">
        <canvas class="grid-gl"></canvas><div class="ed-grid g-soft"></div><div class="ed-grid g-sharp"></div>
        <div class="chrome"><div class="guide"></div></div>
        <div class="frame">
          <div class="s5-rule"><span class="s5-pill">( 06 )</span><i class="s5-sig"></i>
            <span class="s5-mono">manifesto · <b>ethos</b></span><i></i><span class="s5-mono">linhas <b>7 de 7</b></span></div>
          <div class="s5-rule"><span class="s5-mono">escrito e posicionado por miguel &amp; thiago</span><i></i><span class="s5-mono">mytigency · ${new Date().getFullYear()}</span></div>
        </div>
        <div class="art-clip">
          <div class="art">${LINES.map(lineHtml).join('')}</div>
          <canvas class="gl"></canvas>
          <div class="art fg">${LINES.map(({ kind }) => `<div class="fgl">${FG[kind] ?? ''}</div>`).join('')}</div>
        </div>
        <div class="chrome">
          <div class="bar"><span>arquivo</span><span>editar</span><span>texto</span><span>organizar</span><span class="doc">manifesto · página 06</span><span class="sp"></span>
            <span class="present"><svg viewBox="0 0 8 9"><path d="M0 0 8 4.5 0 9Z"/></svg>apresentar</span></div>
          <div class="tools">${TOOLS.map(([name, svg]) => `<i data-tool="${name}"><svg viewBox="0 0 18 18">${svg}</svg></i>`).join('')}</div>
          <div class="panels">
            <div class="pn"><h3>caractere</h3><dl>
              <dt>fonte</dt><dd data-c="family">—</dd><dt>peso</dt><dd data-c="weight">—</dd><dt>largura</dt><dd data-c="stretch">—</dd><dt>corpo</dt><dd data-c="size">—</dd>
              <dt>entrelinha</dt><dd data-c="lh">—</dd><dt>tracking</dt><dd data-c="ls">—</dd></dl></div>
            <div class="pn"><h3>camadas</h3><ol>${LINES.map(({ parts }) => `<li><b>T</b>${esc(parts.filter((x) => typeof x === 'string').join('').replace(/\s+/g, ' ').trim())}</li>`).join('')}</ol></div>
          </div>
        </div>
        <div class="cur" data-m="arrow">${ICONS}</div>
        <div class="ball"></div>
      </div>`

    const q = (s) => host.querySelector(s)
    const ed = q('.ed')
    const art = q('.art')
    const fg = q('.fg')
    const guide = q('.guide')
    const frame = q('.frame')
    const lns = [...art.querySelectorAll('.ln')]
    const ts = lns.map((l) => l.querySelector('.t'))
    const fgls = [...fg.querySelectorAll('.fgl')]
    const at = (kind) => LINES.findIndex((l) => l.kind === kind)
    const iType = at('type'), iMove = at('move'), iMark = at('mark'), iStrike = at('strike'), iStrip = at('strip'), iGrow = at('grow')
    const caret = fgls[iType].querySelector('.caret')
    const moveBox = fgls[iMove].querySelector('.box')
    const snap = fgls[iMove].querySelector('.snap')
    const tagXY = q('.tag-xy')
    const lasso = q('.lasso')
    const growBox = fgls[iGrow].querySelector('.box')
    const tagScale = q('.tag-scale')
    const marker = ts[iGrow].querySelector('.marker')
    const present = q('.present')
    const cur = q('.cur')
    const ball = q('.ball')
    const tools = Object.fromEntries([...host.querySelectorAll('.tools [data-tool]')].map((el) => [el.dataset.tool, el]))
    const layers = [...q('.pn ol').children]
    const charVals = Object.fromEntries([...host.querySelectorAll('[data-c]')].map((el) => [el.dataset.c, el]))
    const typeUnits = [...ts[iType].querySelectorAll('.lt')]
    const ims = lns.map((ln) => [...ln.querySelectorAll('.im')])

    const gl = mountTextGL(q('.gl'))
    ed.classList.toggle('gl-on', !!gl)
    const grid = mountGridGL(q('.grid-gl')) // sem WebGL, a grade em CSS (.ed-grid) assume
    ed.classList.toggle('grid-on', !!grid)
    const glLines = gl ? LINES.map(() => gl.addLine()) : []
    const st = LINES.map(() => ({ e: 0, foc: 0 })) // estado com inércia de cada linha

    // controles do LAB
    let fx = true
    let dots = false
    const pressed = (sel) => document.querySelector(sel).getAttribute('aria-pressed') === 'true'
    document.querySelectorAll('.panel [data-al], .panel [data-case], .panel [data-fx], .panel [data-grid]').forEach((b) => b.addEventListener('click', () => {
      const key = Object.keys(b.dataset)[0]
      document.querySelectorAll(`.panel [data-${key}]`).forEach((o) => o.setAttribute('aria-pressed', String(o === b)))
      ed.classList.toggle('is-center', pressed('.panel [data-al="center"]'))
      ed.classList.toggle('is-upper', pressed('.panel [data-case="upper"]'))
      fx = pressed('.panel [data-fx="on"]')
      dots = pressed('.panel [data-grid="dots"]')
      if (key === 'al' || key === 'case') dispatchEvent(new Event('lab:relayout'))
    }))

    let vw = 0
    let vh = 0
    let W = 0
    let ax0 = 0
    let gsMax = 1
    let center = false
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
      Object.assign(fgls[i].style, {
        left: `${lns[i].offsetLeft + t.offsetLeft}px`, top: `${lns[i].offsetTop + t.offsetTop}px`,
        width: `${t.offsetWidth}px`, height: `${t.offsetHeight}px`, fontSize: getComputedStyle(lns[i]).fontSize,
      })
    }
    // a textura de uma linha: cada letra no x/y que o DOM mediu
    function drawLine(i) {
      if (!gl) return
      const t = ts[i]
      const units = [...t.querySelectorAll('.lt:not(.im)')]
      const cs = getComputedStyle(units[0])
      const upper = cs.textTransform === 'uppercase'
      const fs = parseFloat(cs.fontSize)
      glLines[i].draw({
        width: t.offsetWidth, height: t.offsetHeight,
        font: canvasFont(cs).font,
        glyphs: units.map((el) => ({ ch: upper ? el.textContent.toUpperCase() : el.textContent, x: el.offsetLeft, top: el.offsetTop, h: el.offsetHeight })),
        pad: { x: PAD.x * fs, y: PAD.y * fs },
        res: Math.min(2, devicePixelRatio || 1),
      })
    }

    function measure(size) {
      ({ vw, vh } = size)
      center = ed.classList.contains('is-center')
      const fs = Math.max(40, Math.min(vw * 0.06, vh * 0.1, 116))
      ed.style.setProperty('--fs', `${fs}px`)
      lns[iGrow].style.setProperty('--gs', 1)
      W = vw * (center ? 0.62 : 0.6)
      ax0 = center ? (vw - W) / 2 : vw * 0.09
      art.style.width = fg.style.width = `${W}px`
      fsBase = lns.map((l) => parseFloat(getComputedStyle(l).fontSize))
      gsMax = Math.min(2.6, (W * 0.98) / ts[iGrow].offsetWidth)
      guide.style.left = `${center ? ax0 + W / 2 : ax0}px`
      snap.style.left = '-64px'
      snap.style.top = '.38em'
      tagXY.style.left = `${ts[iMark].offsetWidth + 18}px`
      tagXY.style.top = '.2em'
      tagScale.style.left = '0px'
      tagScale.style.top = 'calc(100% + 14px)'
      tagXY.textContent = `x ${Math.round(lns[iMark].offsetLeft + ts[iMark].offsetLeft)} · y ${Math.round(lns[iMark].offsetTop + ts[iMark].offsetTop)}`
      lns.forEach((_, i) => { if (i !== iGrow) { placeFg(i); drawLine(i) } })
      // "vivenciando." é desenhada já no tamanho final (o quad só escala)
      lns[iGrow].style.setProperty('--gs', gsMax)
      drawLine(iGrow)
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
    const strikeA = () => { const b = tBox(iStrike); return toScene(b.x - b.h * 0.14, b.y - b.h * 0.04) }
    const strikeB = () => { const b = tBox(iStrike); return toScene(b.x + b.w + b.h * 0.14, b.y + b.h * 1.04) }
    const eraserAt = (u) => { const b = tBox(iStrike); return toScene(b.x + b.w * (ERASER.x0 + ERASER.span * u), b.y + b.h * (ERASER.y + ERASER.amp * Math.sin(u * Math.PI * 4))) }
    const strikeAt = (u) => { const b = tBox(iStrike); return toScene(b.x + b.w * (-0.06 + 1.12 * u), b.y + b.h * 0.47) }
    const growPt = () => { const b = tBox(iGrow); return toScene(b.x + b.w + b.h * 0.1, b.y + b.h * 0.98) }
    const markerAt = (u) => { const b = tBox(iGrow); return toScene(b.x + b.w * (-0.04 + 1.1 * u), b.y + b.h * 0.92) }
    const presentPt = () => {
      const r = present.getBoundingClientRect()
      const e = ed.getBoundingClientRect()
      return [r.left - e.left + r.width * 0.55, r.top - e.top + r.height * 0.6]
    }
    const start = () => [vw * 0.86, vh * 0.78]
    let eraseU = 0
    let drawU = 0
    let markU = 0
    // [de, até, origem, destino, cursor]; origem = destino quando o cursor está preso a algo
    const PATH = [
      [-1, IN[iType], start, caretPt, 'arrow'],
      [IN[iType], P.type[1], caretPt, caretPt, 'text'],
      [P.type[1], P.move.drop[0] - 0.02, caretPt, movePt, 'arrow'],
      [P.move.drop[0] - 0.02, P.move.drop[1], movePt, movePt, 'move'],
      [P.move.drop[1], P.strike.mq[0], movePt, strikeA, 'arrow'],
      [P.strike.mq[0], P.strike.mq[1], strikeA, strikeB, 'arrow'],
      [P.strike.mq[1], P.strike.erase[0], strikeB, () => eraserAt(0), 'arrow'],
      [P.strike.erase[0], P.strike.erase[1], () => eraserAt(eraseU), () => eraserAt(eraseU), 'eraser'],
      [P.strike.erase[1], P.strike.draw[0], () => eraserAt(1), () => strikeAt(0), 'arrow'],
      [P.strike.draw[0], P.strike.draw[1], () => strikeAt(drawU), () => strikeAt(drawU), 'brush'],
      [P.strike.draw[1], P.grow.box[1], () => strikeAt(1), growPt, 'arrow'],
      [P.grow.box[1], P.grow.drag[1], growPt, growPt, 'resize'],
      [P.grow.drag[1], P.marker[0], growPt, () => markerAt(0), 'arrow'],
      [P.marker[0], P.marker[1], () => markerAt(markU), () => markerAt(markU), 'brush'],
      [P.marker[1], P.present.press[0], () => markerAt(1), presentPt, 'arrow'],
      [P.present.press[0], 99, presentPt, presentPt, 'arrow'],
    ]
    // ferramenta acesa no painel
    const toolAt = (p) => (p < IN[iType] ? 'arrow' : p < P.type[1] ? 'text' : p < P.move.drop[0] - 0.02 ? 'arrow'
      : p < P.move.drop[1] ? 'move' : p < P.strike.mq[0] ? 'arrow' : p < P.strike.sel[1] ? 'lasso'
        : p < P.strike.erase[1] ? 'eraser' : p < P.strike.draw[1] ? 'brush' : p < P.grow.box[1] ? 'arrow'
          : p < P.grow.drag[1] ? 'resize' : p < P.marker[1] ? 'brush' : 'arrow')
    const damp = (a, b, tau, dt) => (REDUCE || !dt ? b : lerp(a, b, 1 - Math.exp(-dt / tau)))
    const easeOut3 = (x) => 1 - (1 - x) ** 3

    return {
      length: LENGTH,
      measure,
      update(p, { now, v, shift }) {
        const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0
        lastNow = now
        const live = fx && !REDUCE
        speed = damp(speed, live ? Math.min(1, Math.abs(v) / 40) : 0, 0.18, dt)
        // a grade entra com a troca de seção (a 5 não tem grade): varre em pixels da
        // direita para a esquerda e termina já com a 1ª linha na tela
        const gridIn = ramp(shift, 0.25, 1) * 0.7 + ramp(p, 0, 0.35) * 0.3
        ed.style.setProperty('--grid', easeInOut(ramp(shift, 0.3, 1)))

        // ---- estados da história ----
        const nType = Math.round(ramp(p, ...P.type) * typeUnits.length)
        caret.style.left = nType ? `${typeUnits[nType - 1].offsetLeft + typeUnits[nType - 1].offsetWidth + 2}px` : '0px'
        caret.classList.toggle('on', p >= IN[iType] && p < P.move.show[0])
        const k = easeInOut(ramp(p, ...P.move.drop))
        moveOff = { x: MOVE_FROM.x * W * (1 - k), y: MOVE_FROM.y * ts[iMove].offsetHeight * (1 - k), rot: MOVE_FROM.rot * (1 - k) }
        const mvT = `translate(${moveOff.x}px, ${moveOff.y}px) rotate(${moveOff.rot}deg)`
        ts[iMove].style.transform = mvT
        fgls[iMove].style.transform = mvT
        moveBox.style.opacity = p >= P.move.show[0] ? 1 - ramp(p, ...P.move.boxOut) : 0
        const snapped = k >= 1 && p < P.move.boxOut[1]
        snap.style.opacity = snapped ? 1 : 0
        guide.classList.toggle('flash', snapped)
        const hl = easeInOut(ramp(p, ...P.mark))
        ts[iMark].style.setProperty('--hl', hl)
        tagXY.classList.toggle('on', p >= P.tag)
        const hlStrip = easeInOut(ramp(p, ...P.strip))
        ts[iStrip].style.setProperty('--hl', hlStrip)
        const mq = ramp(p, ...P.strike.mq)
        lasso.style.setProperty('--mq', mq)
        lasso.style.opacity = mq > 0 ? 1 - ramp(p, ...P.strike.selOut) : 0
        ts[iStrike].style.setProperty('--sel', ramp(p, ...P.strike.sel) * (1 - ramp(p, ...P.strike.selOut)))
        eraseU = easeInOut(ramp(p, ...P.strike.erase))
        drawU = easeInOut(ramp(p, ...P.strike.draw))
        fgls[iStrike].style.setProperty('--draw', drawU)
        const gs = lerp(1, gsMax, easeInOut(ramp(p, ...P.grow.drag)))
        if (lns[iGrow].style.getPropertyValue('--gs') !== String(gs)) {
          lns[iGrow].style.setProperty('--gs', gs)
          placeFg(iGrow)
        }
        markU = easeInOut(ramp(p, ...P.marker))
        marker.style.setProperty('--draw', markU)
        const ui = 1 - easeInOut(ramp(p, ...P.present.ui))
        growBox.style.opacity = ramp(p, ...P.grow.box) * ui
        tagScale.textContent = `escala ${Math.round(gs * 100)}%`
        tagScale.classList.toggle('on', p >= P.grow.drag[0])
        ed.style.setProperty('--ui', ui)
        frame.style.opacity = easeInOut(ramp(p, ...P.present.frame))
        present.classList.toggle('press', p >= P.present.press[0] && p < P.present.press[1])
        const reed = live ? Math.sin(Math.PI * ramp(p, ...P.present.reed)) * REED : 0
        const tool = toolAt(p)
        if (tool !== toolOn) {
          tools[toolOn]?.classList.remove('on')
          tools[tool]?.classList.add('on')
          toolOn = tool
        }

        // ---- câmera (alvo pelo scroll, posição com inércia) ----
        let fy = focusY(0)
        for (let i = 1; i < LINES.length; i++) if (p >= IN[i]) fy = lerp(focusY(i - 1), focusY(i), easeInOut(ramp(p, IN[i], IN[i] + PAN)))
        const lastB = tBox(LINES.length - 1)
        const artH = lastB.y + lastB.h
        const fitS = Math.min(1, (vh * FIT) / artH)
        const fit = easeInOut(ramp(p, ...P.present.fit))
        // no fim, o cartaz fica no meio do espaço entre os fios da moldura
        const frameMid = (frame.offsetTop + frame.offsetTop + frame.offsetHeight) / 2
        const target = {
          s: lerp(1, fitS, fit),
          ax: lerp(ax0, center ? (vw - W * fitS) / 2 : ax0, fit),
          ay: lerp(vh * FOCUS - fy, frameMid - (artH * fitS) / 2, fit),
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
          const eT = i === iType ? ramp(p, P.type[0] - 0.03, P.type[1])
            : i === iMove ? ramp(p, ...P.move.show)
              : ramp(p, IN[i], IN[i] + ENTER)
          s.e = damp(s.e, eT, TAU.line, dt)
          s.foc = damp(s.foc, live && i < fi && fit < 1 ? 1 - fit : 0, TAU.focus, dt)
          const kk = 1 - easeOut3(clamp01(s.e))
          const b = tBox(i)
          const fsl = fsOf(i, gs)

          // imagens (no DOM): sobem e saem do desfoque junto com a linha (e borram no vidro)
          ims[i].forEach((el) => {
            const shown = i !== iType || typeUnits.indexOf(el) < nType
            const e = shown ? s.e : 0
            const ki = 1 - easeOut3(clamp01(e))
            const bl = Math.max(ki * 10, reed * 6)
            const css = live
              ? `${clamp01(e * 2).toFixed(3)}|translateY(${(ki * 0.6).toFixed(3)}em)|${bl > 0.1 ? `blur(${bl.toFixed(1)}px)` : 'none'}`
              : `${clamp01(e * 2).toFixed(3)}|none|none`
            if (css !== el.dataset.css) {
              const [o, tr, fl] = css.split('|')
              Object.assign(el.style, { opacity: o, transform: tr === 'none' ? '' : tr, filter: fl === 'none' ? '' : fl })
              el.dataset.css = css
            }
          })

          if (!gl) {
            lns[i].style.opacity = clamp01(s.e * 2)
            continue
          }
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
          u.uFx.value = live ? 1 : 0
          u.uType.value = i === iType ? 1 : 0
          u.uStag.value = FX.stagger
          u.uRise.value = (b.h * FX.rise) / qh
          u.uBoxBot.value = (py - 0.2 * fsl) / qh // a máscara fica um pouco abaixo, para não cortar as descendentes
          u.uWave.value = FX.wave
          u.uBlurMax.value = FX.blur
          u.uTrail.value = (b.h * FX.trail) / qh
          u.uRgbMax.value = FX.rgb
          u.uAlpha.value = 1 - s.foc * DEFOCUS.dim
          u.uBend.value = live ? kk * FX.bend + speed * SPEED.bend : 0
          u.uRGB.value = live ? speed * SPEED.rgb : 0
          u.uMotion.value = live ? Math.min(30, Math.abs(vy) * SPEED.motion) : 0
          u.uDefocus.value = live ? s.foc * DEFOCUS.blur : 0
          u.uGrain.value = live ? FX.grain : 0
          u.uReed.value = reed
          u.uWorn.value = i === iGrow && fx ? ramp(p, ...P.present.worn) * WORN : 0
          u.uHalftone.value = i === iStrike ? (fx ? ramp(p, ...P.strike.dots) * HALFTONE : 0) : 0
          if (i === iStrike && !fx) u.uAlpha.value *= 1 - 0.6 * ramp(p, ...P.strike.dots)
          // borracha: o traço em px do quad (y medido de baixo, como no shader)
          if (i === iStrike) {
            u.uErase.value = eraseU
            u.uEA.value.set((px + b.w * ERASER.x0) * view.s, b.w * ERASER.span * view.s, h - (py + b.h * ERASER.y) * view.s, b.h * ERASER.amp * view.s)
            u.uEraseR.value = b.h * ERASER.r * view.s
          }
          // faixas de papel ("exatamente assim.", "Você está"): as letras cobertas viram tinta
          const inv = i === iMark ? hl : i === iStrip ? hlStrip : -1
          u.uInvX.value = inv >= 0 ? (px + (-0.1 * fsl + inv * (b.w + 0.2 * fsl))) / (b.w + px * 2) : -1
          // "foi escrita": só o que já foi digitado (depois, a ponta avança para as últimas letras assentarem)
          u.uRevealX.value = i === iType
            ? (nType ? (px + typeUnits[nType - 1].offsetLeft + typeUnits[nType - 1].offsetWidth) / (b.w + px * 2) + ramp(p, P.type[1] - 0.02, P.type[1] + 0.08) * 0.25 : -1)
            : 2
          // a bola incha o texto por baixo
          if (mouse && ballA > 0.01 && live) {
            u.uMouse.value.set(mouse[0] - left, top + h - mouse[1], ballA * BALL.strength)
            u.uMouseR.value = BALL.r
          } else u.uMouse.value.z = 0
        }
        gl?.render(now / 1000)
        grid?.render(now / 1000, REDUCE ? 1 : easeInOut(gridIn), ui, dots)

        // ---- cursor do editor (alvo pelo trajeto, posição com inércia) ----
        const seg = PATH.findLast((sg) => p >= sg[0]) ?? PATH[0]
        const a0 = seg[2]()
        const b0 = seg[3]()
        const uu = easeInOut(ramp(p, seg[0], seg[1]))
        const cTarget = [lerp(a0[0], b0[0], uu), lerp(a0[1], b0[1], uu)]
        curPos = curPos ? [damp(curPos[0], cTarget[0], TAU.cur, dt), damp(curPos[1], cTarget[1], TAU.cur, dt)] : cTarget
        cur.dataset.m = seg[4]
        if (seg[4] === 'eraser') cur.style.setProperty('--r', `${tBox(iStrike).h * ERASER.r * view.s}px`)
        cur.style.transform = `translate3d(${curPos[0]}px, ${curPos[1]}px, 0)`
        cur.style.opacity = ui

        // ---- painéis ----
        layers.forEach((li, i) => { li.classList.toggle('made', p >= IN[i]); li.classList.toggle('on', i === fi) })
        const cs = getComputedStyle(ts[Math.max(0, fi)].querySelector('.lt:not(.im)'))
        const size = parseFloat(cs.fontSize)
        charVals.family.textContent = cs.fontFamily.split(',')[0].replace(/['"]/g, '')
        charVals.weight.textContent = cs.fontStyle === 'italic' ? `${cs.fontWeight} itálico` : cs.fontWeight
        charVals.stretch.textContent = cs.fontStretch
        charVals.size.textContent = `${Math.round(size)} px`
        charVals.lh.textContent = (0.95).toFixed(2)
        charVals.ls.textContent = Math.round((parseFloat(cs.letterSpacing) / size) * 1000)

        return p < IN[iMark] ? 'escrita e posicionada' : p < IN[iStrike] + 0.18 ? 'exatamente assim' : p < IN[iGrow] ? 'não está lendo' : ui > 0 ? 'vivenciando' : 'apresentar'
      },
    }
  },
})
