// Traço do cursor com a MESMA arte do traço A (pincel marcador do Figma),
// deformada ao longo de um caminho novo — como um "art brush" do Illustrator:
//   · corpo: a espessura real da arte (bordas de cima/baixo medidas em faixas
//     ao longo da extensão do traço A, com o afinamento do fim) refeita sobre
//     o caminho novo;
//   · fiapos de "pincel seco": cada sub-path pequeno é levado ponto a ponto
//     (comprimento ao longo da guia → comprimento no caminho novo; distância
//     da guia → distância da normal).
// A guia original é a extensão do traço A (LINE_A_JOIN + LINE_A_EXT, em
// unidades do SVG 2135×1216); só a parte depois de `sFrom` (onde o cursor pega
// o traço) é usada, esticada sobre o caminho novo inteiro.
import raw from '../../../src/assets/manifest-vetorA-lua.svg?raw'
import { LINE_A_EXT, LINE_A_JOIN } from '../../../src/utils/manifestoLineA'

const N_ARGS = { M: 2, L: 2, C: 6, Z: 0 }
function parse(d) {
  return d.split(/(?=M)/).map((sub) => {
    const tok = sub.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/g)
    const cmds = []
    let c = null
    for (let i = 0; i < tok.length;) {
      if (/[MLCZ]/.test(tok[i])) c = tok[i++]
      else if (c === 'M') c = 'L' // pares soltos depois do M = linhas
      const n = N_ARGS[c]
      const pts = []
      for (let k = 0; k < n; k += 2) pts.push([+tok[i + k], +tok[i + k + 1]])
      i += n
      cmds.push({ c, pts })
      if (c === 'Z' && i < tok.length && !/[MLCZ]/.test(tok[i])) c = 'L'
    }
    return cmds
  })
}
const SUBS = parse(raw.match(/ d="([^"]+)"/)[1])
const BODY = SUBS.reduce((a, s, i) => (s.length > SUBS[a].length ? i : a), 0) // o contorno principal

// guia reamostrada a cada 2 unidades: posição, comprimento acumulado, normal
const GUIDE = (() => {
  const P = [LINE_A_JOIN, ...LINE_A_EXT]
  const out = []
  let s = 0
  for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i]
    const L = Math.hypot(x1 - x0, y1 - y0), tx = (x1 - x0) / L, ty = (y1 - y0) / L
    for (let u = 0; u < L; u += 2) out.push({ x: x0 + tx * u, y: y0 + ty * u, s: s + u, nx: -ty, ny: tx })
    s += L
  }
  const [x, y] = P[P.length - 1], last = out[out.length - 1]
  out.push({ x, y, s, nx: last.nx, ny: last.ny })
  return out
})()
export const GUIDE_LEN = GUIDE[GUIDE.length - 1].s

function project([x, y]) {
  let best = GUIDE[0], bd = Infinity
  for (const g of GUIDE) {
    const d = (g.x - x) ** 2 + (g.y - y) ** 2
    if (d < bd) { bd = d; best = g }
  }
  return { s: best.s, n: (x - best.x) * best.nx + (y - best.y) * best.ny }
}

// projeções calculadas uma vez (a arte não muda)
const PROJ = SUBS.map((cmds) => cmds.map((cm) => cm.pts.map((p) => (p[0] > 1290 ? project(p) : null))))
const BIN = 5
const PROFILE = (() => {
  const nb = Math.ceil(GUIDE_LEN / BIN) + 1
  const top = new Array(nb).fill(null), bot = new Array(nb).fill(null)
  SUBS[BODY].forEach((cm, i) => cm.pts.forEach((p, k) => {
    const q = PROJ[BODY][i][k]
    if (!q || Math.abs(q.n) > 26) return
    const b = Math.round(q.s / BIN)
    top[b] = top[b] === null ? q.n : Math.min(top[b], q.n)
    bot[b] = bot[b] === null ? q.n : Math.max(bot[b], q.n)
  }))
  // faixas vazias: interpola; depois suaviza (média de 3)
  const fill = (a) => {
    for (let i = 0; i < nb; i++) if (a[i] === null) {
      let l = i - 1, r = i + 1
      while (l >= 0 && a[l] === null) l--
      while (r < nb && a[r] === null) r++
      a[i] = l < 0 ? a[r] ?? 0 : r >= nb ? a[l] : a[l] + ((a[r] - a[l]) * (i - l)) / (r - l)
    }
    return a
  }
  fill(top)
  fill(bot)
  // a borda é amostrada esparsa (faixas com só uma borda davam espessura 0):
  // janela de ±3 faixas (mín. em cima, máx. embaixo), espessura mínima e
  // suavização de 3
  const W = 3, MIN = 4.5
  const t2 = top.map((_, i) => Math.min(...top.slice(Math.max(0, i - W), i + W + 1)))
  const b2 = bot.map((_, i) => Math.max(...bot.slice(Math.max(0, i - W), i + W + 1)))
  for (let i = 0; i < nb; i++) if (b2[i] - t2[i] < MIN) { const c = (b2[i] + t2[i]) / 2; t2[i] = c - MIN / 2; b2[i] = c + MIN / 2 }
  const sm = (a) => a.map((v, i) => (a[Math.max(0, i - 1)] + v + a[Math.min(nb - 1, i + 1)]) / 3)
  return { top: sm(t2), bot: sm(b2) }
})()

/**
 * d da arte deformada sobre `path` (SVGPathElement, em px).
 * @param sFrom  comprimento da guia (unid. SVG) onde o traço novo começa
 * @param scale  px por unidade SVG (espessura); `gain` engrossa até o fim
 */
export function warpBrush(path, sFrom, scale, gain = 1) {
  const L = path.getTotalLength()
  const span = GUIDE_LEN - sFrom
  const frame = (s, n) => {
    const u = Math.min(1, Math.max(0, (s - sFrom) / span))
    const at = u * L
    const p = path.getPointAtLength(at)
    const a = path.getPointAtLength(Math.max(0, at - 1)), b = path.getPointAtLength(Math.min(L, at + 1))
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const k = scale * (1 + (gain - 1) * u)
    return [p.x - ((b.y - a.y) / len) * n * k, p.y + ((b.x - a.x) / len) * n * k]
  }
  const f = (v) => v.toFixed(1)
  // corpo: borda de cima indo, borda de baixo voltando
  const b0 = Math.max(0, Math.floor((sFrom - 3) / BIN)), b1 = PROFILE.top.length - 1
  const up = [], down = []
  for (let b = b0; b <= b1; b++) {
    const s = Math.max(sFrom - 3, b * BIN)
    up.push(frame(s, PROFILE.top[b]))
    down.push(frame(s, PROFILE.bot[b]))
  }
  let d = `M${up.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}L${down.reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`
  // fiapos inteiros depois do ponto de partida
  SUBS.forEach((cmds, i) => {
    if (i === BODY) return
    const proj = PROJ[i]
    const ok = proj.every((cp) => cp.every((q) => q && q.s > sFrom + 2 && Math.abs(q.n) < 40))
    if (!ok || !cmds.length) return
    d += cmds.map((cm, j) => cm.c + cm.pts.map((_, k) => {
      const q = proj[j][k]
      const [x, y] = frame(q.s, q.n)
      return `${f(x)} ${f(y)}`
    }).join(' ')).join('')
  })
  return d
}
