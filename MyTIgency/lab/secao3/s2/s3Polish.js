// Acabamento da seção 3 (LAB s2→3). Cada efeito diz o que a frase diz:
//   · DESENHA é desenhada: as letras sobem da linha de base em contorno e
//     então ganham tinta (contorno → preenchimento);
//   · PROGRAMA é compilada: cada letra embaralha glifos (em vermelho, como o
//     ASCII do LAB) até assentar — largura fixa por letra, nada pula;
//   · "é quem / e quem" são digitados (índice 01/02 + caret só enquanto digita);
//   · quando o cursor assenta, ele faz o que diz: SELECIONA "desenha" como no
//     Figma (caixa, alças, selo de medida real) e INSPECIONA "programa" como
//     no DevTools (caixa tracejada + tooltip h2.programa com a medida real);
//   · a pílula "quem conversa com você" cai como um carimbo (a sombra dura
//     aparece no impacto) e decodifica; o cursor ganha a etiqueta de
//     multiplayer "nós dois" — a resposta ao "quem";
//   · marcas de corte em volta da composição e leitura de coordenadas do
//     cursor (barra de status de ferramenta), em mono, discretas.
// Tudo é função do progresso (scrub, reversível); reduced motion = estado final.
const SCRAMBLE = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#/<>'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - (1 - t) ** 3
const rnd = (set) => set[(Math.random() * set.length) | 0]

const CSS = `
  .ts .cross { display:none; }
  .ts .disp { letter-spacing:0; }
  .ts .ch { display:inline-block; clip-path:inset(-40% -30% 0 -30%); }
  .ts .ch > span { display:inline-block; will-change:transform; }
  .ts-l .ch > span { -webkit-text-stroke:1.5px #141414; }
  .ts-r .ch { text-align:center; }
  .ts-r .ch.scr > span { color:#FF4438; }
  .ts .kick { display:flex; align-items:baseline; gap:.7em; white-space:nowrap; }
  .ts .k-ix { color:#9a9a92; }
  .ts .k-caret { display:inline-block; width:.55em; height:.12em; background:#FF4438; margin-left:.08em; visibility:hidden; }
  .ts .k-caret.on { visibility:visible; animation:kc .8s steps(1) infinite; }
  @keyframes kc { 50% { opacity:0; } }
  .sel { position:absolute; z-index:4; pointer-events:none; }
  .sel svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
  .sel-d rect { fill:none; stroke:#FF4438; stroke-width:1.25; vector-effect:non-scaling-stroke; }
  .sel-h { position:absolute; width:8px; height:8px; margin:-4px; background:#FAFAF8; border:1.25px solid #FF4438; transform:scale(0); }
  .sel-badge { position:absolute; left:50%; top:calc(100% + 10px); padding:3px 6px; border-radius:3px; background:#FF4438; color:#FAFAF8; font:500 10.5px/1 'JetBrains Mono', monospace; letter-spacing:.04em; white-space:nowrap; transform:translateX(-50%); }
  .sel-p .box { position:absolute; inset:0; border:1.25px dashed #141414; }
  .sel-tip { position:absolute; left:0; top:calc(100% + 12px); display:flex; gap:.8em; align-items:center; padding:6px 9px; border-radius:3px; background:#141414; color:#d8d8d2; font:400 10.5px/1 'JetBrains Mono', monospace; white-space:nowrap; }
  .sel-tip::before { content:''; position:absolute; left:12px; top:-5px; border:5px solid transparent; border-top:0; border-bottom-color:#141414; }
  .sel-tip b { color:#FF6A5E; font-weight:500; }
  .sel-tip i { font-style:normal; color:#7d7d77; }
  .ts .mk-sticker { transform:translateY(calc((1 - var(--m)) * -18px)) rotate(calc(-4deg - (1 - var(--m)) * 9deg)) scale(calc(1 + (1 - var(--m)) * .3));
    box-shadow:calc(var(--m) * .25em) calc(var(--m) * .25em) 0 #141414; opacity:min(1, calc(var(--m) * 4)); }
  .cur-tag { position:absolute; left:0; top:0; z-index:5; padding:4px 8px 5px; border-radius:0 6px 6px 6px; background:#FF4438; color:#FAFAF8; font:500 11px/1 'JetBrains Mono', monospace; letter-spacing:.04em; white-space:nowrap; transform-origin:0 0; pointer-events:none; }
  .crop { position:absolute; z-index:1; width:14px; height:14px; border:0 solid rgba(20,20,20,.45); pointer-events:none; }
  .crop.tl { border-width:1px 0 0 1px; } .crop.tr { border-width:1px 1px 0 0; }
  .crop.bl { border-width:0 0 1px 1px; } .crop.br { border-width:0 1px 1px 0; }
  .readout { position:absolute; left:3vw; bottom:7vh; z-index:3; display:flex; gap:1.4em; font:400 10.5px/1 'JetBrains Mono', monospace; color:#9a9a92; letter-spacing:.06em; font-variant-numeric:tabular-nums; }
  .readout b { color:#141414; font-weight:500; }
`

