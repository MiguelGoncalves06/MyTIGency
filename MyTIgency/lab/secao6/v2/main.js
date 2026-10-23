// LAB — seção 6, v2: "A pauta" (coda). Linha do tempo (alturas de tela de
// scroll depois do deslocamento lateral):
//   staff1 — as cinco linhas do sistema 1 se desenham (e o 4/4);
//   notes  — "Cada linha foi escrita e posicionada exatamente assim." pousa
//            na pauta, palavra a palavra, cada uma numa altura de nota; ao
//            pousar, a corda dela soa;
//   lyrics — embaixo, a letra: "Você não está lendo sobre o nosso trabalho.",
//            ainda apagada; o pincel risca "lendo";
//   staff2 — a coda: "você está" como indicação de andamento e VIVENCIANDO
//            com as letras em alturas de nota (como o RITMO da seção 5);
//   play   — a cabeça de leitura toca a partitura inteira: cada nota soa e
//            pisca, a letra embaixo acende; barra dupla e "fine".
// Posição = função do scroll; o que SOA (cordas, piscadas, player) é resposta
// em tempo real. Com mouse, passar o cursor pelas linhas também as toca.
import { mountLab, ramp, easeOut, easeInOut, backOut, clamp01, strikeSvg, esc, REDUCE, FINE } from '../base.js'

// [palavra, altura (0 = linha de baixo … 8 = linha de cima; par = linha, ímpar = espaço), papel]
const NOTES = [['Cada', 2], ['linha', 4, 'serif'], ['foi', 3], ['escrita', 6], ['e', 5, 'serif'], ['posicionada', 3], ['exatamente', 7, 'serif'], ['assim.', 4]]
const LYRICS = ['Você', 'não', 'está', 'lendo', 'sobre', 'o', 'nosso', 'trabalho.']
const STRIKE_AT = 3
const CODA = 'vivenciando.'
const CODA_K = [1, 3, 2, 4, 3, 2, 4, 1, 3, 2, 0, 0]
const TEMPO = 'você está'
const SENTENCE = 'Cada linha foi escrita e posicionada exatamente assim. Você não está lendo sobre o nosso trabalho. Você está vivenciando.'

const P = {
  staff1: [0, 0.45], notes: [0.3, 1.1], lyrics: [1.1, 1.5], strike: [1.55, 1.8],
  staff2: [1.75, 2.1], tempo: [1.9, 2.15], coda: [2.05, 2.6],
  play: [2.65, 3.45], end: [3.35, 3.55],
}
const LENGTH = 3.75
const WORD_DUR = 0.3 // fração de cada palavra dentro da janela dela
const SPLIT = 0.64 // fração do "play" gasta no sistema 1
const BASE = 0.8 // da caixa (line-height 1) até a linha de base, em em
// cordas: velocidade da frente de onda (px/s), amortecimento (1/s), frequência e alcance
const WAVE_SPEED = 1100
const DAMP = 2.4
const FREQ = 30
const REACH = 520
const RING_MS = 320

function makeStaff(svg) {
  svg.innerHTML = '<path class="str"/>'.repeat(5)
  const strs = [...svg.querySelectorAll('.str')].map((el) => ({ el, y: 0, plucks: [] }))
  return { svg, strs, x1: 0, draw: 0 }
}
function pluck(staff, i, x, amp, now) {
  if (REDUCE) return
  staff.strs[i].plucks.push({ x, amp, t0: now })
}
function disp(s, x, now) {
  let y = 0
  for (const p of s.plucks) {
    const age = (now - p.t0) / 1000
    const dx = Math.abs(x - p.x)
    const front = clamp01((age * WAVE_SPEED - dx) / 40)
    if (!front) continue
    y += p.amp * Math.exp(-age * DAMP) * Math.exp(-dx / REACH) * Math.sin(age * FREQ - dx * 0.05) * front
  }
  return y
}
function renderStaff(st, now) {
  const end = st.x1 * st.draw
  for (const s of st.strs) {
    s.plucks = s.plucks.filter((p) => now - p.t0 < 2600)
    if (end <= 0) { s.el.setAttribute('d', ''); continue }
    let d = `M0 ${s.y}`
    for (let x = 8; x < end; x += 8) d += `L${x} ${(s.y + disp(s, x, now)).toFixed(2)}`
    d += `L${end} ${s.y}`
    s.el.setAttribute('d', d)
    s.el.classList.toggle('hot', s.plucks.some((p) => now - p.t0 < 220))
  }
}

