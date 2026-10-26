// LAB — seção 6, v8: a v7 com o retorno do usuário.
//   · vermelho de volta na interface (caixas, etiquetas, guia, cursor de texto);
//   · grade: as linhas se formam tracejadas e tortas (sem células) — v8/gl.js;
//   · fotos de placeholder nas frases: v8/img/linha.jpg, escrita.jpg, nosso.jpg
//     (para trocar, substitua o arquivo com o mesmo nome); em dither ou em cor;
//   · elementos das refs.: órbitas cruzadas com estrela de 4 pontas (ref. 1),
//     cubos 3D em ASCII com uma face vermelha (ref. 2, v8/asciiCube.js),
//     layout disperso (ref. 2), fonte quadrada e degradê cinza (ref. 1).
//   Cada um tem botão no painel do LAB, para comparar ligado/desligado.
// O resto é a v7: digitação em tempo real, "lendo" riscada e oca, onda de choque
// no "apresentar", só o texto no fim.
import { mountLab, ramp, easeInOut, lerp, clamp01, strikeSvg, esc, REDUCE, FINE } from '../base.js'
import { mountTextGL, mountGridGL, canvasFont, placeholderImage } from './gl.js'
import { mountAsciiCube } from './asciiCube.js'
// fotos das frases (placeholders do usuário): troque o arquivo em v8/img mantendo o nome
import linhaImg from './img/linha.jpg'
import escritaImg from './img/escrita.jpg'
import nossoImg from './img/nosso.jpg'