function splitChars(disp) {
  const word = disp.textContent
  disp.setAttribute('aria-label', word)
  disp.innerHTML = [...word].map((c) => `<span class="ch" aria-hidden="true"><span>${c}</span></span>`).join('')
  return [...disp.querySelectorAll('.ch')].map((ch) => ({ ch, el: ch.firstChild, c: ch.textContent.toUpperCase() }))
}

/** Prepara a cena (depois de splitScene) e devolve { update(state), cursor(x, y, on) }. */
export function polishSplit(stage, split) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ts = split.q('.ts')
  ts.insertAdjacentHTML('afterbegin', `<style>${CSS}</style>`)
  const dispL = split.q('.ts-l .disp'), dispR = split.q('.ts-r .disp')
  const L = splitChars(dispL), R = splitChars(dispR)
  // PROGRAMA: largura fixa por letra (os glifos do embaralhamento têm larguras diferentes)
  R.forEach((r) => { r.ch.style.width = `${r.ch.getBoundingClientRect().width}px` })

  // rótulos digitados com índice
  const kicks = [split.q('.ts-l .kick'), split.q('.ts-r .kick')].map((k, i) => {
    const full = k.textContent
    k.innerHTML = `<span class="k-ix">0${i + 1}</span><span class="k-t"></span><i class="k-caret"></i>`
    k.setAttribute('aria-label', full)
    return { t: k.querySelector('.k-t'), caret: k.querySelector('.k-caret'), full }
  })

  // caixas medidas sem transform (as palavras não se deslocam mais)
  const sr = stage.getBoundingClientRect()
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height } }
  const bL = box(dispL), bR = box(dispR), kL = box(split.q('.ts-l .kick'))
  const place = (el, b) => Object.assign(el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })

  ts.insertAdjacentHTML('beforeend', `
    <div class="sel sel-d"><svg aria-hidden="true"><rect x="0" y="0" width="100%" height="100%" pathLength="1" stroke-dasharray="1"/></svg>
      <i class="sel-h" style="left:0;top:0"></i><i class="sel-h" style="left:100%;top:0"></i><i class="sel-h" style="left:100%;top:100%"></i><i class="sel-h" style="left:0;top:100%"></i>
      <span class="sel-badge">${Math.round(bL.w)} × ${Math.round(bL.h)}</span></div>
    <div class="sel sel-p"><div class="box"></div>
      <span class="sel-tip"><span><b>h2</b>.programa</span><i>|</i><span>${Math.round(bR.w)} × ${Math.round(bR.h)}</span></span></div>
    <span class="cur-tag" aria-hidden="true">nós dois</span>
    <div class="readout" aria-hidden="true"><span>X <b class="rx">0000</b></span><span>Y <b class="ry">0000</b></span><span>100%</span></div>
    <i class="crop tl"></i><i class="crop tr"></i><i class="crop bl"></i><i class="crop br"></i>`)
  const q = (s) => ts.querySelector(s)
  const selD = q('.sel-d'), selP = q('.sel-p')
  const pad = 6
  place(selD, { x: bL.x - pad, y: bL.y - pad, w: bL.w + pad * 2, h: bL.h + pad * 2 })
  place(selP, { x: bR.x - pad, y: bR.y - pad, w: bR.w + pad * 2, h: bR.h + pad * 2 })
  const rect = selD.querySelector('rect'), handles = [...selD.querySelectorAll('.sel-h')], badge = q('.sel-badge')
  const pbox = selP.querySelector('.box'), tip = q('.sel-tip')
  const tag = q('.cur-tag'), rx = q('.rx'), ry = q('.ry')
  // marcas de corte em volta da composição (rótulos → palavras)
  const g = 18
  const frame = { x0: bL.x - g, y0: kL.y - g, x1: bR.x + bR.w + g, y1: bL.y + bL.h + g }
  const crops = [...ts.querySelectorAll('.crop')]
  const cropPos = [[frame.x0, frame.y0], [frame.x1 - 14, frame.y0], [frame.x0, frame.y1 - 14], [frame.x1 - 14, frame.y1 - 14]]
  crops.forEach((c, i) => { c.style.left = `${cropPos[i][0]}px`; c.style.top = `${cropPos[i][1]}px` })

  const mk = split.q('.mk-sticker span')
  const mkFull = mk?.textContent || ''
  const note = split.q('.ts-note')
  const noteFull = note.textContent
  note.setAttribute('aria-label', noteFull)
  let tagAt = [0, 0]

  function update(s) {
    if (reduce) s = { kickL: 1, kickR: 1, desenha: 1, programa: 1, crop: 1, sel: 1, inspect: 1, mark: 1, note: 1, tag: 1 }
    // rótulos
    ;[s.kickL, s.kickR].forEach((p, i) => {
      const k = kicks[i]
      k.t.textContent = k.full.slice(0, Math.round(k.full.length * p))
      k.caret.classList.toggle('on', p > 0 && p < 1)
    })
    // DESENHA: sobe em contorno, depois tinta
    L.forEach((l, i) => {
      const t0 = i * 0.07
      const up = easeOut(ramp(s.desenha, t0, t0 + 0.45))
      const ink = ramp(s.desenha, t0 + 0.4, t0 + 0.6)
      l.el.style.transform = `translateY(${(1 - up) * 105}%)`
      l.el.style.color = `rgba(20,20,20,${ink})`
      l.el.style.webkitTextStrokeWidth = `${1.5 * (1 - ink)}px` // o contorno some com a tinta (mesmo peso do PROGRAMA)
    })
    // PROGRAMA: embaralha até compilar
    R.forEach((r, i) => {
      const t0 = i * 0.06
      const p = ramp(s.programa, t0, t0 + 0.42)
      const done = p >= 1, on = p > 0
      r.el.style.visibility = on ? 'visible' : 'hidden'
      r.ch.classList.toggle('scr', on && !done)
      r.el.textContent = done || !on ? r.c : rnd(SCRAMBLE)
    })
    // marcas de corte: entram dos cantos
    crops.forEach((c, i) => {
      const t = easeOut(ramp(s.crop, i * 0.08, i * 0.08 + 0.6))
      const dx = i % 2 ? 1 : -1, dy = i < 2 ? -1 : 1
      c.style.opacity = t
      c.style.transform = `translate(${dx * (1 - t) * 14}px, ${dy * (1 - t) * 14}px)`
    })
    // Figma: caixa se desenha, alças aparecem, selo de medida
    rect.style.strokeDashoffset = `${1 - easeOut(ramp(s.sel, 0, 0.55))}`
    handles.forEach((h, i) => { h.style.transform = `scale(${easeOut(ramp(s.sel, 0.45 + i * 0.08, 0.7 + i * 0.08))})` })
    const bd = easeOut(ramp(s.sel, 0.7, 1))
    badge.style.opacity = bd
    badge.style.transform = `translate(-50%, ${(1 - bd) * -6}px)`
    // DevTools: caixa tracejada abre da esquerda, tooltip sobe
    pbox.style.clipPath = `inset(0 ${(1 - easeOut(ramp(s.inspect, 0, 0.6))) * 100}% 0 0)`
    const tp = easeOut(ramp(s.inspect, 0.45, 1))
    tip.style.opacity = tp
    tip.style.transform = `translateY(${(1 - tp) * 6}px)`
    // pílula: carimbo + decodifica
    split.q('.mk')?.style.setProperty('--m', s.mark)
    if (mk) {
      const p = ramp(s.mark, 0.15, 1)
      mk.textContent = [...mkFull].map((c, i) => (c === ' ' || p >= (i + 1) / mkFull.length ? c : rnd(SCRAMBLE))).join('')
    }
    // etiqueta do cursor
    const tg = easeOut(clamp01(s.tag))
    tag.style.opacity = tg
    tag.style.transform = `translate(${tagAt[0]}px, ${tagAt[1]}px) scale(${0.6 + 0.4 * tg})`
    // nota: decodifica da esquerda para a direita
    const np = s.note
    note.style.opacity = np > 0 ? 1 : 0
    note.textContent = [...noteFull].map((c, i) => {
      const k = (i + 1) / noteFull.length
      return c === ' ' || np >= k ? c : np >= k - 0.25 ? rnd(LOWER) : ' '
    }).join('')
  }

  let lastX = -1, lastY = -1
  return {
    update,
    /** onde a etiqueta "nós dois" fica (px do palco) — junto ao corpo do cursor assentado */
    tagAt(x, y) { tagAt = [x, y] },
    /** leitura de coordenadas do cursor (px da tela) */
    cursor(x, y) {
      const X = Math.round(x), Y = Math.round(y)
      if (X === lastX && Y === lastY) return
      lastX = X; lastY = Y
      rx.textContent = String(Math.max(0, X)).padStart(4, '0')
      ry.textContent = String(Math.max(0, Y)).padStart(4, '0')
    },
  }
}
