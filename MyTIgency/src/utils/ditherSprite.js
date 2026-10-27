// Desenhos em pixel no dither do cursor 3D (cursor3d.js): 4 cinzas, Bayer 8×8,
// células de DCELL px presas à tela, borda vermelha do lado de trás. Usado pela
// mão/punho da seção 5 (manifestoS5.js) e pelo cursor do editor da seção 6
// (manifestoS6.js) — o mesmo cursor, que muda de forma.
//
// Arte: 'k' contorno, 'w' miolo, 'r' vermelho (a ponta do lápis), '.' vazio.

export const PAL = ['#141414', '#5f5f5f', '#b9b9b9', '#ffffff']
export const RIM = '#ff4438'
export const DCELL = 3
const fr = (v) => v - Math.floor(v)
const b2 = (x, y) => { x = Math.floor(x); y = Math.floor(y); return fr(x * 0.5 + y * y * 0.75) }
export const b8 = (x, y) => b2(x * 0.25, y * 0.25) * 0.0625 + b2(x * 0.5, y * 0.5) * 0.25 + b2(x, y)

// Onde o punho segura a régua: fração da largura e px do topo dela. A seção 5
// pega aí; a seção 6 recebe a régua (e o punho) no mesmo ponto.
export const GRAB_AT = 0.68
export const GRIP_Y = 30
// o cursor do editor (seção 6) em relação à mão da seção 5: um meio termo
export const EDITOR_CELL = 0.7
// A régua chega ao texto da seção 6 um pouco acima (lift, em alturas de tela) e
// inclinada (tilt, graus); lá ela desce e se nivela (a seção 5 leva até aqui)
export const RULER_SEAT = { lift: 0.05, tilt: -3.5 }

// Mão de link, apontando para cima; girada para a direita
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
export const HAND = [...HAND_UP[0]].map((_, c) => HAND_UP.map((row) => row[c]).reverse().join(''))
export const HAND_TIP = [HAND_UP.length - 1, 7]
// Punho de "arrastando". Centro: coluna 8, linha 7.
export const FIST = [
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
export const FIST_C = [8, 7]

// Formas do cursor do editor (seção 6). [arte, âncora: coluna, linha]
export const EDITOR = {
  // seta do Figma: ponta no canto de cima
  arrow: [[
    'k...........',
    'kk..........',
    'kwk.........',
    'kwwk........',
    'kwwwk.......',
    'kwwwwk......',
    'kwwwwwk.....',
    'kwwwwwwk....',
    'kwwwwwwwk...',
    'kwwwwwwwwk..',
    'kwwwwwwwwwk.',
    'kwwwwwwkkkkk',
    'kwwwkwwk....',
    'kwwkkwwk....',
    'kwk..kwwk...',
    'kk...kwwk...',
    'k.....kwwk..',
    '......kwwk..',
    '.......kk...',
  ], [0, 0]],
  // cursor de texto: o centro na altura do traço
  text: [[
    'kkk.kkk',
    'kwwkwwk',
    '.kkwkk.',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '..kwk..',
    '.kkwkk.',
    'kwwkwwk',
    'kkk.kkk',
  ], [3, 8]],
  // mover: as quatro setas, centro no ponto que arrasta
  move: [[
    '.......k.......',
    '......kwk......',
    '.....kwwwk.....',
    '....kkkwkkk....',
    '...k..kwk..k...',
    '..kk..kwk..kk..',
    '.kwkkkkwkkkkwk.',
    'kwwwwwwwwwwwwwk',
    '.kwkkkkwkkkkwk.',
    '..kk..kwk..kk..',
    '...k..kwk..k...',
    '....kkkwkkk....',
    '.....kwwwk.....',
    '......kwk......',
    '.......k.......',
  ], [7, 7]],
  // lápis (os rabiscos à mão): a ponta vermelha embaixo, à esquerda, é a da caneta
  brush: [[
    '...........kk..',
    '..........kwwk.',
    '.........kwwwwk',
    '........kwwwwk.',
    '.......kwwwwk..',
    '......kwwwwk...',
    '.....kwwwwk....',
    '....kwwwwk.....',
    '...kwwwwk......',
    '..kwwwwk.......',
    '.kkwwwk........',
    '.krkwk.........',
    'krrkk..........',
    'krk............',
    'kk.............',
  ], [0, 14]],
  // redimensionar: seta dupla na diagonal, centro na alça
  resize: [[
    'kkkkkk........',
    'kwwwk.........',
    'kwwk..........',
    'kwkwk.........',
    'kk.kwk........',
    'k...kwk.......',
    '.....kwk......',
    '......kwk.....',
    '.......kwk...k',
    '........kwk.kk',
    '.........kwkwk',
    '..........kwwk',
    '.........kwwwk',
    '........kkkkkk',
  ], [7, 7]],
}

// desenho em pixel → grade de luminância para o dither (luz de cima/esquerda;
// o contorno do lado de trás pega a luz vermelha, como no cursor 3D)
export function shadeOf(art) {
  const rows = art.length
  const cols = art[0].length
  const grid = art.map((row, r) => [...row].map((ch, c) => {
    if (ch === '.') return null
    if (ch === 'r') return { l: 1, red: true }
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

/**
 * Pinta um desenho (shadeOf) no dither, em ctx (px de tela). (x, y) = onde
 * cai a âncora (ax, ay, em células); hc = px por célula do desenho. rot: giro
 * em torno da âncora; flip: escala vertical da tela (a virada: 1 → −1; de
 * lado, um fio com a borda vermelha); show(t): troca de desenho por limiar de Bayer.
 */
export function drawSprite(ctx, art, x, y, ax, ay, hc, show = null, rot = 0, flip = 1) {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const toScreen = (lx, ly) => [x + lx * c - ly * s, y + (lx * s + ly * c) * flip]
  const corners = [[-ax, -ay], [art.cols - ax, -ay], [-ax, art.rows - ay], [art.cols - ax, art.rows - ay]].map(([u, v]) => toScreen(u * hc, v * hc))
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
        ctx.fillStyle = t < 0.7 ? RIM : PAL[2]
        ctx.fillRect(gx * DCELL, gy * DCELL, DCELL, DCELL)
        continue
      }
      const ry = dy / flip
      const g = art.grid[Math.floor((-dx * s + ry * c) / hc + ay)]?.[Math.floor((dx * c + ry * s) / hc + ax)]
      if (!g) continue
      let col
      if (g.red || (g.rim && t < 0.7)) col = RIM
      else {
        const i = Math.max(0, Math.min(3, Math.floor(g.l * shadeK * 3 + t)))
        if (i === 0) continue
        col = PAL[i]
      }
      ctx.fillStyle = col
      ctx.fillRect(gx * DCELL, gy * DCELL, DCELL, DCELL)
    }
  }
}
