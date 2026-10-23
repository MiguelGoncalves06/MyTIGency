// Seção 5 do Manifesto ("Repare no ritmo desta página. Nada surge antes da
// hora."), portada do /lab/secao5/v4. O DOM é montado aqui, a partir dos
// textos (strings.js → act2.b), dentro de .s5; o hook (useManifestoHorizontal)
// remonta quando o idioma muda.
//
// Linha do tempo, em px de scroll a partir do fim da cena A (d5):
//   shift — o deslocamento da faixa (manifestoAct2); a frase 1 entra letra a
//           letra. O cursor 3D sai do lado do olho num arco até em cima da
//           palavra na pauta; a faixa, ao passar, troca o 3D pela mão em pixel
//           NA BORDA dela (mesmo dither do cursor 3D).
//   reach — no alto, a VIRADA (a mão gira como carta e passa a apontar para
//           baixo); desce dedilhando as cordas (cada corda tocada acende em
//           vermelho, o pulso sai do dedo, a letra acende, sai uma nota) e
//           segue até a régua do rodapé.
//   grab  — antecipa, aperta (marca de clique) e a mão vira punho.
//   drag  — o punho arrasta a régua (presa a ele) até a direita da frase 1; ela
//           se fecha como fita métrica; a câmera anda junto.
//   sweep — sem etapas: o punho se desfaz e os pixels voam para a palavra em
//           pixel enquanto a cabeça da régua corre; cada palavra da frase 2
//           emerge quando a cabeça passa.
//   end   — o relógio gira e assenta; o marca-texto passa por trás; a caneta
//           desenha a fermata (segure). O player fica em fermata e a dica vira
//           "a tempo".
// Tudo o que é posição é função pura do scroll; o que é RESPOSTA (cordas,
// notas, faíscas, player) e o ponteiro dos segundos andam no tempo real.

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - (1 - t) ** 3
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeInOutInv = (y) => (y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2) // x tal que easeInOut(x) = y
const sineInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2
const backOut = (t) => (t <= 0 ? 0 : 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2)
const lerp = (a, b, t) => a + (b - a) * t
const bez = (p0, p1, p2, p3, u) => {
  const k = 1 - u
  return [0, 1].map((i) => k * k * k * p0[i] + 3 * k * k * u * p1[i] + 3 * k * u * u * p2[i] + u * u * u * p3[i])
}

// Fases depois do deslocamento, em alturas de tela de scroll
const VH = { reach: 0.6, grab: 0.3, drag: 1.2, sweep: 2.4, end: 1.0 }
const REDUCED_VH = 0.3 // reduced motion: só o bastante para a seção ficar na tela
// sem etapas: o punho começa a se desfazer BURST_LEAD antes de a régua assentar
// e a cabeça parte HEAD_LEAD antes do fim do arrasto, junto com os pixels
const BURST_LEAD = 0.16
const HEAD_LEAD = 0.1
const ROW_RIGHT = 0.96 // onde a frase 2 termina depois que a câmera anda
const ROW_FIT = 0.92 // a linha inteira (frase 1 + régua + frase 2) cabe nisso
// trajeto do cursor: arco até em cima da pauta, virada, dedilha, desce à régua
const APEX_LIFT = 0.2 // quanto acima da pauta fica o alto do arco (alturas de tela)
const VIRADA = 0.08 // meia-duração da virada em torno do alto (alturas de tela de scroll)
const AWAY_DIR = 0.22 // direção do cursor ao lado do olho (useManifestoHorizontal)
const GRAB_AT = 0.68 // onde o punho segura a régua (entre "traço" e "quem")
const GRIP_Y = 30 // px do topo da régua até onde o punho a segura
const HAND_SCALE = 0.55 // altura da mão/punho em relação ao cursor 3D ao lado do olho
const DRAG_LEAD = 0.3 // o arrasto começa nesta fração final do aperto (sem pausa)
// régua se fechando como fita métrica: as pontas recolhem acelerando entre
// SHUT[0] e SHUT[1] do arrasto, passam um pouco do tamanho final e voltam
const SHUT = [0.05, 0.6]
const SNAP = 0.07
// frase 1: cada letra sobe da máscara, gira e assenta; a palavra na pauta entra inteira
const UNIT_DUR = 0.3
const WORD_DIM = 0.15
// cordas: harmônico de cada linha e sentido da onda; amplitude máxima (viewBox, linhas a cada 10)
const STRING_N = [2, 3, 2.5, 3.5, 2]
const STRING_DIR = [1, -1, 1, -1, 1]
const AMP_MAX = 4.5
// letras da pauta: corda em que cada uma pousa e altura de nota parada (em); quanto andam a mais
const NOTE_LINE = [3, 1, 2, 0, 2, 3]
const NOTE_BASE = [0.02, -0.1, 0.06, -0.15, -0.04, 0.03]
const RIDE = 1.6
// toque da mão numa corda: duração do vermelho (ms), velocidade e força do pulso
const PLUCK_GLOW = 420
const PLUCK_SPEED = 1.3
const PLUCK_AMP = 7

// dither do cursor 3D (cursor3d.js): 4 cinzas, Bayer 8×8, células de 3 px na tela, borda vermelha
const PAL = ['#141414', '#5f5f5f', '#b9b9b9', '#ffffff']
const RIM = '#ff4438'
const DCELL = 3
const fr = (v) => v - Math.floor(v)
const b2 = (x, y) => { x = Math.floor(x); y = Math.floor(y); return fr(x * 0.5 + y * y * 0.75) }
const b8 = (x, y) => b2(x * 0.25, y * 0.25) * 0.0625 + b2(x * 0.5, y * 0.5) * 0.25 + b2(x, y)

