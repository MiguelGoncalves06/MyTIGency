// Seção 3 do Manifesto: "quem conversa com você · é quem DESENHA [cursor]
// e quem PROGRAMA". A tipografia é o design; cada efeito diz o que a frase diz:
//   · DESENHA é desenhada: as letras sobem da linha de base em contorno e
//     então ganham tinta;
//   · PROGRAMA é compilada: cada letra embaralha glifos (em vermelho) até
//     assentar — largura fixa por letra, nada pula;
//   · os rótulos são digitados (índice 01/02 + caret só enquanto digita);
//   · com o cursor assentado ele faz o que a frase diz: SELECIONA a primeira
//     palavra como no Figma (caixa, alças, selo com a medida real) e
//     INSPECIONA a segunda como no DevTools (caixa tracejada + tooltip);
//   · a pílula "quem conversa com você" cai como um carimbo e decodifica; o
//     cursor ganha a etiqueta de multiplayer "nós dois";
//   · marcas de corte em volta da composição e leitura X/Y do cursor.
// O DOM é montado aqui (dentro de um contêiner vazio do React — o texto é
// partido em letras e reescrito a cada quadro, o que o React não pode
// gerenciar) e tudo é função de um estado 0..1 (scrub, reversível). Reduced
// motion: estado final. Posição/tempo: useManifestoHorizontal.
const SCRAMBLE = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#/<>'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - (1 - t) ** 3
const rnd = (set) => set[(Math.random() * set.length) | 0]
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const letters = (w) => [...w].map((c) => `<span class="s3-ch"><span>${esc(c)}</span></span>`).join('')

export const FINAL = { kickA: 1, kickB: 1, wordA: 1, wordB: 1, crop: 1, sel: 1, inspect: 1, mark: 1, tag: 1, note: 1 }

/**
 * @param stage  .s3-vis (vazio)
 * @param who    textos (strings.manifesto.who)
 * @returns { refit(gapW), gap(), update(state), tagAt(x, y), cursor(x, y) }
 */
