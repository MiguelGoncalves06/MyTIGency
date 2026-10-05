// Seção 3 do Manifesto ("é quem desenha e quem programa"): port do protótipo
// aprovado (PAINTest/export-secao3/secao3.html). Encapsulado (sem globais),
// IDs prefixados com "s3-", assets via Vite e dispose() para o React.
// NÃO mudar: SCRIPT, TOTAL, shader, GUIDES, RASTER, easings e durações — foram
// refinados um a um no protótipo (ver HANDOFF.md de lá).
// Diferença de integração: o pin/scroll horizontal não mora aqui. Este módulo
// devolve a timeline do desenho (`tl`, duração TOTAL) e quem controla o
// scroll (useManifestoHorizontal) a encaixa no master junto com a trilha.
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import camadas from '../assets/s3/camadas.json'
import meta from '../assets/s3/raster/meta.json'

gsap.registerPlugin(DrawSVGPlugin)

const RASTER_URLS = import.meta.glob('../assets/s3/raster/*.webp', { eager: true, query: '?url', import: 'default' })
// SVGs grandes (~900 KB de texto): lazy, viram chunks separados.
const VECTOR_SRC = import.meta.glob('../assets/s3/vec/*.svg', { query: '?raw', import: 'default' })
const rasterUrl = (name) => RASTER_URLS[`../assets/s3/raster/${name}.webp`]
const vectorSrc = (name) => VECTOR_SRC[`../assets/s3/vec/${name}.svg`]()

const NS = 'http://www.w3.org/2000/svg'
const FW = 1130, FH = 784 // frame do Figma
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag)
  for (const k in attrs) e.setAttribute(k, attrs[k])
  if (parent) parent.appendChild(e)
  return e
}

/* =====================================================================
   DIREÇÃO "SINAL → GRAVURA"
   O cosmos chega como sinal digital (pixel, dither); as figuras chegam como tinta;
   a caneta vermelha anota por cima. Ideias (digital) viram produtos (artesanal).

   ROTEIRO — [camada, início, fim] em unidades de scroll (a seção inteira vai de 0 a TOTAL).
   ===================================================================== */
const SCRIPT = [
  ['mapa', 2, 16], // sinal recebido ao longo do compasso
  ['nuvem-cima', 12, 21], // neblina entrando em foco
  ['nuvem-dir', 16, 25],
  ['nuvem-abaixo-lua', 20, 29],
  ['moon', 24, 33], // tinta + zoom assentando
  ['vetor-lua-cheia', 33, 35.5],
  ['vetordir', 35.5, 37.5],
  ['vetoratrasdoplaneta', 37.5, 39.5],
  ['planetapeq', 39.5, 41.5],
  ['ANJO', 40, 65], // esboço vermelho + tinta (igual à v1)
  ['nuvem-esq', 58, 65],
  ['lua-minguante', 64, 68],
  // respiro: o anjo fica pronto antes da caneta vermelha entrar
  ['two-star-esq', 69, 71],
  ['elipse', 71, 78],
  ['elipse-arms', 78, 82],
  ['redline-seta', 82, 85],
  ['redline-lado', 85, 86.5],
  ['redline-saturn', 86.5, 88.5],
  ['saturn', 88, 92],
  ['little-planet', 90, 93],
  ['starESQ', 92, 94],
  ['redSTAR', 93, 95],
  ['star-asa', 94, 96],
  ['star-ring', 95, 97],
  ['seta-red', 96, 100],
]
export const TOTAL = 112

// modos do shader
const INK = 0, SIGNAL = 1, WIPE = 2, FOG = 3, DITHER = 4
// camadas raster, de baixo para cima. 'top' = acima das linhas (segundo canvas), para respeitar a ordem do Figma.
const RASTER = {
  'mapa': { mode: SIGNAL, depth: -0.35 },
  'nuvem-dir': { mode: FOG, origin: [0.25, 0.3], depth: 0.2 },
  'nuvem-cima': { mode: FOG, origin: [0.35, 0.75], depth: 0.2 },
  'nuvem-abaixo-lua': { mode: FOG, origin: [0.1, 0.45], depth: 0.25 },
  'vetor-lua-cheia': { mode: WIPE, depth: 0.3 },
  'moon': { mode: INK, origin: [0.35, 0.3], depth: 0.3, sketch: true, zoom: 1.06 },
  'nuvem-esq': { mode: FOG, origin: [0.8, 0.25], depth: 0.5 },
  'ANJO': { mode: INK, origin: [0.66, 0.26], depth: 0.6, sketch: true },
  'lua-minguante': { mode: DITHER, depth: 0.7, top: true },
  'little-planet': { mode: DITHER, depth: 0.9, top: true },
  'saturn': { mode: DITHER, depth: 1, top: true },
  'planetapeq': { mode: DITHER, depth: 0.8, top: true },
}

