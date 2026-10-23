// LAB — seção 6, v3: "O editor". As três linhas empilhadas em corpo grande,
// numa prancheta clara; a interface de um editor (guia, caixa com alças,
// cursor, painéis) faz o que cada linha diz, e no fim o cursor clica em
// "apresentar": a interface some e fica a composição inteira.
// Tudo é função do scroll (alturas de tela depois do deslocamento lateral);
// os valores mostrados (coordenada, escala, painel de caractere) são os reais
// do layout. A câmera desce acompanhando a linha da vez.
import { mountLab, ramp, easeInOut, lerp, strikeSvg, esc } from '../base.js'

const LINES = [
  { text: 'Cada linha' },
  { text: 'foi escrita', kind: 'type' },
  { text: 'e posicionada', kind: 'move' },
  { text: 'exatamente assim.', kind: 'mark' },
  { text: 'Você não está' },
  { text: 'lendo', kind: 'strike' },
  { text: 'sobre o nosso' },
  { text: 'trabalho.' },
  { text: 'Você está' },
  { text: 'vivenciando.', kind: 'grow' },
]
const SENTENCE = 'Cada linha foi escrita e posicionada exatamente assim. Você não está lendo sobre o nosso trabalho. Você está vivenciando.'
// quando cada linha entra (alturas de tela) e quanto dura a entrada
const IN = [0, 0.2, 0.62, 1.18, 1.5, 1.66, 2.12, 2.26, 2.42, 2.56]
const ENTER = 0.18
const P = {
  type: [0.22, 0.58],
  move: { show: [0.62, 0.72], drop: [0.84, 1.06], boxOut: [1.08, 1.18] },
  mark: [1.22, 1.4], tag: 1.38,
  strike: { mq: [1.74, 1.86], sel: [1.88, 1.98], draw: [1.98, 2.1], selOut: [2.1, 2.18] },
  grow: { box: [2.62, 2.7], drag: [2.8, 3.12] },
  present: { press: [3.36, 3.42], ui: [3.4, 3.58], fit: [3.44, 3.82] },
}
const LENGTH = 4.0
const FOCUS = 0.56 // a linha da vez fica nesta altura da tela
const PAN = 0.26 // quanto scroll a câmera leva para passar de uma linha à outra
const MOVE_FROM = { x: 0.24, y: 0.6, rot: 5 } // "e posicionada" chega fora do lugar (x em larguras da prancheta, y em linhas)

const HANDLES = '<i></i>'.repeat(6)
function lineHtml({ text, kind }, i) {
  const t = esc(text)
  if (kind === 'type') return `<p class="ln" data-i="${i}"><span class="t">${[...text].map((c) => `<span class="ch">${esc(c)}</span>`).join('')}<span class="caret"></span></span></p>`
  if (kind === 'move') return `<p class="ln" data-i="${i}"><span class="t">${t}<span class="box box--red">${HANDLES}</span></span><span class="snap">← 0 px</span></p>`
  if (kind === 'mark') return `<p class="ln in-mask" data-i="${i}"><span class="t mark" data-text="${t}">${t}</span><span class="tag tag-xy"></span></p>`
  if (kind === 'strike') return `<p class="ln in-mask" data-i="${i}"><span class="t sel strike-w">${t}${strikeSvg()}<span class="lasso"></span></span></p>`
  if (kind === 'grow') return `<p class="ln ln--grow in-mask" data-i="${i}"><span class="t it">${t}<span class="box">${HANDLES}</span></span><span class="tag tag-scale"></span></p>`
  return `<p class="ln in-mask" data-i="${i}"><span class="t">${t}</span></p>`
}
const ICONS = '<svg class="c-arrow" viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.3 3.2 6.8 2.6-1.2-3.2-6.7H14Z"/></svg>'
  + '<svg class="c-move" viewBox="0 0 14 14"><path d="M7 0v14M0 7h14M7 0 5 2M7 0l2 2M7 14l-2-2M7 14l2-2M0 7l2-2M0 7l2 2M14 7l-2-2M14 7l-2 2"/></svg>'
  + '<svg class="c-text" viewBox="0 0 10 22"><path d="M1 1h8M1 21h8M5 1v20"/></svg>'
  + '<svg class="c-resize" viewBox="0 0 16 22"><path d="M2 2h6L6 4l8 8 2-2v6h-6l2-2-8-8-2 2Z"/></svg>'

