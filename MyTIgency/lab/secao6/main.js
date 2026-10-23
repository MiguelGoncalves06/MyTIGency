// LAB — seção 6, v1: "Wrapped da visita". Linha do tempo (alturas de tela
// de scroll depois do deslocamento lateral):
//   stats — a passagem de quem lê entra pela direita (linhas lidas, tempo,
//           px rolados, caminho do cursor, pausas) e fica AO VIVO;
//   b1    — "Cada linha foi escrita / e posicionada exatamente assim." sobe
//           palavra a palavra; depois aparecem a posição real (x, em px) de
//           cada palavra e as linhas de base — a frase mostra que foi posicionada;
//   b2    — "Você não está lendo / sobre o nosso trabalho."; o pincel da cena
//           A risca "lendo", que fica oca;
//   b3    — "você está / VIVENCIANDO." e, no fio de baixo, a forma de onda do
//           scroll da própria pessoa se desenha até "você está aqui".
// Posição = função do scroll (volta quando o scroll volta); os números e a
// onda são RESPOSTA, em tempo real.
import { mountLab, ramp, easeOut, easeInOut, clock, fmt, visit, strikeSvg, esc, FINE } from './base.js'

const B1 = [[['Cada'], ['linha', 'serif'], ['foi'], ['escrita', 'wide']], [['e', 'serif'], ['posicionada', 'heavy'], ['exatamente'], ['assim.']]]
const B2 = [[['Você'], ['não'], ['está'], ['lendo', 'strike']], [['sobre'], ['o', 'serif'], ['nosso'], ['trabalho.', 'wide']]]
const B3 = [[['você', 'serif'], ['está', 'serif']], [['vivenciando.', 'big']]]
const SENTENCE = 'Cada linha foi escrita e posicionada exatamente assim. Você não está lendo sobre o nosso trabalho. Você está vivenciando.'
const LINES_BEFORE = 4 // linhas do Manifesto já vistas até a fermata (seções 1–5)
const LINES_TOTAL = 7

// fases (alturas de tela); LENGTH = scroll da cena inteira
const P = {
  stats: [0, 0.4],
  b1: [0.05, 0.75], guides: [0.7, 1.05], b1Out: [1.2, 1.45],
  b2: [1.35, 1.8], strike: [1.85, 2.1], b2Out: [2.25, 2.5],
  b3: [2.4, 2.85], wave: [2.6, 3.15],
}
const LENGTH = 3.45
const WORD_DUR = 0.22 // fração de cada palavra dentro da janela de entrada

function wordHtml([text, role]) {
  if (role === 'big') return [...text].map((ch) => `<span class="ww">${esc(ch)}</span>`).join('')
  if (role === 'strike') return `<span class="ww strike-w">${esc(text)}${strikeSvg()}</span>`
  return `<span class="ww${role ? ` s5-${role}` : ''}">${esc(text)}</span>`
}
const beatHtml = (lines, cls) => `<div class="beat ${cls}">${lines.map((l) => `<p class="l${l[0][1] === 'big' ? ' l--big' : ''}">${l.map(wordHtml).join(' ')}</p>`).join('')}</div>`