// Linhas (vetoriais): reveladas por uma máscara que segue a linha-guia, como uma caneta.
const line = (x1, y1, x2, y2) => `M${x1},${y1}L${x2},${y2}`
function arc(e, t0, t1, startNear) {
  const r = e.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), pts = []
  for (let i = 0; i <= 120; i++) {
    const t = (t0 + (t1 - t0) * i / 120) * Math.PI / 180, x = e.a * Math.cos(t), y = e.b * Math.sin(t)
    pts.push([e.cx + x * c - y * s, e.cy + x * s + y * c])
  }
  if (startNear) {
    const d = (p) => Math.hypot(p[0] - startNear[0], p[1] - startNear[1])
    if (d(pts[pts.length - 1]) < d(pts[0])) pts.reverse()
  }
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('')
}
// elipses ajustadas por mínimos quadrados sobre os paths exportados (coordenadas do frame)
const GUIDES = {
  'elipse': arc({ cx: 397.6, cy: 575.4, a: 73, b: 176.9, rot: 72.4 }, -103, 195, [237, 657]),
  'elipse-arms': arc({ cx: 700.8, cy: 303.7, a: 51.8, b: 58.2, rot: 55.3 }, 52, 418),
  'seta-red': line(730, 212, 965, 144),
  'redline-seta': line(556, 571, 804, 569),
  'redline-lado': line(806, 569, 856, 569),
  'redline-saturn': line(860, 571, 860, 463),
  'vetordir': line(760, 741, 855, 741),
  'vetoratrasdoplaneta': line(844, 743, 844, 568),
}
const POPS = ['two-star-esq', 'starESQ', 'redSTAR', 'star-asa', 'star-ring'] // estrelas: carimbo + cintilar
const DEPTH = { 'star-asa': 0.9, 'star-ring': 0.9, starESQ: 0.6, redSTAR: 1 }
const PARALLAX = 9 // em unidades do frame

