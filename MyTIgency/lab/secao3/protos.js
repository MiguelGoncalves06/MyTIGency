// Protótipos da seção 3 — rodada 2: a tipografia é o design.
// Cada um: { id, name, ref, desc, scrollVh, mount }. mount(stage, { layers })
// → { update(p), dispose() }, p = progresso 0..1 do scroll da trilha (curta:
// a entrada acontece no começo e o resto do percurso só segura a cena).
import { composite, angelCrop, inkReveal } from './angel.js'
import { mountCursor3D } from './cursor3d.js'

export const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const ramp = (p, a, b) => clamp((p - a) / (b - a))
export const ease = (t) => 1 - (1 - t) ** 3
// "quem conversa com você" em quatro linguagens (uma por protótipo, para comparar)
const MARKS = {
  select: '<p class="mk mk-select"><span class="mk-h"></span><span class="mk-t">quem conversa com você</span><span class="mk-h"></span></p>',
  scribble: '<p class="mk mk-scribble">quem conversa com <span class="mk-you">você<svg viewBox="0 0 200 70" preserveAspectRatio="none"><path pathLength="1" d="M10 44 C 46 8, 160 2, 192 30 S 130 66, 40 58 S 6 26, 66 12"/></svg></span></p>',
  sticker: '<p class="mk mk-sticker"><i></i><span>quem conversa com você</span><b>↘</b></p>',
  typed: '<p class="mk mk-typed"><span class="mk-t" data-full="quem conversa com você"></span><i class="mk-caret"></i></p>',
}
export function setMark(stage, t) {
  const el = stage.querySelector('.mk')
  if (!el) return
  el.style.setProperty('--m', t)
  if (el.classList.contains('mk-typed')) {
    const span = el.querySelector('.mk-t'), full = span.dataset.full
    span.textContent = full.slice(0, Math.round(full.length * clamp(t / 0.7)))
    el.classList.toggle('sel', t > 0.85)
    el.style.visibility = t > 0 ? 'visible' : 'hidden' // sem cursor piscando antes de digitar
  }
  if (el.classList.contains('mk-select')) el.classList.toggle('sel', t > 0.98)
}
const MARK_CSS = `
  .mk { margin:0; white-space:nowrap; }
  .mk-select { --m:1; position:relative; display:inline-block; isolation:isolate; padding:.02em .24em .1em; font:italic 400 clamp(26px, 3.2vw, 58px)/1.05 'Instrument Serif', serif; color:#141414; transition:color .3s; }
  .mk-select::before { content:''; position:absolute; inset:0; z-index:-1; background:#FF4438; transform:scaleX(var(--m)); transform-origin:left; }
  .mk-select.sel { color:#FAFAF8; }
  .mk-h { position:absolute; top:-.14em; bottom:-.14em; width:2px; background:#FF4438; opacity:min(1, calc(var(--m) * 20)); }
  .mk-h:first-child { left:-1px; } .mk-h:last-child { left:calc(var(--m) * 100% - 1px); }
  .mk-h::after { content:''; position:absolute; left:50%; width:.3em; height:.3em; border-radius:50%; background:#FF4438; transform:translateX(-50%); }
  .mk-h:first-child::after { top:-.26em; } .mk-h:last-child::after { bottom:-.26em; }
  .mk-scribble { --m:1; font:italic 400 clamp(26px, 3.4vw, 62px)/1 'Instrument Serif', serif; color:#141414; }
  .mk-you { position:relative; display:inline-block; color:#FF4438; }
  .mk-you svg { position:absolute; left:-14%; top:-32%; width:128%; height:164%; overflow:visible; }
  .mk-you path { fill:none; stroke:#FF4438; stroke-width:2; stroke-linecap:round; stroke-dasharray:1; stroke-dashoffset:calc(1 - var(--m)); vector-effect:non-scaling-stroke; }
  .mk-sticker { --m:1; display:inline-flex; align-items:center; gap:.8em; padding:.8em 1.3em; border:1.5px solid #141414; border-radius:999px; background:#FAFAF8; font:500 clamp(11px, 1vw, 16px) 'JetBrains Mono', monospace; letter-spacing:.08em; text-transform:uppercase; color:#141414; transform:rotate(-4deg) scale(calc(.85 + .15 * var(--m))); opacity:var(--m); box-shadow:.25em .25em 0 #141414; }
  .mk-sticker i { width:.6em; height:.6em; border-radius:50%; background:#FF4438; }
  .mk-sticker b { color:#FF4438; font-weight:500; }
  .mk-typed { font:italic 400 clamp(26px, 3.2vw, 58px)/1.05 'Instrument Serif', serif; color:#141414; }
  .mk-typed .mk-t { padding:0 .1em; transition:background .3s, color .3s; }
  .mk-typed.sel .mk-t { background:#FF4438; color:#FAFAF8; }
  .mk-caret { display:inline-block; width:2px; height:.9em; background:#FF4438; vertical-align:-.08em; margin-left:.04em; animation:mkb 1s steps(1) infinite; }
  @keyframes mkb { 50% { opacity:0; } }
`
const NOTE = 'Sem gerente de conta, sem terceirizar, sem intermediários.'