export function buildSplit(stage, who) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  stage.innerHTML = `
    <div class="s3-mark"><p class="s3-pill"><i></i><span>${esc(who.mark)}</span><b>↘</b></p></div>
    <div class="s3-row">
      <div class="s3-w s3-w--a"><span class="s3-kick"><span class="s3-ix">01</span><span class="s3-kt"></span><i class="s3-caret"></i></span><span class="s3-disp">${letters(who.wordA)}</span></div>
      <div class="s3-gap"></div>
      <div class="s3-w s3-w--b"><span class="s3-kick"><span class="s3-ix">02</span><span class="s3-kt"></span><i class="s3-caret"></i></span><span class="s3-disp">${letters(who.wordB)}</span></div>
    </div>
    <p class="s3-note"></p>
    <div class="s3-sel s3-sel--a"><svg><rect x="0" y="0" width="100%" height="100%" pathLength="1" stroke-dasharray="1"/></svg>
      <i class="s3-h" style="left:0;top:0"></i><i class="s3-h" style="left:100%;top:0"></i><i class="s3-h" style="left:100%;top:100%"></i><i class="s3-h" style="left:0;top:100%"></i>
      <span class="s3-badge"></span></div>
    <div class="s3-sel s3-sel--b"><div class="s3-dash"></div><span class="s3-tip"><span><b>h2</b>.${esc(who.wordB.toLowerCase())}</span><i>|</i><span class="s3-tipdim"></span></span></div>
    <span class="s3-tag">${esc(who.tag)}</span>
    <div class="s3-readout"><span>X <b>0000</b></span><span>Y <b>0000</b></span><span>100%</span></div>
    <i class="s3-crop"></i><i class="s3-crop"></i><i class="s3-crop"></i><i class="s3-crop"></i>`
  const q = (s) => stage.querySelector(s)
  const qa = (s) => [...stage.querySelectorAll(s)]
  const row = q('.s3-row'), gapEl = q('.s3-gap')
  const disps = qa('.s3-disp')
  const chars = disps.map((d) => qa(`.${d.parentElement.classList[1]} .s3-ch`).map((ch) => ({ ch, el: ch.firstChild, c: ch.textContent.toUpperCase() })))
  const [A, B] = chars
  const kicks = qa('.s3-kick').map((k, i) => ({ t: k.querySelector('.s3-kt'), caret: k.querySelector('.s3-caret'), full: i ? who.kickB : who.kickA }))
  const selA = q('.s3-sel--a'), selB = q('.s3-sel--b')
  const rect = selA.querySelector('rect'), handles = qa('.s3-h'), badge = q('.s3-badge')
  const dash = q('.s3-dash'), tip = q('.s3-tip'), tipDim = q('.s3-tipdim')
  const tag = q('.s3-tag'), [rx, ry] = qa('.s3-readout b'), crops = qa('.s3-crop')
  const pill = q('.s3-pill'), pillText = pill.querySelector('span'), note = q('.s3-note')
  let tagXY = [0, 0], last = FINAL

  /** Ajusta o corpo das palavras (largura que sobra do vão `gapW`) e remede as caixas. */
  function refit(gapW) {
    const stack = getComputedStyle(row).flexDirection === 'column'
    disps.forEach((d) => { d.style.fontSize = '100px' })
    B.forEach((r) => { r.ch.style.width = '' })
    const W = stage.clientWidth, vw = innerWidth
    const ws = disps.map((d) => d.getBoundingClientRect().width)
    const fs = stack
      ? Math.min(vw * 0.26, (100 * W * 0.9) / Math.max(...ws))
      : Math.min(vw * 0.134, (100 * (W * 0.95 - gapW - vw * 0.04)) / (ws[0] + ws[1]))
    disps.forEach((d) => { d.style.fontSize = `${fs}px` })
    gapEl.style.width = stack ? '' : `${gapW}px`
    if (!stack) {
      // centra pelo meio das maiúsculas (não pela caixa de linha .84)
      const cx = document.createElement('canvas').getContext('2d')
      cx.font = `400 ${fs}px Anton`
      const m = cx.measureText('H')
      const base = (fs * 0.84 - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent
      row.style.transform = `translateY(${-(base - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2)}px)`
    } else row.style.transform = ''
    // letras da segunda palavra com largura fixa (o embaralhamento não pode mexer no layout)
    B.forEach((r) => { r.ch.style.width = `${r.ch.getBoundingClientRect().width}px` })
    // caixas no palco, sem os transforms das letras
    const sr = stage.getBoundingClientRect()
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height } }
    const bA = box(disps[0]), bB = box(disps[1]), kA = box(q('.s3-kick'))
    const pad = 6
    const place = (el, b) => Object.assign(el.style, { left: `${b.x - pad}px`, top: `${b.y - pad}px`, width: `${b.w + pad * 2}px`, height: `${b.h + pad * 2}px` })
    place(selA, bA)
    place(selB, bB)
    badge.textContent = `${Math.round(bA.w)} × ${Math.round(bA.h)}`
    tipDim.textContent = `${Math.round(bB.w)} × ${Math.round(bB.h)}`
    const g = 18, f = { x0: Math.min(bA.x, bB.x) - g, y0: kA.y - g, x1: Math.max(bA.x + bA.w, bB.x + bB.w) + g, y1: Math.max(bA.y + bA.h, bB.y + bB.h) + g }
    ;[[f.x0, f.y0], [f.x1 - 14, f.y0], [f.x0, f.y1 - 14], [f.x1 - 14, f.y1 - 14]].forEach(([x, y], i) => Object.assign(crops[i].style, { left: `${x}px`, top: `${y}px` }))
    update(last)
  }

  function update(s) {
    last = s
    if (reduce) s = FINAL
    ;[s.kickA, s.kickB].forEach((p, i) => {
      const k = kicks[i]
      k.t.textContent = k.full.slice(0, Math.round(k.full.length * p))
      k.caret.classList.toggle('on', p > 0 && p < 1)
    })
    A.forEach((l, i) => {
      const t0 = i * 0.07
      const up = easeOut(ramp(s.wordA, t0, t0 + 0.45))
      const ink = ramp(s.wordA, t0 + 0.4, t0 + 0.6)
      l.el.style.transform = `translateY(${(1 - up) * 105}%)`
      l.el.style.color = `rgba(20,20,20,${ink})`
      l.el.style.webkitTextStrokeWidth = `${1.5 * (1 - ink)}px` // o contorno some com a tinta
    })
    B.forEach((r, i) => {
      const t0 = i * 0.06
      const p = ramp(s.wordB, t0, t0 + 0.42)
      const done = p >= 1, on = p > 0
      r.el.style.visibility = on ? 'visible' : 'hidden'
      r.ch.classList.toggle('scr', on && !done)
      r.el.textContent = done || !on ? r.c : rnd(SCRAMBLE)
    })
    crops.forEach((c, i) => {
      const t = easeOut(ramp(s.crop, i * 0.08, i * 0.08 + 0.6))
      c.style.opacity = t
      c.style.transform = `translate(${(i % 2 ? 1 : -1) * (1 - t) * 14}px, ${(i < 2 ? -1 : 1) * (1 - t) * 14}px)`
    })
    rect.style.strokeDashoffset = `${1 - easeOut(ramp(s.sel, 0, 0.55))}`
    handles.forEach((h, i) => { h.style.transform = `scale(${easeOut(ramp(s.sel, 0.45 + i * 0.08, 0.7 + i * 0.08))})` })
    const bd = easeOut(ramp(s.sel, 0.7, 1))
    badge.style.opacity = bd
    badge.style.transform = `translate(-50%, ${(1 - bd) * -6}px)`
    dash.style.clipPath = `inset(0 ${(1 - easeOut(ramp(s.inspect, 0, 0.6))) * 100}% 0 0)`
    const tp = easeOut(ramp(s.inspect, 0.45, 1))
    tip.style.opacity = tp
    tip.style.transform = `translateY(${(1 - tp) * 6}px)`
    pill.style.setProperty('--m', s.mark)
    const mp = ramp(s.mark, 0.15, 1)
    pillText.textContent = [...who.mark].map((c, i) => (c === ' ' || mp >= (i + 1) / who.mark.length ? c : rnd(SCRAMBLE))).join('')
    const tg = easeOut(clamp01(s.tag))
    tag.style.opacity = tg
    tag.style.transform = `translate(${tagXY[0]}px, ${tagXY[1]}px) scale(${0.6 + 0.4 * tg})`
    const np = s.note
    note.textContent = np <= 0 ? '' : [...who.note].map((c, i) => {
      const k = (i + 1) / who.note.length
      return c === ' ' || np >= k ? c : np >= k - 0.25 ? rnd(LOWER) : ' '
    }).join('')
  }

  let lx = -1, ly = -1
  return {
    refit,
    /** caixa do vão central no palco (px) */
    gap() {
      const a = gapEl.getBoundingClientRect(), b = stage.getBoundingClientRect()
      return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }
    },
    update,
    tagAt(x, y) { tagXY = [x, y]; update(last) },
    cursor(x, y) {
      const X = Math.max(0, Math.round(x)), Y = Math.max(0, Math.round(y))
      if (X === lx && Y === ly) return
      lx = X; ly = Y
      rx.textContent = String(X).padStart(4, '0')
      ry.textContent = String(Y).padStart(4, '0')
    },
  }
}