/* ---------- WebGL ---------- */
const VS = `
attribute vec2 a_pos;
uniform vec4 u_rect; uniform vec2 u_off; uniform float u_scale;
varying vec2 v_uv; varying vec2 v_f;
void main() {
  vec2 f = u_rect.xy + u_rect.zw * (.5 + (a_pos - .5) * u_scale) + u_off;
  v_uv = a_pos; v_f = f / vec2(${FW}., ${FH}.);
  vec2 c = v_f * 2. - 1.;
  gl_Position = vec4(c.x, -c.y, 0., 1.);
}`
const FS = `
precision mediump float;
uniform sampler2D u_tex, u_paint;
uniform float u_p, u_mode, u_sketch, u_vel, u_time, u_dpr;
uniform vec2 u_origin, u_size, u_texel;
varying vec2 v_uv; varying vec2 v_f;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
// matriz de Bayer 8×8 (dither ordenado), sem arrays
float bayer2(vec2 a) { a = floor(a); return fract(a.x * .5 + a.y * a.y * .75); }
float bayer4(vec2 a) { return bayer2(.5 * a) * .25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(.5 * a) * .25 + bayer2(a); }
float alphaAt(vec2 o) { return texture2D(u_tex, v_uv + o).a; }
float inkAt(vec2 o) { vec4 s = texture2D(u_tex, v_uv + o); return s.a > 0. ? (1. - dot(s.rgb / s.a, vec3(.299, .587, .114))) * s.a : 0.; }

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  vec3 base = c.a > .004 ? c.rgb / c.a : vec3(1.);
  float ink = 1. - dot(base, vec3(.299, .587, .114));         // escuro = mais tinta
  vec2 q = v_uv * u_size;                                     // em unidades do frame
  float n = noise(q * .06) * .65 + noise(q * .25) * .35;
  float dist = length((v_uv - u_origin) * u_size) / length(u_size);
  float bay = bayer8(gl_FragCoord.xy / (2.5 * u_dpr));        // célula de dither ≈ 2,5 px de tela
  vec2 uv = v_uv;
  float bias = u_vel * 2.5;                                   // scroll rápido = desfoque
  float a = 0., wet = 0., spark = 0.;
  float pt = u_sketch > .5 ? clamp((u_p - .3) / .7, 0., 1.) : u_p;

  if (u_mode > 3.5) {
    // DITHER POR TONS (planetas): os pontos escuros acendem primeiro, em blocos que afinam
    float lp = clamp((ink * .7 + n * .3 - (1. - u_p * 1.3)) / .25, 0., 1.);
    float bs = mix(7., 1., lp) + u_vel * 8.;
    if (bs > 1.5) uv = (floor(q / bs) + .5) * bs / u_size;
    bias += (1. - lp) * 1.5;
    a = step(bay, lp * 1.02);
    spark = (1. - smoothstep(0., .4, lp)) * step(.001, lp);
  } else if (u_mode > 2.5) {
    // NEBLINA (nuvens): desfocada → foco, borda em dither, ondulação mínima depois de pronta
    uv += vec2(sin(u_time * .5 + v_uv.y * 7.), cos(u_time * .4 + v_uv.x * 6.)) * .002;
    float lp = clamp(((1. - dist) * .7 + n * .3 - (1. - u_p * 1.35)) / .3, 0., 1.);
    bias += (1. - lp) * 4.5;
    a = step(bay, lp * 1.6);
  } else if (u_mode > 1.5) {
    // CORTINA (linha azul raster), de cima para baixo
    float edge = 1. - u_p * 1.08;
    a = smoothstep(edge, edge + .07, 1. - v_uv.y + (n - .5) * .08);
  } else if (u_mode > .5) {
    // SINAL (mapa): atrás do compasso o mapa chega em blocos e dither, que afinam até ficar nítido
    vec2 d = v_uv - .5;
    float ang = fract(atan(d.x, -d.y) / 6.2831853 + 1.);
    float behind = u_p * 1.35 - ang + (n - .5) * .02;
    float lp = clamp(behind / .35, 0., 1.);
    float bs = mix(26., 1., pow(lp, .6)) + u_vel * 14.;
    if (bs > 1.5) uv = (floor(q / bs) + .5) * bs / u_size;
    bias += log2(max(bs, 1.)) * .9;
    a = step(0., behind) * step(bay, lp * 1.25 + .1);
    spark = (1. - smoothstep(0., .06, behind)) * step(0., behind);
  } else {
    // TINTA (anjo, lua): igual à v1 — traços escuros perto da origem primeiro
    bias *= .6;
    float v = ink * .55 + (1. - dist) * .35 + n * .1;
    float edge = 1. - pt * 1.18;
    a = smoothstep(edge, edge + .07, v);
    wet = (1. - smoothstep(edge + .07, edge + .24, v)) * step(.001, pt) * step(pt, .999);
  }

  vec4 s = texture2D(u_tex, uv, bias);
  vec3 rgb = s.a > .004 ? s.rgb / s.a : vec3(1.);
  rgb = mix(rgb, vec3(.05, .13, .38), wet * .35);                          // tinta fresca, mais escura
  if (u_mode > .5 && u_mode < 1.5) {                                        // estrelas do mapa cintilam
    float l = dot(rgb, vec3(.299, .587, .114));
    rgb *= 1. + smoothstep(.72, .9, l) * .35 * sin(u_time * 2.6 + hash(floor(q / 3.)) * 6.2831);
  }
  rgb = mix(rgb, vec3(.8, .9, 1.), spark * .85 * step(bay, .55));          // pixels de "sinal" na frente
  a = max(a, texture2D(u_paint, v_f).a * smoothstep(.2, .65, ink));        // o pincel do cursor antecipa a tinta
  vec4 col = vec4(rgb, 1.) * (s.a * a);

  if (u_sketch > .5) {
    // esboço: bordas da silhueta + bordas fortes de tom, em lápis vermelho
    vec2 o = u_texel * 3.;
    float ea = abs(alphaAt(vec2(o.x, 0.)) - alphaAt(vec2(-o.x, 0.))) + abs(alphaAt(vec2(0., o.y)) - alphaAt(vec2(0., -o.y)));
    float el = abs(inkAt(vec2(o.x, 0.)) - inkAt(vec2(-o.x, 0.))) + abs(inkAt(vec2(0., o.y)) - inkAt(vec2(0., -o.y)));
    float stroke = smoothstep(.3, .75, ea + el * .55);
    float es = 1. - clamp(u_p * 2.4, 0., 1.) * 1.15;
    float sk = stroke * smoothstep(es, es + .05, (1. - dist) * .85 + n * .15) * (1. - smoothstep(.72, 1., u_p));
    col += vec4(.94, .29, .25, 1.) * sk * .85 * (1. - col.a);
  }
  if (col.a < .003) discard;
  gl_FragColor = col;
}`

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