// Estilos comuns da rodada (display condensada + rótulos mono).
const BASE_CSS = `${MARK_CSS}
  .disp { font-family:'Anton', sans-serif; font-weight:400; text-transform:uppercase; line-height:.84; letter-spacing:.002em; color:#141414; }
  .kick { font:500 clamp(12px, 1.25vw, 20px)/1 'JetBrains Mono', monospace; color:var(--red); letter-spacing:.02em; }
  .tag { font:400 11px/1.4 'JetBrains Mono', monospace; color:var(--dim); letter-spacing:.06em; text-transform:uppercase; }
  .cross { position:absolute; width:22px; height:22px; }
  .cross::before, .cross::after { content:''; position:absolute; background:var(--red); }
  .cross::before { left:50%; top:0; bottom:0; width:1px; } .cross::after { top:50%; left:0; right:0; height:1px; }
  .route { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible; }
  .route path { fill:none; stroke:#F04A32; stroke-width:2.6; stroke-linecap:round; stroke-linejoin:round; }
`

// Caminho suave (Catmull-Rom → Bézier) por pontos em px.
function smooth(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  return d
}
// Bézier cúbica desenhada: curve(início, c1, c2, fim, c1, c2, fim, ...) em px.
export const curve = (a, ...r) => `M${a}` + r.map((p, i) => (i % 3 ? ' ' : 'C') + p).join('')
// Traço vermelho que se desenha: set(t) 0..1, at(t) = ponto da ponta.
export function stroke(path, d) {
  path.setAttribute('d', d)
  const len = path.getTotalLength()
  path.style.strokeDasharray = `${len}`
  return {
    set(t) { path.style.strokeDashoffset = `${len * (1 - t)}` },
    at(t) { return path.getPointAtLength(len * t) },
  }
}
export const rel = (el, stage) => {
  const a = el.getBoundingClientRect(), b = stage.getBoundingClientRect()
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }
}