mountLab({
  title: 'LAB — Seção 6 · v3 O editor',
  links: [['../', 'v1 · wrapped'], ['../v2/', 'v2 · a pauta'], ['./', 'v3 · o editor', true], ['../v4/', 'v4 · editor escuro']],
  controls: '<span class="seg"><button type="button" data-al="left" aria-pressed="true">esquerda</button><button type="button" data-al="center" aria-pressed="false">centro</button></span>'
    + '<span class="seg"><button type="button" data-case="normal" aria-pressed="true">Aa</button><button type="button" data-case="upper" aria-pressed="false">AA</button></span>',
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
            <div class="pn"><h3>camadas</h3><ol>${LINES.map(({ text }) => `<li><b>T</b>${esc(text)}</li>`).join('')}</ol></div>
          </div>
        </div>
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
    const chars = [...lns[iType].querySelectorAll('.ch')]
    const caret = lns[iType].querySelector('.caret')
    const moveBox = lns[iMove].querySelector('.box')
    const snap = lns[iMove].querySelector('.snap')
    const tagXY = q('.tag-xy')
    const marquee = q('.lasso')
    const growBox = lns[iGrow].querySelector('.box')
    const tagScale = q('.tag-scale')
    const present = q('.present')
    const cur = q('.cur')
    const layers = [...q('.pn ol').children]
    const charVals = Object.fromEntries([...host.querySelectorAll('[data-c]')].map((el) => [el.dataset.c, el]))

    // controles do LAB: alinhamento e caixa
    document.querySelectorAll('.panel [data-al], .panel [data-case]').forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.al ? 'al' : 'case'
      document.querySelectorAll(`.panel [data-${key}]`).forEach((o) => o.setAttribute('aria-pressed', String(o === b)))
      ed.classList.toggle('is-center', document.querySelector('.panel [data-al="center"]').getAttribute('aria-pressed') === 'true')
      ed.classList.toggle('is-upper', document.querySelector('.panel [data-case="upper"]').getAttribute('aria-pressed') === 'true')
      dispatchEvent(new Event('lab:relayout'))
    }))

    let vw = 0
    let vh = 0
    let W = 0 // largura da prancheta
    let ax0 = 0 // onde a prancheta começa (x)
    let gsMax = 1
    let center = false
    let view = { ax: 0, ay: 0, s: 1 }
    let moveOff = { x: 0, y: 0 }

    function measure(size) {
      ({ vw, vh } = size)
      center = ed.classList.contains('is-center')
      const fs = Math.max(40, Math.min(vw * 0.062, vh * 0.105, 118))
      ed.style.setProperty('--fs', `${fs}px`)
      ed.style.setProperty('--gs', 1)
      W = vw * (center ? 0.62 : 0.6)
      ax0 = center ? (vw - W) / 2 : vw * 0.09
      art.style.width = `${W}px`
      gsMax = Math.min(2.6, (W * 0.98) / ts[iGrow].offsetWidth)
      // a guia: borda esquerda do texto, ou o eixo no centro
      guide.style.left = `${center ? ax0 + W / 2 : ax0}px`
      snap.style.left = `${ts[iMove].offsetLeft - 64}px`
      snap.style.top = '.38em'
      for (const [el, i, below] of [[tagXY, iMark, false], [tagScale, iGrow, true]]) {
        const t = ts[i]
        el.style.left = below ? `${t.offsetLeft}px` : `${t.offsetLeft + t.offsetWidth + 18}px`
        el.style.top = below ? 'calc(100% + 14px)' : '.2em'
      }
      const t = ts[iMark]
      tagXY.textContent = `x ${Math.round(lns[iMark].offsetLeft + t.offsetLeft)} · y ${Math.round(lns[iMark].offsetTop + t.offsetTop)}`
    }

    // caixa de uma linha na prancheta (layout, sem transforms) e na tela
    const tBox = (i) => {
      const x = lns[i].offsetLeft + ts[i].offsetLeft + (i === iMove ? moveOff.x : 0)
      const y = lns[i].offsetTop + ts[i].offsetTop + (i === iMove ? moveOff.y : 0)
      return { x, y, w: ts[i].offsetWidth, h: ts[i].offsetHeight }
    }
    const toScene = (x, y) => [view.ax + x * view.s, view.ay + y * view.s]
    const focusY = (i) => { const b = tBox(i); return b.y + b.h / 2 }

    // pontos do trajeto do cursor
    const caretPt = () => {
      const b = tBox(iType)
      return toScene(b.x + caret.offsetLeft + 3, b.y + caret.offsetTop + caret.offsetHeight * 0.5)
    }
    const movePt = () => { const b = tBox(iMove); return toScene(b.x + b.w * 0.42, b.y + b.h * 0.55) }
    const strikeA = () => { const b = tBox(iStrike); return toScene(b.x - b.h * 0.14, b.y - b.h * 0.04) }
    const strikeB = (k) => { const b = tBox(iStrike); return toScene(b.x - b.h * 0.14 + (b.w + b.h * 0.28) * k, b.y + b.h * 1.04) }
    const growPt = () => { const b = tBox(iGrow); return toScene(b.x + b.w + b.h * 0.1, b.y + b.h * 0.98) }
    const presentPt = () => {
      const r = present.getBoundingClientRect()
      const e = ed.getBoundingClientRect()
      return [r.left - e.left + r.width * 0.55, r.top - e.top + r.height * 0.6]
    }
    const start = () => [vw * 0.86, vh * 0.78]
    // [de, até, origem, destino, modo]
    const PATH = [
      [-1, IN[iType], start, caretPt, 'arrow'],
      [IN[iType], P.type[1], caretPt, caretPt, 'text'],
      [P.type[1], P.move.drop[0] - 0.02, caretPt, movePt, 'arrow'],
      [P.move.drop[0] - 0.02, P.move.drop[1], movePt, movePt, 'move'],
      [P.move.drop[1], P.strike.mq[0], movePt, strikeA, 'arrow'],
      [P.strike.mq[0], P.strike.mq[1], strikeA, () => strikeB(1), 'arrow'],
      [P.strike.mq[1], P.grow.box[1], () => strikeB(1), growPt, 'arrow'],
      [P.grow.box[1], P.grow.drag[1], growPt, growPt, 'resize'],
      [P.grow.drag[1], P.present.press[0], growPt, presentPt, 'arrow'],
      [P.present.press[0], 99, presentPt, presentPt, 'arrow'],
    ]

    const setPressed = (el, on) => el.classList.toggle('press', on)

    return {
      length: LENGTH,
      measure,
      update(p, { shift }) {
        document.body.classList.toggle('on-paper', shift > 0.55)

        // entradas
        lns.forEach((ln, i) => {
          if (LINES[i].kind === 'type' || LINES[i].kind === 'move') return
          ln.style.setProperty('--in', easeInOut(ramp(p, IN[i], IN[i] + ENTER)))
        })
        // "foi escrita": digitada
        const n = Math.round(ramp(p, ...P.type) * chars.length)
        chars.forEach((c, i) => c.classList.toggle('on', i < n))
        caret.style.left = n ? `${chars[n - 1].offsetLeft + chars[n - 1].offsetWidth + 2}px` : '0px'
        caret.classList.toggle('on', p >= IN[iType] && p < P.move.show[0])
        // "e posicionada": chega fora do lugar e é arrastada até a guia
        const k = easeInOut(ramp(p, ...P.move.drop))
        moveOff = { x: MOVE_FROM.x * W * (1 - k), y: MOVE_FROM.y * ts[iMove].offsetHeight * (1 - k) }
        lns[iMove].style.opacity = ramp(p, ...P.move.show)
        ts[iMove].style.transform = `translate(${moveOff.x}px, ${moveOff.y}px) rotate(${MOVE_FROM.rot * (1 - k)}deg)`
        moveBox.style.opacity = p >= P.move.show[0] ? 1 - ramp(p, ...P.move.boxOut) : 0
        const snapped = k >= 1 && p < P.move.boxOut[1]
        snap.style.opacity = snapped ? 1 : 0
        guide.classList.toggle('flash', snapped)
        // "exatamente assim.": bloco invertido + a coordenada real
        const hl = easeInOut(ramp(p, ...P.mark))
        ts[iMark].style.setProperty('--hl', hl)
        tagXY.classList.toggle('on', p >= P.tag)
        // "lendo": seleção tracejada → seleção vermelha → risco
        const mq = ramp(p, ...P.strike.mq)
        marquee.style.setProperty('--mq', mq)
        marquee.style.opacity = mq > 0 ? 1 - ramp(p, ...P.strike.selOut) : 0
        ts[iStrike].style.setProperty('--sel', ramp(p, ...P.strike.sel) * (1 - ramp(p, ...P.strike.selOut)))
        const dr = ramp(p, ...P.strike.draw)
        ts[iStrike].style.setProperty('--draw', easeInOut(dr))
        ts[iStrike].classList.toggle('is-hollow', dr > 0.6)
        // "vivenciando.": a alça puxa e a palavra cresce
        const gs = lerp(1, gsMax, easeInOut(ramp(p, ...P.grow.drag)))
        lns[iGrow].style.setProperty('--gs', gs)
        growBox.style.opacity = ramp(p, ...P.grow.box) * (1 - ramp(p, ...P.present.ui))
        tagScale.textContent = `escala ${Math.round(gs * 100)}%`
        tagScale.classList.toggle('on', p >= P.grow.drag[0])

        // "apresentar": a interface some e a composição inteira aparece
        const ui = 1 - easeInOut(ramp(p, ...P.present.ui))
        ed.style.setProperty('--ui', ui)
        setPressed(present, p >= P.present.press[0] && p < P.present.press[1])

        // câmera: acompanha a linha da vez; no fim, enquadra tudo
        let fy = focusY(0)
        for (let i = 1; i < LINES.length; i++) if (p >= IN[i]) fy = lerp(focusY(i - 1), focusY(i), easeInOut(ramp(p, IN[i], IN[i] + PAN)))
        const last = tBox(LINES.length - 1)
        const artH = last.y + last.h
        const fitS = Math.min(1, (vh * 0.74) / artH)
        const f = easeInOut(ramp(p, ...P.present.fit))
        view = {
          s: lerp(1, fitS, f),
          ax: lerp(ax0, center ? (vw - W * fitS) / 2 : ax0, f),
          ay: lerp(vh * FOCUS - fy, (vh - artH * fitS) / 2 + 24, f),
        }
        art.style.transform = `translate(${view.ax}px, ${view.ay}px) scale(${view.s})`

        // cursor
        const seg = PATH.findLast((s) => p >= s[0]) ?? PATH[0]
        const [a, b] = [seg[2](), seg[3]()]
        const u = easeInOut(ramp(p, seg[0], seg[1]))
        cur.dataset.m = seg[4]
        cur.style.transform = `translate(${lerp(a[0], b[0], u)}px, ${lerp(a[1], b[1], u)}px)`
        cur.style.opacity = ui

        // painéis: camada da vez e os valores reais do caractere dela
        const fi = IN.findLastIndex((t) => p >= t)
        layers.forEach((li, i) => { li.classList.toggle('made', p >= IN[i]); li.classList.toggle('on', i === fi) })
        const cs = getComputedStyle(ts[Math.max(0, fi)])
        const size = parseFloat(cs.fontSize)
        charVals.family.textContent = cs.fontFamily.split(',')[0].replace(/['"]/g, '')
        charVals.weight.textContent = cs.fontStyle === 'italic' ? `${cs.fontWeight} itálico` : cs.fontWeight
        charVals.size.textContent = `${Math.round(size)} px`
        charVals.lh.textContent = (parseFloat(cs.lineHeight) / size).toFixed(2)
        charVals.ls.textContent = Math.round((parseFloat(cs.letterSpacing) / size) * 1000)

        return p < IN[iMark] ? 'escrita e posicionada' : p < IN[iStrike] + ENTER ? 'exatamente assim' : p < IN[iGrow] ? 'não está lendo' : ui > 0 ? 'vivenciando' : 'apresentar'
      },
    }
  },
})