/**
 * Monta a seção 3 dentro dos elementos já renderizados pelo React.
 * @param {object} els  { root, comp, gl, gl2, ov, ov2, ovdefs, titleDeco, tipArrow, hand, titleSpans, m1, m2, bin }
 * @returns {{ ready: Promise<{ tl: gsap.core.Timeline|null }|null>, setVelocity, dispose }}
 *   `ready` resolve com { tl } — a timeline do desenho (tl null em reduced-motion);
 *   null se desmontado antes de carregar. dispose() pode ser chamado a qualquer momento.
 */
export function mountSection3(els) {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
  const { comp, ov, ov2, ovdefs } = els
  let disposed = false
  const cleanups = []

  /* ---------- pincel do cursor: pinta numa textura do tamanho do frame/4 e some sozinho ---------- */
  const paint = document.createElement('canvas'); paint.width = FW / 4; paint.height = FH / 4
  const pctx = paint.getContext('2d')
  let paintUntil = 0, lastBrush = null
  function brush(fx, fy) {
    const steps = lastBrush ? Math.ceil(Math.hypot(fx - lastBrush[0], fy - lastBrush[1]) / 18) : 1
    for (let i = 1; i <= steps; i++) {
      const x = (lastBrush ? lastBrush[0] + (fx - lastBrush[0]) * i / steps : fx) / 4
      const y = (lastBrush ? lastBrush[1] + (fy - lastBrush[1]) * i / steps : fy) / 4, r = 13
      const g = pctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      pctx.fillStyle = g; pctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    lastBrush = [fx, fy]
    paintUntil = performance.now() + 2500
  }

  const mouse = { x: 0, y: 0 }
  let dirty = true, vel = 0, velTarget = 0, visible = false

  // um renderizador por canvas (gravuras embaixo das linhas, planetas em cima)
  function renderer(canvas) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true }) || canvas.getContext('webgl', { premultipliedAlpha: true })
    const mip = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s }
    const prog = gl.createProgram()
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog); gl.useProgram(prog)
    const U = {}
    for (const n of ['u_rect', 'u_off', 'u_scale', 'u_tex', 'u_paint', 'u_p', 'u_mode', 'u_sketch', 'u_vel', 'u_time', 'u_dpr', 'u_origin', 'u_size', 'u_texel']) U[n] = gl.getUniformLocation(prog, n)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform1i(U.u_tex, 0); gl.uniform1i(U.u_paint, 1)

    const texture = (src, useMip) => {
      const t = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      if (useMip && mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR) }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      return t
    }
    const paintTex = texture(paint, false)
    const layers = []

    return {
      layers, texture,
      uploadPaint() { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, paintTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paint); gl.activeTexture(gl.TEXTURE0) },
      render(time, painting) {
        const dpr = Math.min(devicePixelRatio || 1, 2)
        const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
        gl.viewport(0, 0, w, h)
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, paintTex)
        gl.activeTexture(gl.TEXTURE0)
        gl.uniform1f(U.u_vel, vel); gl.uniform1f(U.u_time, time); gl.uniform1f(U.u_dpr, dpr)
        for (const L of layers) {
          if (L.p <= 0 && !painting) continue
          gl.bindTexture(gl.TEXTURE_2D, L.tex)
          gl.uniform4f(U.u_rect, L.rect.x, L.rect.y, L.rect.w, L.rect.h)
          gl.uniform2f(U.u_off, mouse.x * L.depth * PARALLAX, mouse.y * L.depth * PARALLAX)
          gl.uniform1f(U.u_scale, L.scale)
          gl.uniform1f(U.u_p, L.p); gl.uniform1f(U.u_mode, L.mode); gl.uniform1f(U.u_sketch, L.sketch ? 1 : 0)
          gl.uniform2f(U.u_origin, L.origin[0], L.origin[1]); gl.uniform2f(U.u_size, L.rect.w, L.rect.h)
          gl.uniform2f(U.u_texel, 1 / L.img.naturalWidth, 1 / L.img.naturalHeight)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
      },
      dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext() },
    }
  }

  /* ---------- estado e render ---------- */
  const low = renderer(els.gl), high = renderer(els.gl2)
  cleanups.push(() => { low.dispose(); high.dispose() })
  const vlays = [] // grupos SVG com parallax: { g, depth }

  function render(painting) {
    const t = performance.now() / 1000
    low.render(t, painting); high.render(t, painting)
    for (const V of vlays) V.g.setAttribute('transform', `translate(${(mouse.x * V.depth * PARALLAX).toFixed(2)} ${(mouse.y * V.depth * PARALLAX).toFixed(2)})`)
  }

  const tick = () => {
    const now = performance.now(), painting = now < paintUntil + 100
    if (painting) {
      // o pincel desbota a cada frame; depois de parado, limpa de vez
      pctx.globalCompositeOperation = 'destination-out'
      pctx.fillStyle = now < paintUntil ? 'rgba(0,0,0,.035)' : '#000'
      pctx.fillRect(0, 0, paint.width, paint.height)
      pctx.globalCompositeOperation = 'source-over'
      low.uploadPaint(); high.uploadPaint()
    }
    // velocidade do scroll suavizada: sobe rápido, assenta devagar
    vel += (velTarget - vel) * (velTarget > vel ? 0.25 : 0.08)
    velTarget *= 0.9
    // enquanto a composição está na tela renderiza sempre (cintilar, neblina); fora dela, só quando algo muda
    if (visible || dirty || painting) { render(painting); dirty = false }
  }
  gsap.ticker.add(tick)
  cleanups.push(() => gsap.ticker.remove(tick))
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !REDUCED })
  io.observe(comp)
  cleanups.push(() => io.disconnect())

  /* ---------- carregamento ---------- */
  async function loadSVG(name) {
    const t = await vectorSrc(name)
    const root = new DOMParser().parseFromString(t, 'image/svg+xml').documentElement
    const g = el('g')
    for (const n of [...root.childNodes]) g.appendChild(document.importNode(n, true))
    return g
  }

  // foco por partes (título e textos): ruído vira máscara que se abre, enquanto o blur assenta
  const fxRoot = els.root.appendChild(el('svg', { width: 0, height: 0, style: 'position:absolute', 'aria-hidden': 'true' }))
  cleanups.push(() => fxRoot.remove())
  function focusFx(target, id, blur, freq = 0.03) {
    const f = el('filter', { id, x: '-8%', y: '-40%', width: '116%', height: '180%', 'color-interpolation-filters': 'sRGB' }, fxRoot)
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: freq, numOctaves: 3, seed: id.replace('s3-', '').length * 7, result: 'n' }, f)
    el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0', result: 'na' }, f)
    const ct = el('feComponentTransfer', { in: 'na', result: 'm' }, f)
    const fa = el('feFuncA', { type: 'linear', slope: 6, intercept: -5 }, ct)
    const gb = el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: blur, result: 'b' }, f)
    el('feComposite', { in: 'b', in2: 'm', operator: 'in' }, f)
    target.style.filter = `url(#${id})`
    cleanups.push(() => { target.style.filter = '' })
    return { fa, gb, blur }
  }
  function focusIn(tl, fx, at, duration) {
    tl.fromTo(fx.fa, { attr: { intercept: -5 } }, { attr: { intercept: 1.2 }, duration, ease: 'power1.inOut' }, at)
      .fromTo(fx.gb, { attr: { stdDeviation: fx.blur } }, { attr: { stdDeviation: 0 }, duration: duration * 0.85, ease: 'power3.out' }, at)
  }

  const ready = (async () => {
  const pos = { mapa: meta.mapa }
  for (const c of camadas.camadas) pos[c.nome] = c

  // raster
  const names = Object.keys(RASTER)
  const imgs = await Promise.all(names.map((n) => loadImg(rasterUrl(n))))
  if (disposed) return null
  const layers = names.map((name, i) => {
    const cfg = RASTER[name], R = cfg.top ? high : low
    const L = { name, rect: pos[name], img: imgs[i], tex: R.texture(imgs[i], true), p: 0, scale: 1,
      mode: cfg.mode, origin: cfg.origin || [0.5, 0.5], depth: cfg.depth, sketch: cfg.sketch, zoom: cfg.zoom }
    R.layers.push(L)
    return L
  })

  // compasso do mapa
  const m = meta.mapa, R = m.w / 2, mcx = m.x + R, mcy = m.y + R
  const compassLay = el('g', {}, ov)
  const compass = el('path', { d: `M${mcx},${mcy - R}A${R},${R} 0 1 1 ${mcx},${mcy + R}A${R},${R} 0 1 1 ${mcx},${mcy - R}`, fill: 'none', stroke: '#24489a', 'stroke-width': 1.2, opacity: 0.7 }, compassLay)
  vlays.push({ g: compassLay, depth: RASTER.mapa.depth })

  // vetoriais, de baixo para cima (camadas 17 → 1 do Figma): linhas no SVG de baixo, estrelas no de cima
  const vectors = camadas.camadas.filter((c) => !RASTER[c.nome]).reverse()
  const contents = await Promise.all(vectors.map((c) => loadSVG(c.nome)))
  if (disposed) return null
  const nodes = {}
  vectors.forEach((c, i) => {
    const pop = POPS.includes(c.nome)
    const lay = el('g', {}, pop ? ov2 : ov), anim = el('g', {}, lay), tw = el('g', {}, anim)
    el('g', { transform: `translate(${c.x} ${c.y})` }, tw).appendChild(contents[i])
    vlays.push({ g: lay, depth: DEPTH[c.nome] ?? 0.6 })
    nodes[c.nome] = { anim, tw }
    if (GUIDES[c.nome]) {
      const mask = el('mask', { id: 's3-m-' + c.nome, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: FW, height: FH }, ovdefs)
      nodes[c.nome].guide = el('path', { d: GUIDES[c.nome], fill: 'none', stroke: '#fff', 'stroke-width': 20, 'stroke-linecap': 'round' }, mask)
      anim.setAttribute('mask', `url(#s3-m-${c.nome})`)
    }
  })

  /* ---------- timeline do desenho ---------- */
  // Pausada: quem dirige o tempo é o scroll (useManifestoHorizontal chama tl.time()).
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => { dirty = true } })

  for (const [name, t0, t1] of SCRIPT) {
    const d = t1 - t0, L = layers.find((l) => l.name === name), N = nodes[name]
    if (L) {
      tl.fromTo(L, { p: 0 }, { p: 1, duration: d, ease: L.mode === SIGNAL ? 'none' : 'power1.inOut' }, t0)
      if (L.zoom) tl.fromTo(L, { scale: L.zoom }, { scale: 1, duration: d * 1.2, ease: 'power2.out' }, t0)
      // o sinal do mapa termina de chegar a 74% do trecho; o compasso acompanha a frente
      if (L.mode === SIGNAL) tl.fromTo(compass, { drawSVG: '0%' }, { drawSVG: '100%', duration: d / 1.35 }, t0).to(compass, { opacity: 0, duration: 4 }, t1)
    } else if (N.guide) {
      tl.fromTo(N.guide, { drawSVG: '0%' }, { drawSVG: '100%', duration: d, ease: 'power2.inOut' }, t0)
    } else if (POPS.includes(name)) {
      // carimbo: entra girando, passa do tamanho e assenta com um lampejo
      tl.fromTo(N.anim, { scale: 0, rotation: -70, opacity: 0, transformOrigin: '50% 50%' },
        { scale: 1, rotation: 0, opacity: 1, duration: d, ease: 'back.out(2.2)' }, t0)
        .fromTo(N.anim, { filter: 'brightness(2.2)' }, { filter: 'brightness(1)', duration: d * 0.8, ease: 'power2.out' }, t0 + d * 0.3)
    }
  }

  // a linha do olhar sai do frame e pousa no título; o título entra em foco por partes
  const deco = els.titleDeco, T = 100
  const spans = els.titleSpans
  const fx = {
    hand: focusFx(els.hand, 's3-fx-hand', 4, 0.06),
    t0: focusFx(spans[0], 's3-fx-t0', 9), t1: focusFx(spans[1], 's3-fx-t1', 9),
    m1: focusFx(els.m1, 's3-fx-m1', 3, 0.08), m2: focusFx(els.m2, 's3-fx-m2', 3, 0.08), bin: focusFx(els.bin, 's3-fx-bin', 2, 0.1),
  }
  tl.fromTo(els.tipArrow, { drawSVG: '0%', opacity: 0 }, { drawSVG: '100%', opacity: 1, duration: 2.5, ease: 'power2.inOut' }, T)
  focusIn(tl, fx.hand, T + 1, 3)
  focusIn(tl, fx.t0, T + 1.5, 4.5)
  focusIn(tl, fx.t1, T + 3, 4.5)
  tl.fromTo(deco.querySelectorAll('path:not(.s3-rosa path)'), { drawSVG: '0%', opacity: 0 }, { drawSVG: '100%', opacity: 1, duration: 3, stagger: 0.25, ease: 'power2.inOut' }, T + 1)
    .fromTo(deco.querySelectorAll('use, circle:not(.s3-rosa circle)'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 1.2, stagger: 0.2, ease: 'back.out(3)' }, T + 3)
    .fromTo(deco.querySelectorAll('.s3-dotgrid, .s3-rosa'), { opacity: 0 }, { opacity: 1, duration: 1.5, stagger: 0.5 }, T + 4.5)
  focusIn(tl, fx.m1, T + 5, 2.5)
  focusIn(tl, fx.m2, T + 5.6, 2.5)
  focusIn(tl, fx.bin, T + 6.2, 2.2)
  // binário embaralha até assentar, da esquerda para a direita
  const bin = els.bin, words = ['0101', '1100', '0110', '1001'], scr = { t: 0 }
  tl.fromTo(scr, { t: 0 }, { t: 1, duration: 3, onUpdate() {
    bin.innerHTML = words.map((w, i) => '+&nbsp;&nbsp;' + [...w].map((ch, j) => (i * 4 + j) / 16 < scr.t ? ch : (Math.random() < 0.5 ? '0' : '1')).join('')).join('<br>')
  } }, T + 6.2)
  cleanups.push(() => tl.kill())

  // estrelas cintilam sozinhas (fora do scroll), cada uma no seu tempo
  if (!REDUCED) {
    for (const name of POPS) {
      const tw = gsap.to(nodes[name].tw, {
        opacity: 0.45, scale: 0.86, transformOrigin: '50% 50%', ease: 'sine.inOut',
        duration: gsap.utils.random(0.25, 0.55), repeat: -1, yoyo: true, repeatDelay: gsap.utils.random(1.5, 4), delay: gsap.utils.random(0, 3),
      })
      cleanups.push(() => tw.kill())
    }
  }
  if (REDUCED) tl.pause().progress(1)

  // interação: parallax suave + pincel que antecipa a tinta onde o cursor passa
  const qx = gsap.quickTo(mouse, 'x', { duration: 1, ease: 'power3', onUpdate: () => { dirty = true } })
  const qy = gsap.quickTo(mouse, 'y', { duration: 1, ease: 'power3' })
  if (!REDUCED) {
    const onMove = (e) => { qx(e.clientX / innerWidth * 2 - 1); qy(e.clientY / innerHeight * 2 - 1) }
    const onCompMove = (e) => {
      const r = comp.getBoundingClientRect()
      brush((e.clientX - r.left) / r.width * FW, (e.clientY - r.top) / r.height * FH)
    }
    const onLeave = () => { lastBrush = null }
    addEventListener('pointermove', onMove)
    comp.addEventListener('pointermove', onCompMove)
    comp.addEventListener('pointerleave', onLeave)
    cleanups.push(() => {
      removeEventListener('pointermove', onMove)
      comp.removeEventListener('pointermove', onCompMove)
      comp.removeEventListener('pointerleave', onLeave)
    })
  }
  const onResize = () => { dirty = true }
  addEventListener('resize', onResize)
  cleanups.push(() => removeEventListener('resize', onResize))
  dirty = true
  // Embrulhado: timeline do GSAP é thenable (.then = quando termina), e uma
  // async que a devolvesse direto ficaria esperando ela acabar — pausada, nunca.
  return { tl: REDUCED ? null : tl }
  })()

  return {
    ready,
    // velocidade do scroll (0–1) → desfoque/pixel do shader
    setVelocity(v) { if (!REDUCED) velTarget = Math.max(velTarget, v) },
    dispose() {
      disposed = true
      cleanups.forEach((fn) => fn())
      ov.querySelectorAll(':scope > g').forEach((g) => g.remove())
      ov2.replaceChildren()
      ovdefs.replaceChildren()
    },
  }
}