mountLab({
  title: 'LAB — Seção 6 · v1 Wrapped',
  links: [['./', 'v1 · wrapped da visita', true], ['./v2/', 'v2 · a pauta'], ['./v3/', 'v3 · o editor']],
  scene(host) {
    host.innerHTML = `
      <h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${esc(SENTENCE)}</h2>
      <div class="s6-poster w6" aria-hidden="true">
        <div class="s5-rule"><span class="s5-pill">( 06 )</span><i class="s5-sig"></i>
          <span class="s5-mono">sua passagem · <b>ao vivo</b></span><i></i>
          <span class="s5-mono">medido agora · nada sai do seu navegador</span><i class="s5-sig"></i>
          <span class="s5-pill rec"><i></i>rec</span></div>
        <div class="w6-body">
          <div class="w6-copy">
            ${beatHtml(B1, 'b1')}${beatHtml(B2, 'b2')}${beatHtml(B3, 'b3')}
          </div>
          <aside class="w6-stats">
            <p class="mono st-h">sua passagem pelo manifesto</p>
            <div class="st st-lines"><span class="mono">linhas</span><b data-k="lines">4/7</b></div>
            <div class="st"><span class="mono">tempo aqui</span><b data-k="time">00:00</b></div>
            <div class="st"><span class="mono">você rolou</span><b data-k="scroll">0 px</b></div>
            <div class="st"><span class="mono">${FINE ? 'seu cursor andou' : 'toques'}</span><b data-k="pointer">0</b></div>
            <div class="st"><span class="mono">pausas</span><b data-k="pauses">0</b></div>
          </aside>
        </div>
        <div class="s5-rule"><span class="s5-pill">faixa 06</span><canvas class="w6-wave"></canvas><span class="s5-mono hint">role ↓</span></div>
      </div>`

    const q = (s) => host.querySelector(s)
    const beats = ['.b1', '.b2', '.b3'].map((s) => q(s))
    const words = beats.map((b) => [...b.querySelectorAll('.ww')])
    const rows = [...host.querySelectorAll('.st')]
    const val = Object.fromEntries([...host.querySelectorAll('[data-k]')].map((el) => [el.dataset.k, el]))
    const linesRow = q('.st-lines')
    const strikeW = q('.strike-w')
    const hint = q('.hint')
    const wave = q('.w6-wave')
    const wctx = wave.getContext('2d')

    // guias da b1: medidas por offsetLeft/offsetTop (layout puro, sem os transforms da entrada)
    const guides = document.createElement('div')
    guides.className = 'guides'
    beats[0].append(guides)
    let marks = []
    function measure() {
      const dpr = Math.min(2, devicePixelRatio || 1)
      wave.width = Math.round(wave.clientWidth * dpr)
      wave.height = Math.round(wave.clientHeight * dpr)
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      guides.innerHTML = ''
      const els = []
      const lines = [...beats[0].querySelectorAll('.l')]
      lines.forEach((line, li) => {
        const fs = parseFloat(getComputedStyle(line).fontSize)
        const base = Math.round(line.offsetTop + fs * 0.8)
        const g = document.createElement('div')
        g.className = 'g-base'
        g.style.top = `${base}px`
        g.innerHTML = `<span class="mono">base 0${li + 1} · y ${base}</span>`
        guides.append(g)
        els.push(g)
        for (const w of line.querySelectorAll('.ww')) {
          const x = document.createElement('span')
          x.className = 'g-x mono'
          x.textContent = `x ${w.offsetLeft}`
          x.style.left = `${w.offsetLeft}px`
          x.style.top = `${line.offsetTop - 16}px`
          guides.append(x)
          els.push(x)
        }
      })
      marks = els
    }

    // forma de onda: o scroll da pessoa (amostras reais), desenhada até `prog`
    function drawWave(prog) {
      const w = wave.clientWidth
      const h = wave.clientHeight
      wctx.clearRect(0, 0, w, h)
      wctx.fillStyle = 'rgba(244,243,239,.24)'
      wctx.fillRect(0, h / 2, w, 1)
      if (prog <= 0) return
      const n = Math.max(1, Math.floor(w / 4))
      const s = visit.samples
      const max = Math.max(20, ...s)
      const upTo = Math.floor(n * prog)
      for (let i = 0; i < upTo; i++) {
        const a = Math.floor((i / n) * s.length)
        const b = Math.max(a + 1, Math.floor(((i + 1) / n) * s.length))
        let m = 0
        for (let k = a; k < b && k < s.length; k++) m = Math.max(m, s[k])
        const bh = Math.max(1, (m / max) * (h - 4))
        wctx.fillStyle = i === upTo - 1 ? '#FF4438' : 'rgba(207,207,200,.75)'
        wctx.fillRect(i * 4, (h - bh) / 2, 2, bh)
      }
    }

    const enter = (list, p, [a, b]) => {
      const span = b - a
      const step = list.length > 1 ? (span * (1 - WORD_DUR)) / (list.length - 1) : 0
      list.forEach((el, i) => el.style.setProperty('--in', easeOut(ramp(p, a + i * step, a + i * step + span * WORD_DUR))))
      return ramp(p, a, b)
    }
    const setText = (el, t) => { if (el.textContent !== t) el.textContent = t }

    return {
      length: LENGTH,
      measure,
      update(p) {
        rows.forEach((r, i) => r.style.setProperty('--in', easeOut(ramp(p, P.stats[0] + i * 0.06, P.stats[0] + i * 0.06 + 0.16))))
        const b1 = enter(words[0], p, P.b1)
        marks.forEach((m, i) => m.style.setProperty('--g', easeOut(ramp(p, P.guides[0] + i * 0.015, P.guides[0] + i * 0.015 + 0.15))))
        beats[0].style.setProperty('--out', easeInOut(ramp(p, ...P.b1Out)))
        const b2 = enter(words[1], p, P.b2)
        const st = ramp(p, ...P.strike)
        strikeW.style.setProperty('--draw', easeInOut(st))
        strikeW.classList.toggle('is-hollow', st > 0.6)
        beats[1].style.setProperty('--out', easeInOut(ramp(p, ...P.b2Out)))
        const b3 = enter(words[2], p, P.b3)

        // ao vivo
        const read = LINES_BEFORE + (b1 > 0.5) + (b2 > 0.5) + (b3 > 0.5)
        setText(val.lines, `${read}/${LINES_TOTAL}`)
        linesRow.classList.toggle('is-full', read === LINES_TOTAL)
        setText(val.time, clock(performance.now() - visit.t0))
        setText(val.scroll, `${fmt(visit.scrolled)} px`)
        const cm = visit.pointer / 37.8 // 1 cm CSS = 37,8 px (o tamanho físico depende da tela: ≈)
        setText(val.pointer, FINE ? (cm >= 100 ? `≈ ${(cm / 100).toFixed(1).replace('.', ',')} m` : `≈ ${Math.round(cm)} cm`) : fmt(visit.taps))
        setText(val.pauses, fmt(visit.pauses))

        const wp = easeInOut(ramp(p, ...P.wave))
        drawWave(wp)
        setText(hint, wp >= 1 ? 'você está aqui ●' : 'role ↓')

        return p < P.b1Out[0] ? 'escrita e posicionada' : p < P.b2Out[0] ? 'não está lendo' : 'vivenciando'
      },
    }
  },
})
