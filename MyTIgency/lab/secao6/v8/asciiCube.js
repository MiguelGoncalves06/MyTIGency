// Cubo 3D desenhado em caracteres (LAB v8; ref. do usuário: os cubos do
// cartaz "Catch", na linguagem ASCII do hero do site). Sem Three.js: para
// cada célula da grade de caracteres, um raio ortográfico atravessa o cubo
// girado (teste de "slab"); a face atingida dá a normal, a luz dá o brilho,
// o brilho escolhe o caractere da rampa. Duas faces são vermelhas (a cor da
// marca; accent = índices das faces: eixo × 2 + 0 no lado +, 1 no lado −);
// as quinas viram traço. Barato: ~200 raios por cubo por quadro, e só
// redesenha quando o giro muda.
const RAMP = '.:-=+*#%@'
const LIGHT = (() => { const l = [-0.45, 0.6, 0.66]; const m = Math.hypot(...l); return l.map((v) => v / m) })()
const PAPER = [244, 243, 239]
const RED = [255, 68, 56]
const SPAN = 1.8 // o quanto da grade o cubo ocupa (meia-largura do enquadramento, em meias-arestas)

export function mountAsciiCube(canvas, { cells = 14, accent = [0, 3] } = {}) {
  const ctx = canvas.getContext('2d')
  let px = 0
  let last = ''

  return {
    /** tamanho em px css (o canvas é quadrado) */
    resize(size) {
      px = size
      const res = Math.min(2, devicePixelRatio || 1)
      canvas.width = canvas.height = Math.max(1, Math.round(size * res))
      canvas.style.width = canvas.style.height = `${size}px`
      last = ''
    },
    /** rx, ry: giro (rad) */
    draw(rx, ry) {
      const key = `${rx.toFixed(3)}|${ry.toFixed(3)}|${px}`
      if (key === last) return
      last = key
      const n = cells
      const cs = canvas.width / n
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = `500 ${cs * 1.1}px "JetBrains Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry)
      // vista → cubo: Rxᵀ · Ryᵀ
      const toCube = (x, y, z) => {
        const x1 = cy * x - sy * z
        const z1 = sy * x + cy * z
        return [x1, cx * y + sx * z1, -sx * y + cx * z1]
      }
      // cubo → vista: Ry · Rx
      const toView = (x, y, z) => {
        const y1 = cx * y - sx * z
        const z1 = sx * y + cx * z
        return [cy * x + sy * z1, y1, -sy * x + cy * z1]
      }
      const d = toCube(0, 0, -1)
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const u = (((i + 0.5) / n) * 2 - 1) * SPAN
          const v = -(((j + 0.5) / n) * 2 - 1) * SPAN
          const o = toCube(u, v, 5)
          let tmin = -Infinity
          let tmax = Infinity
          let axis = -1
          for (let k = 0; k < 3; k++) {
            if (Math.abs(d[k]) < 1e-6) {
              if (Math.abs(o[k]) > 1) { tmin = Infinity; break }
              continue
            }
            const t1 = (-1 - o[k]) / d[k]
            const t2 = (1 - o[k]) / d[k]
            const lo = Math.min(t1, t2)
            if (lo > tmin) { tmin = lo; axis = k }
            tmax = Math.min(tmax, Math.max(t1, t2))
          }
          if (axis < 0 || tmin > tmax || tmax < 0) continue
          const sign = d[axis] > 0 ? -1 : 1
          const nc = [0, 0, 0]
          nc[axis] = sign
          const nv = toView(...nc)
          const lit = Math.max(0, nv[0] * LIGHT[0] + nv[1] * LIGHT[1] + nv[2] * LIGHT[2]) * 0.85 + 0.15
          // quina: o ponto atingido está perto de outra face
          const hit = [o[0] + d[0] * tmin, o[1] + d[1] * tmin, o[2] + d[2] * tmin]
          const edge = hit.filter((c, k) => k !== axis && Math.abs(c) > 0.86).length > 0
          const ch = edge ? '#' : RAMP[Math.min(RAMP.length - 1, Math.floor(lit * RAMP.length))]
          const face = axis * 2 + (sign > 0 ? 0 : 1)
          const col = accent.includes(face) ? RED : PAPER
          const a = edge ? 0.95 : 0.35 + lit * 0.65
          ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`
          ctx.fillText(ch, (i + 0.5) * cs, (j + 0.5) * cs)
        }
      }
    },
  }
}