// imagens entre as palavras (sem src = placeholder abstrato)
const IMG = {
  line: { src: linhaImg, seed: 1 },
  write: { src: escritaImg, seed: 2 },
  ours: { src: nossoImg, seed: 4 },
}
const LINES = [
  { parts: ['Cada ', IMG.line, ' linha'] },
  { parts: ['foi escrita ', IMG.write], kind: 'type' },
  { parts: ['e posicionada'], kind: 'move' },
  { parts: ['exatamente assim.'], kind: 'mark' },
  { parts: ['Você não está'] },
  { parts: ['lendo'], kind: 'strike' },
  { parts: ['sobre o ', IMG.ours, ' nosso'] },
  { parts: ['trabalho.'], kind: 'wide' },
  { parts: ['Você está'], kind: 'stair' },
  { parts: ['vivenciando.'], kind: 'grow' },
]
const SENTENCE = 'Cada linha foi escrita e posicionada exatamente assim. Você não está lendo sobre o nosso trabalho. Você está vivenciando.'
const IN = [0, 0.2, 0.62, 1.18, 1.5, 1.66, 2.16, 2.3, 2.46, 2.62]
const ENTER = 0.24 // quanto scroll a linha leva para assentar
const P = {
  move: { show: [0.62, 0.74], drop: [0.84, 1.06], boxOut: [1.08, 1.18] },
  mark: [1.22, 1.4], tag: 1.38,
  strike: { draw: [1.82, 1.98], hollow: [1.92, 2.06] },
  grow: { box: [2.7, 2.78], drag: [2.86, 3.14] },
  marker: [3.16, 3.32],
  present: { press: [3.4, 3.46], ui: [3.44, 3.62], fit: [3.48, 3.86] },
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
// digitação (ms): intervalo base + variação, pausa depois de espaço, respiro antes da imagem
const TYPE = { first: 140, base: 72, jitter: 58, space: 120, image: 240 }
// onda de choque do "apresentar" (tempo real): velocidade (px/s), força inicial (px) e quanto dura (s)
const SHOCK = { speed: 1500, amp: 28, life: 1.4 }
const FIT = 0.74 // o cartaz final ocupa esta fração da altura

// estrela de 4 pontas (ref. 1; o desenho do "brilho" do kit MYT), em -100..100
const STAR = 'M0 -100C14 -14 14 -14 100 0C14 14 14 14 0 100C-14 14 -14 14 -100 0C-14 -14 -14 -14 0 -100Z'
// elementos: onde ficam (em em, relativos à linha de referência) e tamanho (em)
const DECO = {
  orbit: { line: 0, dx: 1.2, dy: -0.1, w: 4.2, h: 2.5 }, // à direita de "Cada linha", atrás do texto
  cubeA: { line: 7, dx: 0.4, dy: -0.75, size: 2.6 }, // ao lado de "trabalho.", por cima
  cubeB: { line: 5, dx: 0.9, dy: -0.45, size: 1.9 }, // ao lado de "lendo"
  spark: { line: 9, dx: -0.1, dy: -0.35, size: 0.55 }, // no alto do fim de "vivenciando."
}
// layout disperso (ref. 2): recuo de cada linha, em em (limitado à largura da prancheta)
const SCATTER = [0, 2.4, 0.9, 1.7, 0.2, 3.2, 1.2, 2.8, 0.6, 0]
const HANDLES = '<i></i>'.repeat(6)
const unitHtml = (part) => (typeof part === 'string'
  ? [...part].map((c) => `<span class="lt">${esc(c)}</span>`).join('')
  : `<span class="lt im" data-img="${Object.values(IMG).indexOf(part)}"></span>`)
const T_CLS = { mark: 'mark', strike: 'hollow-w', grow: 'it has-marker' }
const LN_CLS = { grow: 'ln--grow', wide: 'ln--wide', stair: 'ln--stair' }
const lineHtml = ({ parts, kind }) => `<p class="ln ${LN_CLS[kind] ?? ''}"><span class="t ${T_CLS[kind] ?? ''}">${parts.map(unitHtml).join('')}${kind === 'grow' ? `<span class="marker">${strikeSvg()}</span>` : ''}</span></p>`
const FG = {
  type: '<span class="caret"></span>',
  move: `<span class="box">${HANDLES}</span><span class="snap">← 0 px</span>`,
  mark: '<span class="tag tag-xy"></span>',
  strike: strikeSvg(),
  grow: `<span class="box">${HANDLES}</span><span class="tag tag-scale"></span>`,
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
  ['brush', '<path d="M14 2 7 10M5 11c-2 1-2 3-3 5 2-.5 4-1 5-3Z"/>'],
  ['resize', '<path d="M3 3h5M3 3v5M3 3l12 12M15 15h-5M15 15v-5"/>'],
]

mountLab({
  title: 'LAB — Seção 6 · v8',
  links: [['../v7/', 'v7'], ['./', 'v8', true]],
  controls: '<span class="seg"><button type="button" data-al="left" aria-pressed="true">esquerda</button><button type="button" data-al="center" aria-pressed="false">centro</button><button type="button" data-al="scatter" aria-pressed="false">disperso</button></span>'
    + '<span class="seg"><button type="button" data-case="normal" aria-pressed="true">Aa</button><button type="button" data-case="upper" aria-pressed="false">AA</button></span>'
    + '<span class="seg"><button type="button" data-fx="on" aria-pressed="true">efeitos</button><button type="button" data-fx="off" aria-pressed="false">sem</button></span>'
    + '<span class="seg"><button type="button" data-grid="lines" aria-pressed="true">linhas</button><button type="button" data-grid="dots" aria-pressed="false">pontos</button></span>'
    + '<span class="seg"><button type="button" data-font="archivo" aria-pressed="true">Archivo</button><button type="button" data-font="tech" aria-pressed="false">Chakra</button></span>'
    + '<span class="seg"><button type="button" data-color="paper" aria-pressed="true">papel</button><button type="button" data-color="grad" aria-pressed="false">degradê</button></span>'
    + '<span class="seg"><button type="button" data-photo="dither" aria-pressed="true">fotos dither</button><button type="button" data-photo="color" aria-pressed="false">cor</button></span>'
    + '<span class="seg"><button type="button" data-deco="on" aria-pressed="true">elementos</button><button type="button" data-deco="off" aria-pressed="false">sem</button></span>',
  scene(host) {
    host.innerHTML = `
      <h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${esc(SENTENCE)}</h2>
      <div class="ed" aria-hidden="true">
        <canvas class="grid-gl"></canvas><div class="ed-grid g-soft"></div><div class="ed-grid g-sharp"></div>
        <div class="chrome"><div class="guide"></div></div>
        <div class="art-clip">
          <div class="art">${LINES.map(lineHtml).join('')}
            <svg class="deco orbit" viewBox="-100 -60 200 120"><ellipse rx="96" ry="26" transform="rotate(-28)"/><ellipse rx="96" ry="26" transform="rotate(28)"/><path class="star" d="${STAR}" transform="scale(.22)"/></svg>
          </div>
          <canvas class="gl"></canvas>
          <div class="art fg">${LINES.map(({ kind }) => `<div class="fgl">${FG[kind] ?? ''}</div>`).join('')}
            <canvas class="deco cube cube-a"></canvas><canvas class="deco cube cube-b"></canvas>
            <svg class="deco orbit spark" viewBox="-12 -12 24 24"><path class="star" d="${STAR}" transform="scale(.11)"/></svg>
          </div>
        </div>
        <div class="chrome">
          <div class="bar"><span class="sp"></span>
            <span class="present"><svg viewBox="0 0 8 9"><path d="M0 0 8 4.5 0 9Z"/></svg>apresentar</span></div>
          <div class="tools">${TOOLS.map(([name, svg]) => `<i data-tool="${name}"><svg viewBox="0 0 18 18">${svg}</svg></i>`).join('')}</div>
        </div>
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
    const marker = ts[iGrow].querySelector('.marker')
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

    // digitação: o roteiro dos instantes (ms) de cada tecla, com ritmo humano (fixo: semente)
    let seed = 7
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
    let acc = TYPE.first
    const typeAt = typeUnits.map((el, i) => {
      if (i > 0) acc += TYPE.base + rnd() * TYPE.jitter + (typeUnits[i - 1].textContent === ' ' ? TYPE.space : 0) + (el.classList.contains('im') ? TYPE.image : 0)
      return acc
    })
    let typeT0 = null

    // controles do LAB
    let fx = true
    let dots = false
    let grad = false
    let photoColor = false
    const pressed = (sel) => document.querySelector(sel).getAttribute('aria-pressed') === 'true'
    const KEYS = ['al', 'case', 'fx', 'grid', 'font', 'color', 'photo', 'deco']
    document.querySelectorAll(KEYS.map((k) => `.panel [data-${k}]`).join(', ')).forEach((b) => b.addEventListener('click', async () => {
      const key = Object.keys(b.dataset)[0]
      document.querySelectorAll(`.panel [data-${key}]`).forEach((o) => o.setAttribute('aria-pressed', String(o === b)))
      ed.classList.toggle('is-center', pressed('.panel [data-al="center"]'))
      ed.classList.toggle('is-scatter', pressed('.panel [data-al="scatter"]'))
      ed.classList.toggle('is-upper', pressed('.panel [data-case="upper"]'))
      ed.classList.toggle('is-tech', pressed('.panel [data-font="tech"]'))
      ed.classList.toggle('no-deco', pressed('.panel [data-deco="off"]'))
      fx = pressed('.panel [data-fx="on"]')
      dots = pressed('.panel [data-grid="dots"]')
      grad = pressed('.panel [data-color="grad"]')
      photoColor = pressed('.panel [data-photo="color"]')
      // a textura das letras precisa da fonte carregada antes de redesenhar
      if (key === 'font') await Promise.all(['600 64px "Chakra Petch"', 'italic 700 64px "Chakra Petch"'].map((f) => document.fonts.load(f)))
      if (['al', 'case', 'font'].includes(key)) dispatchEvent(new Event('lab:relayout'))
    }))

    // elementos das refs.: órbitas e estrelas (svg) e os cubos ASCII
    const orbit = q('.art > .orbit')
    const spark = q('.spark')
    const cubes = [['cubeA', q('.cube-a'), [0, 3]], ['cubeB', q('.cube-b'), [1, 4]]].map(([name, el, accent]) => ({ name, el, cube: mountAsciiCube(el, { accent }) }))
    const decoPos = {}

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
    let shockT0 = null

    const fsOf = (i, gs = 1) => fsBase[i] * (i === iGrow ? gs : 1)
    const placeFg = (i) => {
      const t = ts[i]
      Object.assign(fgls[i].style, {
        left: `${lns[i].offsetLeft + t.offsetLeft}px`, top: `${lns[i].offsetTop + t.offsetTop}px`,
        width: `${t.offsetWidth}px`, height: `${t.offsetHeight}px`, fontSize: getComputedStyle(lns[i]).fontSize,
      })
    }
    // a textura de uma linha: cada letra e cada cápsula no x/y que o DOM mediu
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
        images: [...t.querySelectorAll('.im')].map((el) => ({ x: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, src: imgSlots[+el.dataset.img].src })),
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
      // disperso: cada linha recua o seu tanto (sem passar da largura da prancheta)
      const scatter = ed.classList.contains('is-scatter')
      ts.forEach((t, i) => { t.style.marginLeft = '0px' })
      if (scatter) ts.forEach((t, i) => { if (i !== iGrow) t.style.marginLeft = `${Math.max(0, Math.min(SCATTER[i] * fs, W - t.offsetWidth - 4))}px` })
      fsBase = lns.map((l) => parseFloat(getComputedStyle(l).fontSize))
      gsMax = Math.min(2.6, (W * 0.98) / ts[iGrow].offsetWidth)
      // a guia marca onde "e posicionada" encaixa
      guide.style.left = `${center ? ax0 + W / 2 : ax0 + (scatter ? ts[iMove].offsetLeft : 0)}px`
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
      // elementos: posição relativa à linha de referência (em px da prancheta)
      for (const [name, d] of Object.entries(DECO)) {
        const ln = lns[d.line]
        const t = ts[d.line]
        const lfs = parseFloat(getComputedStyle(ln).fontSize)
        const right = ln.offsetLeft + t.offsetLeft + t.offsetWidth
        const w = (d.w ?? d.size) * lfs
        const h = (d.h ?? d.size) * lfs
        decoPos[name] = { x: right + d.dx * lfs, y: ln.offsetTop + t.offsetTop + d.dy * lfs, w, h }
      }
      Object.assign(orbit.style, { width: `${decoPos.orbit.w}px`, height: `${decoPos.orbit.h}px` })
      Object.assign(spark.style, { width: `${decoPos.spark.w}px`, height: `${decoPos.spark.h}px` })
      cubes.forEach((c) => c.cube.resize(decoPos[c.name].w))
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
    const strikeAt = (u) => { const b = tBox(iStrike); return toScene(b.x + b.w * (-0.06 + 1.12 * u), b.y + b.h * 0.47) }
    const growPt = () => { const b = tBox(iGrow); return toScene(b.x + b.w + b.h * 0.1, b.y + b.h * 0.98) }
    const markerAt = (u) => { const b = tBox(iGrow); return toScene(b.x + b.w * (-0.04 + 1.1 * u), b.y + b.h * 0.92) }
    const presentAt = (fx_ = 0.55, fy_ = 0.6) => {
      const r = present.getBoundingClientRect()
      const e = ed.getBoundingClientRect()
      return [r.left - e.left + r.width * fx_, r.top - e.top + r.height * fy_]
    }
    const start = () => [vw * 0.86, vh * 0.78]
    let drawU = 0
    let markU = 0
    // [de, até, origem, destino, cursor]; origem = destino quando o cursor está preso a algo
    const PATH = [
      [-1, IN[iType], start, caretPt, 'arrow'],
      [IN[iType], P.move.show[0] - 0.04, caretPt, caretPt, 'text'],
      [P.move.show[0] - 0.04, P.move.drop[0] - 0.02, caretPt, movePt, 'arrow'],
      [P.move.drop[0] - 0.02, P.move.drop[1], movePt, movePt, 'move'],
      [P.move.drop[1], P.strike.draw[0], movePt, () => strikeAt(0), 'arrow'],
      [P.strike.draw[0], P.strike.draw[1], () => strikeAt(drawU), () => strikeAt(drawU), 'brush'],
      [P.strike.draw[1], P.grow.box[1], () => strikeAt(1), growPt, 'arrow'],
      [P.grow.box[1], P.grow.drag[1], growPt, growPt, 'resize'],
      [P.grow.drag[1], P.marker[0], growPt, () => markerAt(0), 'arrow'],
      [P.marker[0], P.marker[1], () => markerAt(markU), () => markerAt(markU), 'brush'],
      [P.marker[1], P.present.press[0], () => markerAt(1), () => presentAt(), 'arrow'],
      [P.present.press[0], 99, () => presentAt(), () => presentAt(), 'arrow'],
    ]
    // ferramenta acesa no painel
    const toolAt = (p) => (p < IN[iType] ? 'arrow' : p < P.move.show[0] - 0.04 ? 'text' : p < P.move.drop[0] - 0.02 ? 'arrow'
      : p < P.move.drop[1] ? 'move' : p < P.strike.draw[0] ? 'arrow' : p < P.strike.draw[1] ? 'brush'
        : p < P.grow.box[1] ? 'arrow' : p < P.grow.drag[1] ? 'resize' : p < P.marker[1] ? 'brush' : 'arrow')
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

        // ---- digitação (tempo real, disparada quando a linha entra; subir apaga) ----
        if (p >= IN[iType] && typeT0 === null) typeT0 = now
        if (p < IN[iType] - 0.02) typeT0 = null
        const typed = typeT0 === null ? 0 : REDUCE ? typeUnits.length : typeAt.filter((t) => t <= now - typeT0).length
        const typing = typed > 0 && typed < typeUnits.length
        const last = typeUnits[typed - 1]
        caret.style.left = typed ? `${last.offsetLeft + last.offsetWidth + 2}px` : '0px'
        caret.classList.toggle('on', p >= IN[iType] && p < P.move.show[0])
        caret.classList.toggle('typing', typing) // digitando: cursor de texto fixo; parado: pisca

        // ---- estados da história ----
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
        drawU = easeInOut(ramp(p, ...P.strike.draw))
        fgls[iStrike].style.setProperty('--draw', drawU)
        const hollow = easeInOut(ramp(p, ...P.strike.hollow))
        ts[iStrike].classList.toggle('is-hollow', hollow > 0.5) // (sem WebGL)
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
        present.classList.toggle('press', p >= P.present.press[0] && p < P.present.press[1])
        const tool = toolAt(p)
        if (tool !== toolOn) {
          tools[toolOn]?.classList.remove('on')
          tools[tool]?.classList.add('on')
          toolOn = tool
        }

        // ---- onda de choque: o clique em "apresentar" a dispara (tempo real; subir rearma) ----
        if (p >= P.present.press[0] && shockT0 === null) shockT0 = now
        if (p < P.present.press[0] - 0.02) shockT0 = null
        let shock = null
        if (live && shockT0 !== null) {
          const age = (now - shockT0) / 1000
          if (age < SHOCK.life) {
            const [cx, cy] = presentAt(0.5, 0.5)
            shock = [cx, cy, age * SHOCK.speed, SHOCK.amp * (1 - age / SHOCK.life) ** 1.5]
          }
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
          ax: lerp(ax0, center ? (vw - W * fitS) / 2 : ax0, fit),
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
          u.uImgMode.value = photoColor ? 1 : 0
          u.uGrad.value = grad ? 1 : 0
          u.uBoxTop.value = 1 - py / qh
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

        // ---- elementos: entram com a linha deles; órbita e estrela giram devagar, cubos giram com o scroll ----
        const tt = REDUCE ? 0 : now / 1000
        const appear = (e) => easeOut3(clamp01(e))
        const ao = appear(st[DECO.orbit.line].e)
        const o = decoPos.orbit
        orbit.style.opacity = ao
        orbit.style.transform = `translate(${o.x}px, ${o.y}px) rotate(${(tt * 4 + p * 30).toFixed(2)}deg) scale(${(0.6 + 0.4 * ao).toFixed(3)})`
        for (const c of cubes) {
          const d = decoPos[c.name]
          const a = appear(st[DECO[c.name].line].e)
          c.el.style.opacity = a
          c.el.style.transform = `translate(${d.x}px, ${d.y}px) scale(${(0.5 + 0.5 * a).toFixed(3)})`
          if (a > 0.01) c.cube.draw(0.55 + p * 1.4 + tt * 0.2, 0.75 + p * 2.2 + tt * 0.32 + (c.name === 'cubeB' ? 1.3 : 0))
        }
        const gb = tBox(iGrow)
        const as = appear(markU * 1.2)
        spark.style.opacity = as
        spark.style.transform = `translate(${gb.x + gb.w + DECO.spark.dx * fsOf(iGrow, gs)}px, ${gb.y + DECO.spark.dy * fsOf(iGrow, gs)}px) rotate(${(tt * 20).toFixed(1)}deg) scale(${as.toFixed(3)})`
        grid?.render(now / 1000, REDUCE ? 1 : easeInOut(gridIn), ui, dots, shock)

        // ---- cursor do editor (alvo pelo trajeto, posição com inércia) ----
        const seg = PATH.findLast((sg) => p >= sg[0]) ?? PATH[0]
        const a0 = seg[2]()
        const b0 = seg[3]()
        const uu = easeInOut(ramp(p, seg[0], seg[1]))
        const cTarget = [lerp(a0[0], b0[0], uu), lerp(a0[1], b0[1], uu)]
        curPos = curPos ? [damp(curPos[0], cTarget[0], TAU.cur, dt), damp(curPos[1], cTarget[1], TAU.cur, dt)] : cTarget
        cur.dataset.m = seg[4]
        cur.style.transform = `translate3d(${curPos[0]}px, ${curPos[1]}px, 0)`
        cur.style.opacity = ui

        return p < IN[iMark] ? 'escrita e posicionada' : p < IN[iStrike] + 0.18 ? 'exatamente assim' : p < IN[iGrow] ? 'não está lendo' : ui > 0 ? 'vivenciando' : 'apresentar'
      },
    }
  },
})