// Mão de link (k contorno, w miolo), apontando para cima; girada para a direita
// (como o cursor ao lado do olho). Ponta do dedo: coluna 20, linha 7 da girada.
const HAND_UP = [
  '......kk.........',
  '.....kwwk........',
  '.....kwwk........',
  '.....kwwk........',
  '.....kwwk........',
  '.....kwwkkk......',
  '.....kwwkwwkkk...',
  '.....kwwkwwkwwkk.',
  '.kk..kwwkwwkwwkwk',
  'kwwk.kwwwwwwwwkwk',
  'kwwwkkwwwwwwwwwwk',
  '.kwwwkwwwwwwwwwwk',
  '..kwwwwwwwwwwwwwk',
  '..kwwwwwwwwwwwwwk',
  '...kwwwwwwwwwwwwk',
  '...kwwwwwwwwwwwk.',
  '....kwwwwwwwwwwk.',
  '....kwwwwwwwwwk..',
  '.....kwwwwwwwwk..',
  '.....kwwwwwwwwk..',
  '.....kkkkkkkkkk..',
]
const HAND = [...HAND_UP[0]].map((_, c) => HAND_UP.map((row) => row[c]).reverse().join(''))
const HAND_TIP = [HAND_UP.length - 1, 7]
// Punho de "arrastando". Centro: coluna 8, linha 7.
const FIST = [
  '.....kk.kk.kk....',
  '....kwwkwwkwwkk..',
  '..kkkwwkwwkwwkwk.',
  '.kwwkwwkwwkwwkwk.',
  '.kwwkwwwwwwwwkwk.',
  '.kwwwwwwwwwwwwwk.',
  'kwwwwwwwwwwwwwwk.',
  'kwwwwwwwwwwwwwwk.',
  '.kwwwwwwwwwwwwwk.',
  '..kwwwwwwwwwwwk..',
  '..kwwwwwwwwwwwk..',
  '...kwwwwwwwwwk...',
  '...kwwwwwwwwwk...',
  '....kkkkkkkkk....',
]
const FIST_C = [8, 7]
// notas em pixel (as que saem das cordas tocadas)
const NOTES = [
  ['...#..', '...##.', '...#.#', '...#..', '...#..', '.###..', '####..', '.##...'],
  ['..######', '..######', '..#....#', '..#....#', '..#....#', '.##...##', '###..###', '.#....#.'],
]
// fonte de pixel 5×7 (as letras das palavras em pixel: SURGE, APPEARS)
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
}

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// desenho em pixel → grade de luminância para o dither (luz de cima/esquerda;
// o contorno do lado de trás pega a luz vermelha, como no cursor 3D)
function shadeOf(art) {
  const rows = art.length
  const cols = art[0].length
  const grid = art.map((row, r) => [...row].map((ch, c) => {
    if (ch === '.') return null
    const k = ch === 'k'
    const shade = !k && (row[c + 1] === 'k' || art[r + 1]?.[c] === 'k')
    const light = 1.08 - 0.5 * (r / rows) - 0.18 * (c / cols)
    const rim = k && (row[c - 1] === '.' || row[c - 1] === undefined) && r > rows * 0.15
    return { l: (k ? 0.22 : shade ? 0.62 : 0.95) * light, rim }
  }))
  const cells = []
  grid.forEach((row, r) => row.forEach((g, c) => { if (g) cells.push({ c, r, ...g }) }))
  return { grid, rows, cols, cells }
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
// [x] = letra em itálico
const italics = (s) => esc(s).replace(/\[(.+?)\]/g, '<span class="s5-ital">$1</span>')
const CLOCK = '<svg class="s5-clock" viewBox="-50 -50 100 100"><circle class="ring" r="43"/><g class="ticks"></g>'
  + '<line class="hand h" x1="0" y1="0" x2="0" y2="-19"/><line class="hand m" x1="0" y1="0" x2="0" y2="-29"/>'
  + '<line class="hand s" x1="0" y1="6" x2="0" y2="-33"/><circle class="pin" r="5"/></svg>'
const FERMATA = '<svg class="s5-fermata" viewBox="0 0 100 60"><path class="arc" pathLength="1" d="M7 54C9 14 91 14 93 54"/><circle class="dot" cx="50" cy="45" r="8"/></svg>'
const NOTE_SVG = '<svg class="s5-note" viewBox="0 0 50 56"><path d="M14 8 46 2v8L14 16Z" stroke="none"/><path d="M15 9v36M45 3v36" fill="none" stroke-width="4"/>'
  + '<ellipse cx="8" cy="46" rx="8" ry="6" transform="rotate(-20 8 46)" stroke="none"/><ellipse cx="38" cy="40" rx="8" ry="6" transform="rotate(-20 38 40)" stroke="none"/></svg>'

function wordHtml([text, role], cls) {
  if (role === 'staff') {
    const letters = [...text].map((ch, i) => `<span class="s5-note-l" style="--b:${NOTE_BASE[i % NOTE_BASE.length]}em">${esc(ch)}</span>`).join('')
    return `<span class="${cls} s5-staff"><svg class="s5-strings" viewBox="0 0 100 40" preserveAspectRatio="none"></svg>${letters}${NOTE_SVG}</span>`
  }
  if (role === 'pixel') return `<span class="s5-px" data-word="${esc(text.toUpperCase())}"></span>`
  if (role === 'clock') return `<span class="${cls} s5-hora">${FERMATA}${esc(text).replace(/\((.+?)\)/, CLOCK)}</span>`
  return `<span class="${cls}${role ? ` s5-${role}` : ''}">${italics(text)}</span>`
}

/**
 * @param host  .s5 (data-s5 = textos da seção, strings.js → act2.b)
 * @param opts  { ruler?: a régua do rodapé (.ms-ruler) — só no desktop }
 */
export function mountS5(host, { ruler = null } = {}) {
  const data = JSON.parse(host.dataset.s5)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = matchMedia('(pointer: fine)').matches
  const line = (words, cls) => `<p class="s5-line">${words.map((w) => wordHtml(w, cls)).join(' ')}</p>`
  host.innerHTML = '<div class="s5-poster">'
    + '<div class="s5-rule"><span class="s5-pill">( 05 )</span><i class="s5-sig"></i>'
    + `<span class="s5-mono s5-keep">${esc(data.score[0])} <b>${esc(data.score[1])}</b></span><i></i>`
    + `<span class="s5-mono">${esc(data.score[2])}</span><i class="s5-sig"></i>`
    + '<span class="s5-meter"><span>4</span><span>4</span></span></div>'
    + '<div class="s5-row">'
    + `<div class="s5-block s5-a">${data.before.map((l) => line(l, 's5-pw')).join('')}</div>`
    + '<div class="s5-slot"></div>'
    + `<div class="s5-block s5-b">${data.after.map((l) => line(l, 's5-w')).join('')}</div>`
    + '</div>'
    + '<div class="s5-rule"><span class="s5-pill s5-player">'
    + '<svg class="s5-ic-play" viewBox="0 0 8 9"><path d="M0 0 8 4.5 0 9Z"/></svg><svg class="s5-ic-pause" viewBox="0 0 8 9"><path d="M0 0h3v9H0zM5 0h3v9H5z"/></svg>'
    + `<span class="s5-state">${esc(data.player.paused)}</span> · ${esc(data.player.track)} <span class="s5-eq"><i></i><i></i><i></i><i></i><i></i></span><span><b class="s5-bpm">000</b> bpm</span></span><i></i>`
    + `<span class="s5-mono s5-hint">${esc(data.hint[0])}</span></div>`
    + '</div>'

  const q = (s) => host.querySelector(s)
  const sceneB = host.closest('.ma-b') ?? host
  const blockA = q('.s5-a')
  const blockB = q('.s5-b')
  const slot = q('.s5-slot')
  const staff = q('.s5-staff')
  const stringsSvg = q('.s5-strings')
  const letters = [...staff.querySelectorAll('.s5-note-l')]
  const pxWord = q('.s5-px')
  const PX_WORD = pxWord.dataset.word
  const PX_COLS = PX_WORD.length * 6 - 1
  const cue = [...q('.s5-b').querySelectorAll('.s5-w, .s5-px')] // ordem da frase 2
  const hora = q('.s5-hora')
  const fermata = q('.s5-fermata')
  const clockH = q('.s5-clock .h')
  const clockM = q('.s5-clock .m')
  const clockS = q('.s5-clock .s')
  const player = q('.s5-player')
  const plState = q('.s5-state')
  const eqBars = [...host.querySelectorAll('.s5-eq i')]
  const bpmEl = q('.s5-bpm')
  const hint = q('.s5-hint')
  // onde (fração da varredura) cada palavra da frase 2 emerge; a de pixel se monta em volta da dela
  const WORD_AT = cue.map((_, i) => 0.1 + (0.8 * i) / Math.max(1, cue.length - 1))
  const pxAt = WORD_AT[cue.indexOf(pxWord)]
  const SURGE_AT = [pxAt - 0.1, pxAt + 0.1]

  q('.s5-clock .ticks').innerHTML = Array.from({ length: 12 }, (_, i) => {
    const qq = i % 3 === 0
    return `<line class="tick${qq ? ' q' : ''}" x1="0" y1="${qq ? -24 : -27}" x2="0" y2="-33" transform="rotate(${i * 30})"/>`
  }).join('')
  const ticks = [...host.querySelectorAll('.s5-clock .tick')]
  stringsSvg.innerHTML = STRING_N.map(() => '<path/>').join('')
  const stringEls = [...stringsSvg.querySelectorAll('path')]

  // frase 1: cada letra num span (menos a palavra na pauta, que entra inteira)
  const units = []
  for (const w of blockA.querySelectorAll('.s5-pw')) {
    if (w === staff) { units.push({ el: w, staff: true }); continue }
    for (const node of [...w.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment()
        for (const ch of node.textContent) {
          // espaço fica texto (num inline-block ele some: "of this" virava "ofthis")
          if (ch === ' ') { frag.append(' '); continue }
          const s = document.createElement('span')
          s.className = 's5-ch'
          s.textContent = ch
          frag.append(s)
          units.push({ el: s })
        }
        node.replaceWith(frag)
      } else { node.classList.add('s5-ch'); units.push({ el: node }) } // letra em itálico
    }
  }

  const hand = shadeOf(HAND)
  const fist = shadeOf(FIST)
  const wordCells = []
  ;[...PX_WORD].forEach((ch, li) => (GLYPHS[ch] ?? GLYPHS.E).forEach((row, r) => [...row].forEach((v, c) => {
    if (v === '#') wordCells.push({ c: li * 6 + c, r })
  })))

  // ----- só no desktop: canvas, régua, faíscas -----
  const desk = !!ruler
  const cv = desk ? Object.assign(document.createElement('canvas'), { className: 's5-cv' }) : null
  const px = cv?.getContext('2d')
  // mão e punho numa camada própria: o brilho (drop-shadow) é o do cursor 3D
  const hv = desk ? Object.assign(document.createElement('canvas'), { className: 's5-cv' }) : null
  const hx = hv?.getContext('2d')
  const impact = desk ? document.createElement('div') : null
  if (desk) {
    cv.setAttribute('aria-hidden', 'true')
    hv.setAttribute('aria-hidden', 'true')
    document.body.append(cv, hv)
    impact.className = 'ms-impact s5-impact'
    impact.setAttribute('aria-hidden', 'true')
    impact.innerHTML = '<svg viewBox="-50 -50 100 100">'
      + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('') + '</svg>'
    document.body.append(impact)
    ruler.insertAdjacentHTML('beforeend', '<i class="ms-ruler-cap ms-ruler-cap--l"></i><i class="ms-ruler-cap ms-ruler-cap--r"></i>')
  }
  const rScale = ruler?.querySelector('.ms-ruler-scale')
  const rFill = ruler?.querySelector('.ms-ruler-path i')
  const rHead = ruler?.querySelector('.ms-ruler-head')
  const rVal = rHead?.firstChild
  const rStops = ruler ? [...ruler.querySelectorAll('.ms-ruler-stop')] : []
  const caps = ruler ? [...ruler.querySelectorAll('.ms-ruler-cap')] : []

  // A palavra em pixel desenhada fixa. Só aparece quando o voo dos pixels (o
  // canvas, que roda no quadro do cursor 3D) não está desenhando: mobile,
  // reduced motion, ou sem WebGL — assim a palavra nunca fica faltando.
  pxWord.innerHTML = `<svg viewBox="0 0 ${PX_COLS} 7" preserveAspectRatio="none" style="display:block;width:100%;height:100%;shape-rendering:crispEdges;opacity:0">`
    + `<path fill="currentColor" d="${wordCells.map((c) => `M${c.c} ${c.r}h1v1h-1z`).join('')}"/></svg>`
  const pxStatic = pxWord.firstChild
  let framed = false // o canvas já desenhou (aí o voo é que monta a palavra)

  // medidas (px da camada do segundo ato, sem transforms; x relativo à cena B)
  let W = 1
  let H = 1
  let dpr = 1
  let dist = 0
  let P = {}
  let total = 0
  let extra = 0
  let endX = 0
  let slotL = null
  let wordL = null
  let strL = null
  let letterAt = []
  let bottomBox = null
  let HC = 4
  let PC = 8
  let parts = []
  let rFracs = [0.2, 0.5, 0.85]
  // caixa de um elemento dentro da cena B (cadeia de offset*, imune aos transforms)
  const boxIn = (el) => {
    let x = 0
    let y = 0
    for (let n = el; n && n !== sceneB; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop }
    return { x: x + sceneB.offsetLeft, y: y + sceneB.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
  }

  function buildParticles() {
    const rand = rng(5)
    const order = fist.cells.map((_, i) => i).sort(() => rand() - 0.5)
    const asWord = new Map(order.slice(0, wordCells.length).map((fi, k) => [fi, wordCells[k]]))
    parts = fist.cells.map((cell, i) => {
      const a = -Math.PI / 2 + (rand() - 0.5) * 2.4
      const dd = 30 + rand() * 90
      const t = asWord.get(i)
      return {
        o: [(cell.c - FIST_C[0]) * HC, (cell.r - FIST_C[1]) * HC],
        color: cell.rim ? RIM : PAL[Math.max(1, Math.min(3, Math.round(cell.l * 3)))],
        word: t ? [t.c * PC, t.r * PC] : null,
        frac: t ? lerp(SURGE_AT[0], SURGE_AT[1], (t.c + 0.5) / PX_COLS) : 0,
        burst: [Math.cos(a) * dd, Math.sin(a) * dd],
        cloud: [(rand() - 0.5) * 160, (rand() - 0.5) * 90 - 20],
        rise: [(rand() - 0.5) * 80, -(90 + rand() * 220)],
        dl: rand() * 0.35,
      }
    })
  }

  /**
   * vw, vh: tela; shift: deslocamento da faixa (px); endX: translate da cena B
   * no fim dele; size: altura do cursor ao lado do olho; fracs: paradas da régua
   */
  function measure({ vw, vh, shift, sceneEndX, size, fracs }) {
    W = vw
    H = vh
    dist = shift
    endX = sceneEndX
    if (fracs) rFracs = fracs
    // a régua leva o que sobra para a linha caber na tela
    const gap = parseFloat(getComputedStyle(slot.parentElement).columnGap) || 0
    const free = ROW_FIT * W - blockA.offsetWidth - blockB.offsetWidth - 2 * gap
    slot.style.width = `${Math.min(0.3 * W, Math.max(0.16 * W, free))}px`
    slotL = boxIn(slot)
    const bb = boxIn(blockB)
    extra = Math.max(0, endX + bb.x + bb.w - ROW_RIGHT * W)
    // palavra em pixel: célula = altura de versal / 7, apoiada na linha de base
    const fs = parseFloat(getComputedStyle(pxWord.parentElement).fontSize)
    PC = Math.max(4, Math.round((fs * 0.7) / 7))
    Object.assign(pxWord.style, { width: `${PX_COLS * PC}px`, height: `${7 * PC}px` })
    wordL = boxIn(pxWord)
    // a pauta (SVG absoluto no .s5-staff: left −.08em, largura +.4em, top .04em, altura .68em)
    const st = boxIn(staff)
    const em = parseFloat(getComputedStyle(staff).fontSize)
    strL = { x: st.x - 0.08 * em, y: st.y + 0.04 * em, w: st.w + 0.4 * em, h: 0.68 * em }
    letterAt = letters.map((el) => {
      const b = boxIn(el)
      return { u: clamp01((b.x + b.w / 2 - strL.x) / strL.w), unit: strL.h / 40, w: strL.w }
    })
    // fermata sobre o último caractere da palavra-relógio (o ponto, ou o relógio)
    const tail = [...hora.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.length).pop()
    const hr = hora.getBoundingClientRect()
    let fx = hr.width / 2
    if (tail) {
      const range = document.createRange()
      range.setStart(tail, tail.length - 1)
      range.setEnd(tail, tail.length)
      const pr = range.getBoundingClientRect()
      fx = pr.left + pr.width / 2 - hr.left
    } else {
      const cr = q('.s5-clock').getBoundingClientRect()
      fx = cr.left + cr.width / 2 - hr.left
    }
    fermata.style.setProperty('--fx', `${fx}px`)
    // fases (px a partir do fim da cena A)
    let at = dist
    P = { shift: 0 }
    for (const k of Object.keys(VH)) { P[k] = at; at += VH[k] * H }
    total = at
    bottomBox = { x: W * 0.03, y: H - H * 0.026 - 34, w: W * 0.94 }
    HC = Math.max(3, Math.round(((size || 0.08 * H) * HAND_SCALE) / HAND.length))
    if (cv) {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = hv.width = Math.round(W * dpr)
      cv.height = hv.height = Math.round(H * dpr)
      // o mesmo brilho do cursor 3D aceso (useManifestoHorizontal), na escala da mão
      hv.style.filter = `drop-shadow(0 0 ${(HAND.length * HC * 0.32).toFixed(1)}px rgba(244,243,239,0.4))`
    }
    buildParticles()
  }

  /** px de scroll depois do deslocamento */
  const length = (vh) => (reduce ? REDUCED_VH : Object.values(VH).reduce((a, b) => a + b, 0)) * vh
  /** em reduced motion o estado é o final assim que a seção entra */
  const at5 = (d5) => (reduce && d5 > 0 ? total : d5)

  // ----- tempos derivados do scroll -----
  const dragAt = () => P.drag - VH.grab * H * DRAG_LEAD
  const gDof = (d5) => ramp(d5, dragAt(), P.sweep)
  /** câmera extra (px) — anda com a régua no arrasto */
  const cam = (d5) => extra * easeInOut(gDof(at5(d5)))
  const B0 = () => P.sweep - BURST_LEAD * H
  const HS0 = () => P.sweep - HEAD_LEAD * H
  const HS1 = () => P.end
  const headT = (d5) => easeInOut(ramp(d5, HS0(), HS1()))
  const dAt = (y) => HS0() + easeInOutInv(y) * (HS1() - HS0()) // scroll em que a cabeça chega na fração y
  const endE = (d5) => ramp(d5, dAt(WORD_AT[WORD_AT.length - 1] - 0.02), P.end + VH.end * H)

  // ----- régua: rodapé → à direita da frase 1, presa ao punho, fechando -----
  const gripAt = (g, G0, dg) => [lerp(G0[0], dg[0], easeInOut(ramp(g, 0.15, 1))), lerp(G0[1], dg[1], easeInOut(ramp(g, 0, 0.8)))]
  const rwAt = (g, dockW) => lerp(bottomBox.w, dockW, ramp(g, SHUT[0], SHUT[1]) ** 3) * (1 - SNAP * Math.sin(Math.PI * ramp(g, SHUT[1] - 0.02, SHUT[1] + 0.15)))
  function rulerState(d5, sceneX, layerTop) {
    const gD = gDof(d5)
    const dock = { x: slotL.x + sceneX, y: slotL.y + layerTop, w: slotL.w }
    const G0 = [bottomBox.x + bottomBox.w * GRAB_AT, bottomBox.y + GRIP_Y]
    const dg = [dock.x + dock.w * GRAB_AT, dock.y + GRIP_Y]
    const grip = gripAt(gD, G0, dg)
    const rw = rwAt(gD, dock.w)
    const prev = gripAt(Math.max(0, gD - 0.03), G0, dg)
    return { gD, dock, G0, grip, prev, rw, box: { x: grip[0] - rw * GRAB_AT, y: grip[1] - GRIP_Y, w: rw } }
  }

  let owning = false
  function releaseRuler() {
    if (!owning || !ruler) return
    owning = false
    ruler.classList.remove('is-s5')
    Object.assign(ruler.style, { transform: '', transformOrigin: '', width: '' })
    if (rScale) Object.assign(rScale.style, { filter: '', transform: '' })
    caps.forEach((el) => { el.style.opacity = '' })
    rStops.forEach((el) => Object.assign(el.style, { transform: '', opacity: '' }))
    if (rHead) { rHead.style.opacity = rFill.style.opacity = ''; rHead.classList.remove('end') } // o resto (posição, %) o hook reescreve
  }

  /** o que é posição pelo scroll (DOM): frase 1, frase 2, relógio, fermata, régua.
   *  sceneX = translate da cena B; layerTop = topo da camada do segundo ato na tela */
  function update(d5raw, sceneX, layerTop = 0) {
    if (!slotL) return
    const d5 = at5(d5raw)
    // frase 1: letra a letra enquanto entra; a palavra na pauta inteira (opacidade, desfoque)
    const enter = ramp(d5, dist * 0.12, dist * 1.02)
    const step = (1 - UNIT_DUR) / Math.max(1, units.length - 1)
    units.forEach((u, i) => {
      const raw = d5raw <= 0 && !reduce ? 0 : ramp(enter, i * step, i * step + UNIT_DUR)
      if (u.staff) {
        const k = sineInOut(raw)
        u.el.style.opacity = `${lerp(WORD_DIM, 1, k)}`
        u.el.style.filter = k < 1 ? `blur(${(1 - k) * 3}px)` : ''
        u.el.style.transform = k < 1 ? `translateY(${(1 - k) * 0.06}em)` : ''
        return
      }
      const k = easeOut(raw)
      u.el.style.transform = k < 1 ? `translateY(${(1 - k) * 1.35}em) rotate(${(1 - k) * 9}deg)` : ''
      u.el.style.opacity = `${lerp(0.2, 1, k)}`
    })
    // frase 2: cada palavra emerge quando a cabeça passa
    const t = headT(d5)
    const prog = d5 >= HS0() ? t : -1
    cue.forEach((el, i) => {
      if (el !== pxWord) el.style.setProperty('--in', easeInOut(ramp(prog, WORD_AT[i] - 0.02, WORD_AT[i] + 0.1)))
    })
    // sem o voo dos pixels, a palavra em pixel entra como as outras (na batida dela)
    pxStatic.style.opacity = framed ? '0' : `${reduce ? 1 : easeInOut(ramp(prog, pxAt - 0.02, pxAt + 0.1))}`
    // relógio: gira quando a palavra surge e assenta no meio-dia com um tranco
    const e = endE(d5)
    const spin = easeInOut(ramp(e, 0, 0.5))
    const settle = ramp(e, 0.5, 0.72)
    const wob = 10 * Math.sin(settle * Math.PI * 3) * (1 - settle)
    const mA = -720 * (1 - spin) + wob
    clockM.setAttribute('transform', `rotate(${mA})`)
    clockH.setAttribute('transform', `rotate(${-60 * (1 - spin) + wob * 0.3})`)
    const m360 = ((mA % 360) + 360) % 360
    const spinning = spin > 0 && spin < 1
    ticks.forEach((el, i) => {
      const behind = (((m360 - i * 30) % 360) + 360) % 360
      el.style.opacity = spinning ? `${0.3 + 0.7 * Math.exp(-behind / 70)}` : ''
    })
    clockS.style.opacity = `${ramp(e, 0.7, 0.8)}`
    hora.style.setProperty('--mark', easeInOut(ramp(e, 0.55, 0.85)))
    fermata.style.setProperty('--draw', `${1 - easeInOut(ramp(e, 0.68, 0.86))}`)
    fermata.style.setProperty('--dot', `${backOut(ramp(e, 0.84, 0.94))}`)
    held = ramp(d5, P.end, P.end + VH.end * H) > 0.8
    if (reduce) {
      // reduced motion: estado final e parado, sem player/régua dirigidos pelo scroll
      hint.textContent = data.hint[1]
      plState.textContent = data.player.held
    }

    // régua (desktop): só nas mãos da seção 5 depois que a faixa começa
    if (!ruler || reduce) return
    if (d5raw <= 0) { releaseRuler(); return }
    if (!owning) { owning = true; ruler.classList.add('is-s5') }
    const R = rulerState(d5, sceneX, layerTop)
    const { gD, grip, prev, box } = R
    const speed = clamp01((rwAt(gD - 0.012, R.dock.w) - R.rw) / (bottomBox.w * 0.035))
    const snapT = ramp(gD, SHUT[1] - 0.02, SHUT[1] + 0.26)
    const jolt = Math.sin(snapT * Math.PI * 3) * (1 - snapT)
    const tilt = Math.max(-4, Math.min(4, (grip[0] - prev[0]) * 0.025 - (grip[1] - prev[1]) * 0.02)) + jolt * 1.2
    Object.assign(ruler.style, {
      transform: `translate(${box.x}px, ${box.y - jolt * 5}px) rotate(${tilt}deg)`,
      transformOrigin: `${GRAB_AT * 100}% ${GRIP_Y}px`,
      width: `${box.w}px`,
    })
    rScale.style.filter = speed > 0.02 ? `blur(${(speed * 1.6).toFixed(2)}px)` : ''
    rScale.style.transform = speed > 0.02 ? `scaleY(${1 - 0.5 * speed})` : ''
    const capOn = ramp(gD, SHUT[0], SHUT[0] + 0.05) * (1 - ramp(gD, SHUT[1] + 0.22, SHUT[1] + 0.32))
    caps.forEach((el, i) => {
      el.style.opacity = `${capOn}`
      el.style.transform = `rotate(${(i ? 1 : -1) * (jolt * 14 + speed * 8)}deg)`
    })
    rStops.forEach((el, i) => {
      const far = Math.abs(rFracs[i] - GRAB_AT) / Math.max(GRAB_AT, 1 - GRAB_AT)
      const fold = ramp(gD, SHUT[0] - 0.04 + (1 - far) * 0.08, SHUT[0] + 0.05 + (1 - far) * 0.08)
      const open = ramp(gD, SHUT[1] + 0.08 + far * 0.1, SHUT[1] + 0.18 + far * 0.1)
      const k = clamp01(fold - open)
      el.style.transform = k > 0 ? `translateX(-50%) perspective(70px) rotateX(${(k * 90).toFixed(1)}deg)` : ''
      el.style.opacity = k > 0 ? `${1 - 0.85 * k}` : ''
    })
    // cabeça: em 100% no rodapé; some no arrasto e volta no 000% já andando, com os pixels
    const hp = d5 < HS0() ? (gD < 0.5 ? 1 : 0) : t
    const headOn = d5 < B0() ? 1 - ramp(gD, 0.05, 0.3) : ramp(d5, B0(), HS0() + 0.08 * H)
    rHead.style.transform = `translateX(${hp * box.w}px)`
    rHead.classList.toggle('end', hp > 0.95)
    rHead.style.opacity = rFill.style.opacity = `${headOn}`
    rVal.textContent = `${String(Math.round(hp * 100)).padStart(3, '0')}%`
    rFill.style.transform = `scaleX(${hp})`
    rStops.forEach((el, i) => el.classList.toggle('on', hp >= rFracs[i] - 0.001))
  }
  let held = false

  // ----- cordas: ondas que correm com o scroll; o toque da mão acende em vermelho -----
  let amp = 0
  let kick = 0
  const plk = STRING_N.map(() => ({ t: -1e9, u: 0.5 }))
  const sparks = []
  const notes = []
  const noteRand = rng(11)
  const stringAt = (i, u, a, phase) => a * (1 - Math.abs(i - 2) * 0.12) * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * STRING_N[i] * u - phase * STRING_DIR[i] + i * 1.3)
  const heatOf = (i, now) => Math.exp(-(now - plk[i].t) / PLUCK_GLOW)
  function pulseAt(i, u, now) {
    const age = (now - plk[i].t) / 1000
    if (age < 0 || age > 1.6) return 0
    const reach = age * PLUCK_SPEED
    const front = Math.exp(-(((u - plk[i].u - reach) / 0.07) ** 2)) + Math.exp(-(((u - plk[i].u + reach) / 0.07) ** 2))
    return PLUCK_AMP * Math.exp(-age / 0.45) * Math.cos(age * 38) * front * Math.sin(Math.PI * u)
  }
  function drawStrings(phase, now) {
    const a = Math.min(AMP_MAX, amp + kick)
    const at = (i, u) => stringAt(i, u, a, phase) + pulseAt(i, u, now)
    stringEls.forEach((el, i) => {
      const y0 = i * 10
      let d = `M0 ${y0}`
      for (let x = 2; x <= 100; x += 2) d += `L${x} ${(y0 + at(i, x / 100)).toFixed(2)}`
      el.setAttribute('d', d)
      const heat = heatOf(i, now)
      el.style.strokeOpacity = `${Math.max(0.24 + Math.min(0.55, a * 0.12), heat)}`
      el.style.stroke = heat > 0.02 ? `color-mix(in srgb, #FF4438 ${(heat * 100).toFixed(0)}%, #f4f3ef)` : ''
      el.style.strokeWidth = heat > 0.02 ? `${1 + heat * 1.6}` : ''
    })
    // as letras são notas sobre as cordas: andam com a onda e acendem quando a corda é tocada
    letters.forEach((el, k) => {
      const L = letterAt[k]
      if (!L) return
      const i = NOTE_LINE[k % NOTE_LINE.length]
      const y = at(i, L.u) * RIDE * L.unit
      const slope = (at(i, Math.min(1, L.u + 0.02)) - at(i, Math.max(0, L.u - 0.02))) * L.unit / (0.04 * L.w)
      el.style.transform = `translateY(calc(var(--b) + ${y.toFixed(2)}px)) rotate(${(Math.atan(slope * RIDE) * 57.3).toFixed(2)}deg)`
      const heat = heatOf(i, now)
      el.style.color = heat > 0.02 ? `color-mix(in srgb, #FF4438 ${(heat * 100).toFixed(0)}%, currentColor)` : ''
    })
  }
  // notas guardadas em x relativo à cena B (andam junto com a pauta)
  function spawnNote(now, sceneX, strRect, at = null, color = null) {
    if (notes.length > 22) return
    const k = noteRand()
    const lineI = Math.floor(noteRand() * 5)
    const nx = noteRand()
    notes.push({
      x: (at ? at[0] : strRect.x + nx * strRect.w) - sceneX,
      y: at ? at[1] : strRect.y + (lineI / 4) * strRect.h,
      vx: (noteRand() - 0.5) * 50,
      vy: -(70 + noteRand() * 90),
      born: now,
      life: 1100 + noteRand() * 700,
      art: NOTES[noteRand() < 0.6 ? 0 : 1],
      color: color ?? (k < 0.14 ? RIM : k < 0.4 ? PAL[2] : '#f4f3ef'),
      seed: noteRand() * 10,
    })
  }
  function drawNotes(now, sceneX) {
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i]
      const t = (now - n.born) / 1000
      const life = (now - n.born) / n.life
      if (life >= 1) { notes.splice(i, 1); continue }
      if (t < 0) continue
      const cell = Math.max(2, Math.round(DCELL * (1 + 0.3 * (1 - easeOut(ramp(life, 0, 0.12))))))
      const x = n.x + sceneX + n.vx * t + Math.sin(t * 6 + n.seed) * 6
      const y = n.y + n.vy * t + 30 * t * t
      px.globalAlpha = 1 - ramp(life, 0.6, 1)
      px.fillStyle = n.color
      n.art.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch === '#') px.fillRect(Math.round(x + c * cell), Math.round(y + (r - row.length) * cell), cell, cell)
      }))
    }
    px.globalAlpha = 1
  }
  function drawSparks(now, sceneX) {
    px.strokeStyle = RIM
    px.lineCap = 'round'
    for (let n = sparks.length - 1; n >= 0; n--) {
      const s = sparks[n]
      const k = (now - s.t) / 380
      if (k >= 1) { sparks.splice(n, 1); continue }
      const e = easeOut(k)
      px.globalAlpha = 1 - k
      px.lineWidth = 3 * (1 - k) + 1
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + 0.3
        px.beginPath()
        px.moveTo(s.x + sceneX + Math.cos(ang) * (6 + 14 * e), s.y + Math.sin(ang) * (6 + 14 * e))
        px.lineTo(s.x + sceneX + Math.cos(ang) * (12 + 26 * e), s.y + Math.sin(ang) * (12 + 26 * e))
        px.stroke()
      }
    }
    px.globalAlpha = 1
  }
  // o mouse que atravessa a pauta também a faz vibrar (força ∝ velocidade)
  let lastPY = null
  const onMove = (e) => {
    const r = stringsSvg.getBoundingClientRect()
    const prevY = lastPY
    lastPY = e.clientY
    if (prevY === null || e.clientX < r.left || e.clientX > r.right) return
    if (e.clientY < r.top - 6 || e.clientY > r.bottom + 6) return
    kick = Math.min(AMP_MAX, kick + Math.abs(e.clientY - prevY) * 0.08)
  }
  if (desk && fine && !reduce) window.addEventListener('pointermove', onMove)

  // desenho em pixel no dither do cursor 3D (grade presa à tela). rot: giro em
  // torno da âncora; flip: escala vertical da tela (a virada: 1 → −1; de lado,
  // um fio com a borda vermelha); show(t): troca de desenho por limiar de Bayer.
  function drawDither(art, x, y, ax, ay, show = null, rot = 0, flip = 1) {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const toScreen = (lx, ly) => [x + lx * c - ly * s, y + (lx * s + ly * c) * flip]
    const corners = [[-ax, -ay], [art.cols - ax, -ay], [-ax, art.rows - ay], [art.cols - ax, art.rows - ay]].map(([u, v]) => toScreen(u * HC, v * HC))
    const gx0 = Math.floor(Math.min(...corners.map((p) => p[0])) / DCELL)
    const gx1 = Math.floor(Math.max(...corners.map((p) => p[0])) / DCELL)
    const gy0 = Math.floor(Math.min(...corners.map((p) => p[1])) / DCELL)
    const gy1 = Math.floor(Math.max(...corners.map((p) => p[1])) / DCELL)
    const edgeOn = Math.abs(flip) < 0.12
    const shadeK = 0.55 + 0.45 * Math.min(1, Math.abs(flip))
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const t = b8(gx, gy)
        if (show && !show(t)) continue
        const dx = gx * DCELL + DCELL / 2 - x
        const dy = gy * DCELL + DCELL / 2 - y
        if (edgeOn) {
          if (Math.abs(dy) > DCELL) continue
          hx.fillStyle = t < 0.7 ? RIM : PAL[2]
          hx.fillRect(gx * DCELL, gy * DCELL, DCELL, DCELL)
          continue
        }
        const ry = dy / flip
        const g = art.grid[Math.floor((-dx * s + ry * c) / HC + ay)]?.[Math.floor((dx * c + ry * s) / HC + ax)]
        if (!g) continue
        let col
        if (g.rim && t < 0.7) col = RIM
        else {
          const i = Math.max(0, Math.min(3, Math.floor(g.l * shadeK * 3 + t)))
          if (i === 0) continue
          col = PAL[i]
        }
        hx.fillStyle = col
        hx.fillRect(gx * DCELL, gy * DCELL, DCELL, DCELL)
      }
    }
  }

  let lastD = null
  let lastNow = 0
  let smoothV = 0
  let spawnAcc = 0
  let lastTip = null
  let lastPressed
  let clipped = false
  /** sai da seção (antes do fim da cena A): devolve o cursor e limpa o canvas */
  function idle(cursorCanvas) {
    if (px) { px.clearRect(0, 0, cv.width, cv.height); hx.clearRect(0, 0, hv.width, hv.height) }
    if (clipped && cursorCanvas) { cursorCanvas.style.clipPath = ''; clipped = false }
    lastTip = null
  }

  /**
   * Um quadro (rAF do cursor 3D). ctx: { cur, cursorCanvas, start: [x, y] ponta
   * ao lado do olho (tela), size, layerTop, sceneX, ribbon: { at(y), reach, half } }
   */
  function frame(now, d5raw, ctx) {
    if (!slotL || !px) return
    if (!framed && !reduce) { framed = true; pxStatic.style.opacity = '0' } // daqui em diante o voo monta a palavra
    const d5 = at5(d5raw)
    const dt = Math.min(0.1, (now - (lastNow || now)) / 1000)
    lastNow = now
    const { cur, cursorCanvas, start, size, layerTop, sceneX, ribbon } = ctx
    const Y = (y) => y + layerTop
    px.setTransform(dpr, 0, 0, dpr, 0, 0)
    px.clearRect(0, 0, W, H)
    hx.setTransform(dpr, 0, 0, dpr, 0, 0)
    hx.clearRect(0, 0, W, H)
    const strRect = { x: strL.x + sceneX, y: Y(strL.y), w: strL.w, h: strL.h }

    // velocidade do scroll (px/quadro, como a do Lenis) → cordas, notas, player
    const v = lastD === null || reduce ? 0 : Math.abs(d5raw - lastD) / Math.max(dt * 60, 1)
    lastD = d5raw
    smoothV += (v - smoothV) * (1 - Math.exp(-dt * 8))
    amp += (Math.min(AMP_MAX, smoothV * 0.35) - amp) * (1 - Math.exp(-dt * 6))
    kick *= Math.exp(-dt * 2.2)
    drawStrings(d5 * 0.03, now)
    if (!reduce && strRect.x + strRect.w > 0 && strRect.x < W && d5raw > 0) {
      spawnAcc += Math.min(30, smoothV) * dt * 0.5
      while (spawnAcc >= 1) { spawnAcc -= 1; spawnNote(now, sceneX, strRect) }
    } else spawnAcc = 0
    const level = clamp01((amp + kick) / AMP_MAX)
    const playing = level > 0.06
    player.classList.toggle('is-playing', playing)
    plState.textContent = playing ? data.player.playing : held ? data.player.held : data.player.paused
    hint.textContent = held ? data.hint[1] : data.hint[0]
    bpmEl.textContent = String(playing ? Math.round(60 + level * 120) : 0).padStart(3, '0')
    eqBars.forEach((el, i) => {
      el.style.transform = `scaleY(${0.15 + 0.85 * level * (0.45 + 0.55 * Math.abs(Math.sin(now * 0.011 * (i + 1) + i * 1.7)))})`
    })
    clockS.setAttribute('transform', `rotate(${(Math.floor(Date.now() / 1000) % 60) * 6})`) // segundos: tempo real
    if (reduce) { drawNotes(now, sceneX); return }

    // ----- cursor: o caminho guia o olhar (eye-trace) -----
    const R = rulerState(d5, sceneX, layerTop)
    const { G0, grip } = R
    const dA = dist // a mão chega no alto quando a faixa termina
    const A = [strL.x + strL.w * 0.5 + endX, Y(strL.y) - APEX_LIFT * H]
    let cx
    let cy
    if (d5 < dA) [cx, cy] = bez(start, [start[0] + 0.02 * W, A[1] + 0.02 * H], [A[0] + 0.14 * W, A[1] - 0.03 * H], A, sineInOut(ramp(d5, 0, dA)))
    else [cx, cy] = bez(A, [A[0], A[1] + 0.42 * H], [G0[0] + 0.03 * W, G0[1] - 0.3 * H], G0, easeInOut(ramp(d5, dA, P.grab)))
    const rot = -Math.PI / 2 * easeInOut(ramp(d5, dA * 0.45, dA))
    const flip = Math.cos(Math.PI * easeInOut(ramp(d5, dA - VIRADA * H, dA + VIRADA * H)))
    // a ponta cruzou uma corda? toca aquela corda: acende em vermelho, pulso do dedo, faísca, nota
    if (lastTip && d5 < P.grab && cx > strRect.x && cx < strRect.x + strRect.w) {
      for (let i = 0; i < 5; i++) {
        const yi = strRect.y + (i / 4) * strRect.h
        if ((lastTip[1] - yi) * (cy - yi) < 0) {
          plk[i] = { t: now, u: (cx - strRect.x) / strRect.w }
          kick = Math.min(AMP_MAX, kick + 1.5)
          sparks.push({ x: cx - sceneX, y: yi, t: now })
          spawnNote(now, sceneX, strRect, [cx, yi], RIM)
          spawnNote(now + 70, sceneX, strRect, [cx, yi])
        }
      }
    }
    lastTip = [cx, cy]

    // a faixa troca o cursor na borda dela: o 3D só à esquerda da faixa, a mão só
    // à direita (a faixa do site fica por baixo do cursor: o recorte faz as vezes dela)
    const half = ribbon.half
    const len = HAND[0].length * HC
    const centerAt = ribbon.at(cy - layerTop)
    const before = centerAt - ribbon.reach >= cx + 6
    const passed = centerAt + ribbon.reach <= cx - len - 6
    const wiping = !before && !passed && d5 < P.grab
    const edgeL = (y) => ribbon.at(y - layerTop) - half
    const edgeR = (y) => ribbon.at(y - layerTop) + half
    if (cur) {
      const dir = lerp(AWAY_DIR, 0, sineInOut(ramp(d5, 0, 140)))
      if (!passed && d5 < P.grab) cur.set(cx, cy, dir, 1, 1, size, 0, cur.aimFor(dir))
      else cur.set(-9999, 0, 0, 1, 0)
    }
    if (wiping && cursorCanvas) {
      const pts = []
      for (let y = 0; y <= H; y += 24) pts.push(`${edgeL(y).toFixed(1)}px ${y}px`)
      pts.push(`${edgeL(H).toFixed(1)}px ${H}px`)
      cursorCanvas.style.clipPath = `polygon(0px 0px, ${pts.join(', ')}, 0px ${H}px)`
      clipped = true
    } else if (clipped && cursorCanvas) { cursorCanvas.style.clipPath = ''; clipped = false }

    // aperto: antecipa, aperta (marca de clique) e a mão vira punho no dither
    const gk = ramp(d5, P.grab, P.drag)
    const lift = -Math.sin(Math.PI * ramp(gk, 0, 0.35)) * HC * 1.4
    const press = Math.sin(Math.PI * ramp(gk, 0.3, 0.8)) * HC * 1.8
    const m = easeInOut(ramp(gk, 0.35, 0.7)) * 1.34
    const pressed = gk >= 0.5
    if (pressed !== lastPressed) {
      if (lastPressed !== undefined && pressed) {
        Object.assign(impact.style, { left: `${G0[0]}px`, top: `${G0[1]}px` })
        impact.classList.remove('on')
        void impact.offsetWidth
        impact.classList.add('on')
      }
      lastPressed = pressed
    }
    if (d5 < P.grab) {
      if (wiping) {
        hx.save()
        hx.beginPath()
        hx.moveTo(W, 0)
        for (let y = 0; y <= H; y += 24) hx.lineTo(edgeR(y), y)
        hx.lineTo(edgeR(H), H)
        hx.lineTo(W, H)
        hx.closePath()
        hx.clip()
        drawDither(hand, cx, cy, HAND_TIP[0], HAND_TIP[1], null, rot, flip)
        hx.restore()
      } else if (passed) drawDither(hand, cx, cy, HAND_TIP[0], HAND_TIP[1], null, rot, flip)
    } else if (d5 < P.sweep) {
      const at = d5 < dragAt() ? G0 : grip
      const y = at[1] + lift + press
      const keep = (1 - ramp(d5, B0(), B0() + 0.12 * H)) * 1.34
      if (m < 1.34) drawDither(hand, at[0], y, HAND_TIP[0], HAND_TIP[1], (tb) => tb >= m, rot, flip)
      if (m > 0) drawDither(fist, at[0], y, FIST_C[0], FIST_C[1], (tb) => tb < Math.min(m, keep))
    }
    // os pixels voam direto do punho para a palavra, cada um chegando na sua
    // coluna quando a cabeça da régua passa por ela
    if (d5 >= B0()) {
      for (const p of parts) {
        const o = [grip[0] + p.o[0], grip[1] + p.o[1]]
        const appear = ramp(d5, B0(), B0() + 0.05 * H)
        if (!p.word) {
          const a = easeOut(ramp(d5, B0() + p.dl * 0.1 * H, B0() + (0.18 + p.dl * 0.1) * H))
          const ev = easeInOut(ramp(d5, B0() + (0.05 + p.dl * 0.1) * H, B0() + (0.4 + p.dl * 0.25) * H))
          if (ev >= 1) continue
          px.globalAlpha = appear * (1 - ev)
          px.fillStyle = p.color
          px.fillRect(Math.round(o[0] + p.burst[0] * a + p.rise[0] * ev), Math.round(o[1] + p.burst[1] * a + p.rise[1] * ev * ev), HC, HC)
          continue
        }
        const tx = wordL.x + sceneX + p.word[0]
        const ty = Y(wordL.y) + p.word[1]
        const qq = sineInOut(ramp(d5, B0() + p.dl * 0.08 * H, dAt(p.frac)))
        const [x, y] = bez(o, [o[0] + p.burst[0] * 1.3, o[1] + p.burst[1] * 1.3], [tx + p.cloud[0], ty + p.cloud[1]], [tx, ty], qq)
        const sway = Math.sin(Math.PI * qq) * Math.sin(d5 * 0.012 + p.dl * 30) * 4
        const sz = lerp(HC, PC, qq)
        px.globalAlpha = appear
        px.fillStyle = qq > 0.85 ? '#f4f3ef' : p.color
        px.fillRect(Math.round(x), Math.round(y + sway), Math.ceil(sz), Math.ceil(sz))
      }
      px.globalAlpha = 1
    }
    drawSparks(now, sceneX)
    drawNotes(now, sceneX)
  }

  /** mobile / sem o pin: tudo no estado final, parado */
  function still() {
    cue.forEach((el) => { if (el !== pxWord) el.style.setProperty('--in', 1) })
    hora.style.setProperty('--mark', 1)
    fermata.style.setProperty('--draw', 0)
    fermata.style.setProperty('--dot', 1)
    clockS.style.opacity = '0'
    plState.textContent = data.player.held
    hint.textContent = data.hint[1]
    // a palavra em pixel, no desenho fixo (sem o voo)
    const fs = parseFloat(getComputedStyle(pxWord.parentElement).fontSize)
    const pc = Math.max(3, Math.round((fs * 0.7) / 7))
    Object.assign(pxWord.style, { width: `${PX_COLS * pc}px`, height: `${7 * pc}px` })
    pxStatic.style.opacity = '1'
  }
  // reduced motion no desktop: a palavra em pixel também já fica montada (sem voo)
  if (reduce && desk) still()

  return {
    measure,
    length,
    cam,
    update,
    frame,
    idle,
    still,
    dispose() {
      window.removeEventListener('pointermove', onMove)
      releaseRuler()
      caps.forEach((el) => el.remove())
      cv?.remove()
      hv?.remove()
      impact?.remove()
      host.innerHTML = ''
    },
  }
}