/* ---------- composição "PALAVRA [figura] PALAVRA" (protótipos 1–3) ---------- */
export async function splitScene(stage, center, centerW, extraCss = '', markKind = 'select') {
  stage.innerHTML = `<style>${BASE_CSS}
    .ts { position:absolute; inset:0; }
    .ts-tag { position:absolute; left:3vw; top:calc(48px + 3vh); }
    .ts-mark { position:absolute; left:50%; top:calc(48px + 9vh); transform:translateX(-50%); z-index:3; }
    .ts-row { position:absolute; left:2.5vw; right:2.5vw; top:50%; display:flex; align-items:stretch; justify-content:space-between; z-index:2; }
    .ts-w { position:relative; display:flex; will-change:transform; }
    .ts-w .kick { position:absolute; left:.1em; bottom:calc(100% + .9vw); }
    .ts-w .disp { font-size:13.4vw; display:block; }
    .ts-c { flex:1; position:relative; }
    .ts-c > * { position:absolute; left:50%; top:var(--mid, 50%); transform:translate(-50%,-50%); }
    .ts-note { position:absolute; left:50%; bottom:7vh; transform:translateX(-50%); width:24em; text-align:center; z-index:3; }
    .ts .route { z-index:1; }
    ${extraCss}</style>
  <div class="ts">
    <p class="tag ts-tag">[03 / 07] — ethos</p>
    <div class="ts-mark">${MARKS[markKind]}</div>
    <div class="ts-row">
      <div class="ts-w ts-l"><span class="kick">é quem</span><span class="disp">Desenha</span></div>
      <div class="ts-c">${center}</div>
      <div class="ts-w ts-r"><span class="kick">e quem</span><span class="disp">Programa</span></div>
    </div>
    <p class="tag ts-note">${NOTE}</p>
    <span class="cross" style="left:7vw;bottom:14vh"></span><span class="cross" style="right:6vw;bottom:18vh"></span>
    <svg class="route"><path/></svg>
  </div>`
  const q = (s) => stage.querySelector(s)
  // as duas palavras ocupam a largura que sobra da figura central
  await document.fonts.load('400 100px Anton')
  const words = [...stage.querySelectorAll('.ts-w .disp')]
  words.forEach((w) => { w.style.fontSize = '100px' })
  const sum = words.reduce((a, w) => a + w.getBoundingClientRect().width, 0)
  const fs = Math.min(innerWidth * 0.134, (100 * (stage.clientWidth * 0.95 - centerW - innerWidth * 0.04)) / sum)
  words.forEach((w) => { w.style.fontSize = `${fs}px` })
  const row = q('.ts-row')
  const cx = document.createElement('canvas').getContext('2d')
  cx.font = `400 ${fs}px Anton`
  const m = cx.measureText('DESENHA')
  // linha de base dentro da caixa de linha (.84) e meio das maiúsculas a partir dela
  const base = (fs * 0.84 - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent
  const capMid = base - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
  row.style.transform = `translateY(${-capMid}px)`
  row.style.setProperty('--mid', `${capMid}px`) // figura central no mesmo eixo das letras
  return { q, l: q('.ts-l'), r: q('.ts-r'), mark: q('.mk'), note: q('.ts-note'), path: q('.route path') }
}
export function splitEnter(s, p) {
  const w = ease(ramp(p, 0, 0.32))
  s.l.style.transform = `translateX(${-24 * (1 - w)}vw)`
  s.r.style.transform = `translateX(${24 * (1 - w)}vw)`
  s.l.style.opacity = s.r.style.opacity = w
  s.note.style.opacity = ramp(p, 0.8, 0.95)
}

export const PROTOS = [
  /* ------------------------------------------------------------------ */
  {
    id: 't1',
    name: 'Split + anjo',
    ref: 'Ref.: a composição da sua imagem + Mint&Marble ("WE [imagem] ARE")',
    desc: 'A composição que você aprovou na imagem, com o <b>anjo</b> como figura central. As palavras entram das laterais, o anjo se forma em tinta e o traço vermelho vem da seção anterior, passa <b>por trás</b> das letras e termina no marca-texto "quem conversa com você".',
    scrollVh: 140,
    async mount(stage, { layers }) {
      const W = Math.round(innerWidth * 0.2)
      const ink = inkReveal(angelCrop(layers, W), { origin: [0.6, 0.3] })
      const s = await splitScene(stage, '<div class="t1-art"></div>', W, `.t1-art { width:${W}px; }`, 'scribble')
      s.q('.t1-art').append(ink.canvas)
      const m = rel(s.mark, stage), H = stage.clientHeight, Wd = stage.clientWidth
      const end = [m.x - 8, m.y + m.h * 0.56]
      const line = stroke(s.path, curve([-20, H * 0.86], [Wd * 0.3, H * 1.02], [end[0] - Wd * 0.2, end[1]], end))
      return {
        update(p) {
          splitEnter(s, p)
          ink.draw(ramp(p, 0.1, 0.62))
          line.set(ease(ramp(p, 0.3, 0.78)))
          setMark(stage, ramp(p, 0.76, 0.9))
        },
      }
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: 't2',
    name: 'Split + cursor 3D',
    ref: 'Ref.: Mint&Marble (objeto 3D em wireframe no centro) + o cursor da seção 2',
    desc: 'Figura central: o <b>cursor em 3D</b> (o do hero-bitmap-cursor), em dither cinza como a TV do site, com a borda acesa em vermelho. Ele <b>é a caneta</b>: com o scroll, percorre o caminho e a ponta dele desenha o traço vermelho; ao chegar no centro assenta em 3/4 e passa a reagir ao mouse, com peso. "quem conversa com você" é <b>digitado</b> e selecionado, como numa tela.',
    scrollVh: 140,
    async mount(stage) {
      const box = Math.round(innerWidth * 0.2)
      const s = await splitScene(stage, '<i class="t2-gap"></i>', box, '.t2-cv { position:absolute; inset:0; width:100%; height:100%; z-index:4; pointer-events:none; }', 'typed')
      const H = stage.clientHeight, Wd = stage.clientWidth
      const gap = rel(s.q('.ts-c'), stage)
      const size = Math.min(gap.w * 0.78, H * 0.3)
      const cv = Object.assign(document.createElement('canvas'), { className: 't2-cv' })
      s.q('.ts').append(cv)
      const cur = await mountCursor3D(cv, { size })
      // ponta final: corpo do cursor centrado no vão entre as palavras, na altura das letras
      const [bx, by] = cur.body()
      const end = [gap.x + gap.w / 2 - bx, H / 2 - by]
      // entra pela esquerda, mergulha sob DESENHA e sobe reto pelo vão até a ponta
      const line = stroke(s.path, curve([-size * 0.7, H * 0.74], [Wd * 0.2, H * 0.94], [end[0], end[1] + H * 0.5], end))
      const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
      return {
        update(p) {
          splitEnter(s, p)
          const t = io(ramp(p, 0.04, 0.62))
          line.set(t)
          const a = line.at(t), b0 = line.at(Math.max(0, t - 0.01)), b1 = line.at(Math.min(1, t + 0.01))
          cur.set(a.x, a.y, Math.atan2(b0.y - b1.y, b1.x - b0.x), ramp(t, 0.86, 1), ramp(p, 0.04, 0.14))
          setMark(stage, ramp(p, 0.66, 0.9))
        },
        dispose() { cur.dispose() },
      }
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: 't4',
    name: 'Sobreposição',
    ref: 'Ref.: "NEW REIGN" (tipo gigante por cima da figura) + Filarmônica de NY',
    desc: 'O anjo grande ocupa a tela e a frase passa <b>por cima dele</b> em coral, em multiplicação — o anjo aparece através das letras. Meta-informação mínima nos cantos, em mono. Cena de capa de revista: impacto máximo, uma leitura só. As linhas entram de baixo, uma por vez.',
    scrollVh: 130,
    async mount(stage, { layers }) {
      const W = Math.round(Math.min(innerWidth * 0.62, innerHeight * 0.92 * 1130 / 784))
      const ink = inkReveal(composite(layers, W), { origin: [0.6, 0.3] })
      stage.innerHTML = `<style>${BASE_CSS}
        .t4 { position:absolute; inset:0; }
        .t4-art { position:absolute; left:50%; top:54%; transform:translate(-50%,-50%); width:${W}px; }
        .t4-type { position:absolute; left:4vw; right:4vw; top:50%; transform:translateY(-44%); z-index:2; mix-blend-mode:multiply; }
        .t4-type .disp { display:block; font-size:12.2vw; color:#FF4438; overflow:hidden; white-space:nowrap; padding-top:.14em; margin-top:-.14em; }
        .t4-type .disp span { display:inline-block; will-change:transform; }
        .t4-type .disp:last-child { text-align:right; }
        .t4-tl { position:absolute; left:3vw; top:calc(48px + 3vh); } .t4-tr { position:absolute; right:3vw; top:calc(48px + 3vh); text-align:right; }
        .t4-bl { position:absolute; left:3vw; bottom:7vh; z-index:3; }
        .t4-br { position:absolute; right:3vw; bottom:6vh; text-align:right; }
        .t4-side { position:absolute; left:1.4vw; top:50%; transform:rotate(-90deg) translateX(50%); transform-origin:left top; }
      </style>
      <div class="t4">
        <div class="t4-art"></div>
        <h2 class="t4-type"><span class="disp"><span>É quem desenha</span></span><span class="disp"><span>e quem programa.</span></span></h2>
        <p class="tag t4-tl">[03 / 07]<br>manifesto</p>
        <p class="tag t4-tr">MyTIgency<br>parte 03</p>
        <div class="t4-bl">${MARKS.sticker}</div>
        <p class="tag t4-br">${NOTE.replace(', sem i', ',<br>sem i')}</p>
        <p class="tag t4-side">Conversa — Desenho — Código</p>
      </div>`
      const q = (x) => stage.querySelector(x)
      q('.t4-art').append(ink.canvas)
      const lines = stage.querySelectorAll('.t4-type .disp span')
      return {
        update(p) {
          ink.draw(ramp(p, 0, 0.5))
          lines.forEach((el, i) => { el.style.transform = `translateY(${105 * (1 - ease(ramp(p, 0.18 + i * 0.12, 0.45 + i * 0.12)))}%)` })
          setMark(stage, ramp(p, 0.68, 0.82))
        },
      }
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: 't6',
    name: 'Bloco coral + índice',
    ref: 'Ref.: portfólio editorial (bloco de cor + índice gigante) + Moscow Run (blocos)',
    desc: 'A tela se divide: à esquerda um <b>bloco coral</b> com o índice gigante "01 CONVERSA / 02 DESENHO / 03 CÓDIGO" — o item ativo acende conforme o scroll; à direita, off-white, o anjo pequeno e a frase em condensada preta. Cor usada como evento (um bloco, uma vez), não como decoração espalhada.',
    scrollVh: 140,
    async mount(stage, { layers }) {
      const W = Math.round(innerWidth * 0.16)
      const ink = inkReveal(angelCrop(layers, W), { origin: [0.6, 0.3] })
      stage.innerHTML = `<style>${BASE_CSS}
        .t6 { position:absolute; inset:0; display:grid; grid-template-columns:46vw 1fr; }
        .t6-l { background:#FF4438; padding:calc(48px + 6vh) 3.5vw 5vh; display:flex; flex-direction:column; justify-content:space-between; clip-path:inset(0 100% 0 0); }
        .t6-l .tag { color:#141414; }
        .t6-idx { list-style:none; }
        .t6-idx li { font-size:8.6vw; color:rgba(20,20,20,.28); transition:color .35s; display:flex; gap:2vw; }
        .t6-idx li small { font:500 clamp(12px, 1.2vw, 20px) 'JetBrains Mono', monospace; padding-top:1.2vw; }
        .t6-idx li.on { color:#FAFAF8; }
        .t6-r { position:relative; padding:calc(48px + 6vh) 4vw 5vh; display:flex; flex-direction:column; justify-content:space-between; }
        .t6-r .mk { align-self:flex-start; }
        .t6-art { position:absolute; right:5vw; top:22vh; width:${W}px; }
        .t6-r .disp { font-size:5vw; white-space:nowrap; }
        .t6-r .disp em { font-style:normal; color:#FF4438; }
      </style>
      <div class="t6">
        <div class="t6-l"><p class="tag">[ quem faz ] — 03 / 07</p>
          <ol class="t6-idx disp"><li><small>01</small>Conversa</li><li><small>02</small>Desenho</li><li><small>03</small>Código</li></ol>
          <p class="tag">${NOTE}</p></div>
        <div class="t6-r">${MARKS.scribble}<div class="t6-art"></div><h2 class="disp">É quem <em>desenha</em><br>e quem <em>programa.</em></h2></div>
      </div>`
      const q = (x) => stage.querySelector(x)
      q('.t6-art').append(ink.canvas)
      const block = q('.t6-l'), items = stage.querySelectorAll('.t6-idx li')
      return {
        update(p) {
          block.style.clipPath = `inset(0 ${100 * (1 - ease(ramp(p, 0, 0.25)))}% 0 0)`
          const k = Math.min(2, Math.floor(ramp(p, 0.25, 0.85) * 3))
          items.forEach((li, i) => li.classList.toggle('on', p > 0.25 && i === k))
          ink.draw(ramp(p, 0.15, 0.6))
          setMark(stage, ramp(p, 0.1, 0.25))
        },
      }
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: 't7',
    name: 'Rota',
    ref: 'Ref.: Moscow Run (o trajeto com paradas) + o traço A como fio condutor',
    desc: 'Sem figura: o próprio <b>traço vermelho vira o trajeto</b>, vindo da seção anterior, com três paradas marcadas — conversa, desenho, código — até chegar em "quem conversa com você". Por cima, a frase gigante em condensada. É a ideia de "um site conduz" desenhada literalmente.',
    scrollVh: 150,
    async mount(stage) {
      stage.innerHTML = `<style>${BASE_CSS}
        .t7 { position:absolute; inset:0; }
        .t7-h { position:absolute; left:4vw; top:calc(48px + 5vh); }
        .t7-h .disp { font-size:8.2vw; }
        .t7-h .disp span { color:#FF4438; }
        .t7-st { position:absolute; display:flex; align-items:center; gap:.7em; transform:translate(-7px, -7px); opacity:0; transition:opacity .4s; }
        .t7-st.on { opacity:1; }
        .t7-st i { width:14px; height:14px; border-radius:50%; background:#FAFAF8; border:2.5px solid #F04A32; flex:none; }
        .t7-st b { font:500 clamp(11px, 1vw, 16px) 'JetBrains Mono', monospace; color:#141414; }
        .t7-st b em { color:var(--red); font-style:normal; margin-right:.4em; }
        .t7-end { position:absolute; font-size:clamp(18px, 2.2vw, 38px); }
        .t7-dot { position:absolute; left:0; top:0; width:12px; height:12px; margin:-6px; border-radius:50%; background:#F04A32; z-index:3; }
        .t7-note { position:absolute; left:4vw; bottom:6vh; }
      </style>
      <div class="t7">
        <div class="t7-h"><h2 class="disp">É quem <span>desenha</span><br>e quem <span>programa.</span></h2></div>
        <svg class="route"><path/></svg>
        <div class="t7-st" data-at=".22"><i></i><b><em>[01]</em>conversa</b></div>
        <div class="t7-st" data-at=".5"><i></i><b><em>[02]</em>desenho</b></div>
        <div class="t7-st" data-at=".76"><i></i><b><em>[03]</em>código</b></div>
        <div class="t7-end">${MARKS.sticker}</div>
        <div class="t7-dot"></div>
        <p class="tag t7-note">${NOTE}</p>
      </div>`
      const q = (x) => stage.querySelector(x)
      const W = stage.clientWidth, H = stage.clientHeight
      const end = q('.t7-end')
      end.style.left = `${W * 0.66}px`
      end.style.top = `${H * 0.5}px`
      const e = rel(end, stage)
      const pts = [[-10, H * 0.9], [W * 0.3, H * 0.84], [W * 0.5, H * 0.72], [e.x - 14, e.y + e.h * 0.55]] // poucos pontos = curva larga, sem ondas
      const line = stroke(q('.route path'), smooth(pts))
      const stops = [...stage.querySelectorAll('.t7-st')].map((el) => {
        const at = Number(el.dataset.at), pt = line.at(at)
        el.style.left = `${pt.x}px`
        el.style.top = `${pt.y}px`
        return { el, at }
      })
      const dot = q('.t7-dot'), head = q('.t7-h')
      return {
        update(p) {
          head.style.opacity = ease(ramp(p, 0, 0.2))
          head.style.transform = `translateY(${(1 - ease(ramp(p, 0, 0.2))) * 4}vh)`
          const t = ramp(p, 0.08, 0.8)
          line.set(t)
          const pt = line.at(t)
          dot.style.transform = `translate(${pt.x}px, ${pt.y}px)`
          dot.style.opacity = t > 0 && t < 1 ? 1 : 0
          stops.forEach((s) => s.el.classList.toggle('on', t >= s.at))
          setMark(stage, ramp(p, 0.8, 0.92))
        },
      }
    },
  },
]