mountLab({
  title: 'LAB — Seção 6 · v2 A pauta',
  links: [['../', 'v1 · wrapped da visita'], ['./', 'v2 · a pauta', true], ['../v3/', 'v3 · o editor']],
  scene(host) {
    host.innerHTML = `
      <h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${esc(SENTENCE)}</h2>
      <div class="s6-poster p6" aria-hidden="true">
        <div class="s5-rule"><span class="s5-pill">( 06 )</span><i class="s5-sig"></i>
          <span class="s5-mono">partitura nº 06 · <b>coda</b></span><i></i>
          <span class="s5-mono">música e letra: miguel &amp; thiago</span><i class="s5-sig"></i>
          <span class="s5-meter"><span>4</span><span>4</span></span></div>
        <div class="sys sys1"><svg class="staff"></svg><span class="meter-big"><span>4</span><span>4</span></span>
          ${NOTES.map(([w, , role]) => `<span class="nw${role ? ` s5-${role}` : ''}">${esc(w)}</span>`).join('')}
          ${LYRICS.map((w, i) => (i === STRIKE_AT ? `<span class="ly in strike-w">${esc(w)}${strikeSvg()}</span>` : `<span class="ly in">${esc(w)}</span>`)).join('')}
        </div>
        <div class="sys sys2"><svg class="staff"></svg><span class="tempo in">${esc(TEMPO)}</span>
          ${[...CODA.toUpperCase()].map((ch) => `<span class="nl${ch === '.' ? ' dot' : ''}">${esc(ch)}</span>`).join('')}
          <span class="fine mono in">fine</span>
        </div>
        <div class="s5-rule"><span class="s5-pill s5-player">
          <svg class="s5-ic-play" viewBox="0 0 8 9"><path d="M0 0 8 4.5 0 9Z"/></svg><svg class="s5-ic-pause" viewBox="0 0 8 9"><path d="M0 0h3v9H0zM5 0h3v9H5z"/></svg>
          <span class="s5-state">pausa</span> · faixa 06 <span class="s5-eq"><i></i><i></i><i></i><i></i><i></i></span><span><b class="s5-bpm">000</b> bpm</span></span><i></i>
          <span class="s5-mono hint" style="color:var(--paper)">role para tocar ↓</span></div>
      </div>`

    const q = (s) => host.querySelector(s)
    const qa = (s) => [...host.querySelectorAll(s)]
    const sys1 = q('.sys1')
    const sys2 = q('.sys2')
    const st1 = makeStaff(sys1.querySelector('.staff'))
    const st2 = makeStaff(sys2.querySelector('.staff'))
    const meter = q('.meter-big')
    const nws = qa('.nw')
    const lys = qa('.ly')
    const strikeW = q('.ly.strike-w')
    const tempo = q('.tempo')
    const nls = qa('.nl')
    const fine = q('.fine')
    const player = q('.s5-player')
    const plState = q('.s5-state')
    const eq = qa('.s5-eq i')
    const bpm = q('.s5-bpm')
    const hint = q('.hint')

    // geometria (px), refeita no resize
    let G = 0
    let notes = [] // { el, x, cx, y, line, lyric, lyX }
    let letters = [] // { el, x, cx, y, line }
    let bar1 = 0
    let barEnd = 0
    const NS = 'http://www.w3.org/2000/svg'
    const line = (svg, cls, x1, y1, x2, y2) => {
      const l = document.createElementNS(NS, 'line')
      l.setAttribute('class', cls)
      Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v))
      svg.append(l)
      return l
    }
    let bars1 = []
    let bars2 = []
    let head1 = null
    let head2 = null

    function measure({ vw, vh }) {
      G = Math.max(12, Math.min(vw * 0.024, vh * 0.034, 34))
      const W = sys1.clientWidth
      const pad1 = G * 2.1
      const pad2 = G * 2.6
      const lineY = (pad, i) => pad + i * G
      const pitchY = (pad, k) => pad + 4 * G - (k * G) / 2
      const nearest = (k) => Math.min(4, Math.max(0, Math.round((8 - k) / 2)))
      sys1.style.height = `${pad1 + 4 * G + G * 2.8}px`
      sys2.style.height = `${pad2 + 4 * G + G * 1.4}px`

      // sistema 1: cada nota e a palavra da letra embaixo dividem uma "casa" (a mais larga manda)
      const x0 = G * 1.6 + G * 1.4
      const gap = G * 0.9
      const barGap = G * 0.8
      let k = 1
      let xs = []
      for (let pass = 0; pass < 3; pass++) {
        nws.forEach((el) => { el.style.fontSize = `${G * 1.3 * k}px` })
        lys.forEach((el) => { el.style.fontSize = `${G * 1.35 * k}px` })
        let x = x0
        xs = NOTES.map((_, i) => {
          if (i === 4) x += barGap * 2
          const at = x
          x += Math.max(nws[i].offsetWidth, lys[i].offsetWidth) + gap
          return at
        })
        if (x <= W * 0.98) break
        k *= (W * 0.98 - x0) / (x - x0)
      }
      bar1 = xs[4] - barGap
      notes = NOTES.map(([, pitch], i) => {
        const el = nws[i]
        const f = parseFloat(el.style.fontSize)
        const y = pitchY(pad1, pitch)
        const top = y - BASE * f * (el.classList.contains('s5-serif') ? 1.12 : 1)
        lys[i].style.left = `${xs[i]}px`
        lys[i].style.top = `${pad1 + 4 * G + G * 1.15}px`
        return { el, x: xs[i], top, cx: xs[i] + el.offsetWidth / 2, line: nearest(pitch), lyric: lys[i] }
      })
      meter.style.cssText = `left:${G * 0.6}px; top:${pad1}px; height:${4 * G}px; font-size:${G * 2.1}px`
      st1.x1 = W
      st1.strs.forEach((s, i) => { s.y = lineY(pad1, i) })
      st1.svg.setAttribute('width', W)
      st1.svg.setAttribute('height', sys1.clientHeight)
      st1.svg.querySelectorAll('line').forEach((l) => l.remove())
      bars1 = [line(st1.svg, 'bar', bar1, pad1, bar1, pad1 + 4 * G), line(st1.svg, 'bar', W - 0.5, pad1, W - 0.5, pad1 + 4 * G)]
      head1 = line(st1.svg, 'head', 0, pad1 - G * 1.2, 0, pad1 + 4 * G + G * 0.4)

      // sistema 2 (coda): as letras em alturas de nota, barra dupla no fim
      const fC = G * 3.2
      let x = G * 0.6
      letters = [...CODA].map((_, i) => {
        const el = nls[i]
        el.style.fontSize = `${fC}px`
        const at = x
        x += el.offsetWidth + G * 0.12
        const y = pitchY(pad2, CODA_K[i])
        return { el, x: at, top: y - BASE * fC, cx: at + el.offsetWidth / 2, line: nearest(CODA_K[i]) }
      })
      barEnd = x + G * 1.4
      tempo.style.cssText += `;left:${G * 0.6}px; top:${pad2 - G * 2.3}px; font-size:${G * 1.5}px`
      fine.style.left = `${barEnd - 28}px`
      fine.style.top = `${pad2 - G * 1.1}px`
      st2.x1 = barEnd
      st2.strs.forEach((s, i) => { s.y = lineY(pad2, i) })
      st2.svg.setAttribute('width', barEnd + 6)
      st2.svg.setAttribute('height', sys2.clientHeight)
      st2.svg.querySelectorAll('line').forEach((l) => l.remove())
      bars2 = [line(st2.svg, 'bar', barEnd - 7, pad2, barEnd - 7, pad2 + 4 * G), line(st2.svg, 'bar-end', barEnd, pad2, barEnd, pad2 + 4 * G)]
      head2 = line(st2.svg, 'head', 0, pad2 - G * 1.2, 0, pad2 + 4 * G + G * 0.4)
    }

    // com mouse: o cursor que cruza uma linha a toca
    let last = null
    addEventListener('pointermove', (e) => {
      if (!FINE || e.pointerType !== 'mouse') return
      const now = performance.now()
      if (last) {
        for (const st of [st1, st2]) {
          const r = st.svg.getBoundingClientRect()
          const x = e.clientX - r.left
          if (x < 0 || x > st.x1 * st.draw) continue
          const y0 = last[1] - r.top
          const y1 = e.clientY - r.top
          st.strs.forEach((s, i) => {
            if ((y0 - s.y) * (y1 - s.y) < 0) pluck(st, i, x, Math.min(9, 2 + Math.abs(y1 - y0) * 0.25), now)
          })
        }
      }
      last = [e.clientX, e.clientY]
    })

    let prevP = 0
    const ringUntil = new Map()
    const ring = (el, now) => ringUntil.set(el, now + RING_MS)
    const win = ([a, b], i, n) => {
      const step = n > 1 ? ((b - a) * (1 - WORD_DUR)) / (n - 1) : 0
      return [a + i * step, a + i * step + (b - a) * WORD_DUR]
    }
    const crossed = (t, p) => prevP < t && p >= t

    return {
      length: LENGTH,
      measure,
      update(p, { now, v }) {
        // pautas se desenham
        st1.draw = easeInOut(ramp(p, ...P.staff1))
        st2.draw = easeInOut(ramp(p, ...P.staff2))
        bars1.forEach((b) => b.style.setProperty('opacity', st1.draw >= 1 ? 1 : 0))
        meter.style.opacity = easeOut(ramp(p, P.staff1[1] - 0.15, P.staff1[1]))

        // notas pousam (e a corda delas soa no pouso)
        notes.forEach((n, i) => {
          const [a, b] = win(P.notes, i, notes.length)
          const t = ramp(p, a, b)
          const ride = disp(st1.strs[n.line], n.cx, now) * 0.8
          n.el.style.opacity = clamp01(t * 3)
          n.el.style.transform = `translate(${n.x}px, ${n.top + (1 - backOut(t)) * -G * 1.6 + ride}px)`
          if (crossed(a + (b - a) * 0.75, p)) pluck(st1, n.line, n.cx, 6, now)
        })
        // a letra da música entra; "lendo" é riscado
        lys.forEach((el, i) => {
          const [a, b] = win(P.lyrics, i, lys.length)
          el.style.setProperty('--in', easeOut(ramp(p, a, b)))
        })
        const sk = ramp(p, ...P.strike)
        strikeW.style.setProperty('--draw', easeInOut(sk))
        strikeW.classList.toggle('is-hollow', sk > 0.6)

        // coda
        tempo.style.setProperty('--in', easeOut(ramp(p, ...P.tempo)))
        letters.forEach((n, i) => {
          const [a, b] = win(P.coda, i, letters.length)
          const t = ramp(p, a, b)
          const ride = disp(st2.strs[n.line], n.cx, now) * 0.8
          n.el.style.opacity = clamp01(t * 3)
          n.el.style.transform = `translate(${n.x}px, ${n.top + (1 - backOut(t)) * -G * 2 + ride}px)`
          if (crossed(a + (b - a) * 0.75, p)) pluck(st2, n.line, n.cx, 7, now)
        })

        // a cabeça de leitura toca a partitura: sistema 1 e depois a coda
        const u = ramp(p, ...P.play)
        const u1 = ramp(u, 0, SPLIT)
        const u2 = ramp(u, SPLIT, 1)
        const x1 = notes.length ? notes[0].x - G * 0.6 + u1 * (st1.x1 - notes[0].x + G * 0.6) : 0
        const x2 = u2 * barEnd
        const prevU = ramp(prevP, ...P.play)
        const px1 = notes.length ? notes[0].x - G * 0.6 + ramp(prevU, 0, SPLIT) * (st1.x1 - notes[0].x + G * 0.6) : 0
        const px2 = ramp(prevU, SPLIT, 1) * barEnd
        head1.style.opacity = u1 > 0 && u1 < 1 ? 1 : 0
        head2.style.opacity = u2 > 0 && u2 < 1 ? 1 : 0
        head1.setAttribute('x1', x1); head1.setAttribute('x2', x1)
        head2.setAttribute('x1', x2); head2.setAttribute('x2', x2)
        notes.forEach((n) => {
          n.lyric.classList.toggle('lit', u1 > 0 && x1 >= n.cx)
          if (px1 < n.cx && x1 >= n.cx && p > prevP) { ring(n.el, now); pluck(st1, n.line, n.cx, 8, now) }
        })
        letters.forEach((n) => {
          if (px2 < n.cx && x2 >= n.cx && p > prevP) { ring(n.el, now); pluck(st2, n.line, n.cx, 9, now) }
        })
        for (const [el, until] of ringUntil) {
          el.classList.toggle('ring', now < until)
          if (now >= until) ringUntil.delete(el)
        }

        // fim: barra dupla, "fine"
        const e = ramp(p, ...P.end)
        bars2.forEach((b) => b.style.setProperty('opacity', e))
        fine.style.setProperty('--in', easeOut(e))
        if (crossed(P.end[0] + 0.05, p)) st2.strs.forEach((_, i) => pluck(st2, i, barEnd, 8, now))

        // player (resposta à velocidade de quem rola, como na seção 5)
        const done = e >= 1
        const playing = !done && v > 0.5
        player.classList.toggle('is-playing', playing)
        plState.textContent = done ? 'fine' : playing ? 'tocando' : 'pausa'
        eq.forEach((b, i) => { b.style.transform = `scaleY(${playing ? Math.min(1, 0.15 + (v / 40) * (0.6 + 0.4 * Math.sin(now / 90 + i * 1.7))) : 0.15})` })
        bpm.textContent = String(Math.min(240, Math.round(v * 6))).padStart(3, '0')
        hint.textContent = done ? 'fine.' : 'role para tocar ↓'

        renderStaff(st1, now)
        renderStaff(st2, now)
        prevP = p
        return p < P.lyrics[0] ? 'escrita na pauta' : p < P.staff2[0] ? 'a letra' : p < P.play[0] ? 'coda' : done ? 'fine' : 'tocando'
      },
    }
  },
})
