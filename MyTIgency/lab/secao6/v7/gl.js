// Texto, imagens e grade da seção 6 em WebGL (LAB v7).
//
// TEXTO — cada linha vira um quad com a própria textura, desenhada num canvas
// 2D nas posições que o DOM mediu (o DOM continua sendo o layout e a
// interface do editor por cima). Na textura, o canal azul separa o que é
// LETRA (b = 1, branco) do que é IMAGEM (b = 0, luminância em r): as imagens
// entram no mesmo quad, então recebem exatamente o mesmo movimento das letras.
// Entrada (por pixel, a partir do progresso uE): as letras sobem de trás de uma
// máscara na base da linha, da esquerda para a direita, ondulando como na água,
// com rastro vermelho e saindo do desfoque; a linha começa curvada para trás
// nas pontas (vertex). A linha digitada não usa nada disso: só aparece até a
// ponta do cursor de texto (uRevealX), nítida.
// Imagens: viram o dither de 4 cinzas do site (o mesmo da TV e do cursor 3D),
// em células de 3 px de tela.
// "lendo": fica oca (contorno de 1,5 px, papel a 60% — a "promessas" da cena A).
// Final: a onda de choque do "apresentar" (uShock) passa empurrando o texto
// para fora, com a frente em vermelho; a grade sente a mesma onda.
// Também: lupa sob a bola do cursor, desfoque leve das linhas fora de foco,
// grão. A câmera em perspectiva é posta de modo que z = 0 caia 1:1 em px.
import * as THREE from 'three'

const FOV = 35
const STRETCH_KW = [[56, 'ultra-condensed'], [69, 'extra-condensed'], [81, 'condensed'], [94, 'semi-condensed'], [106, 'normal'], [119, 'semi-expanded'], [131, 'expanded']]

const GLSL_UTIL = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float b2(vec2 p) { p = floor(p); return fract(p.x * 0.5 + p.y * p.y * 0.75); }
float b4(vec2 p) { return b2(p * 0.5) * 0.25 + b2(p); }
// onda de choque: anel de raio r (px de tela), largura w; devolve o quanto o pixel está no anel
float ring(vec2 sp, vec4 shock, float w) {
  float q = (length(sp - shock.xy) - shock.z) / w;
  return exp(-q * q);
}
`

const VERT = /* glsl */ `
uniform float uBend;
uniform float uW;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float x = position.x * 2.0;
  wp.z -= uBend * uW * 0.45 * x * x;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uSize;
uniform vec3 uColor;
uniform vec3 uInk;
uniform vec3 uRed;
uniform float uAlpha, uE, uFx, uStag, uType, uRise, uBoxBot, uWave, uBlurMax, uTrail, uRgbMax, uRGB, uMotion, uDefocus;
uniform float uGrain, uTime, uInvX, uRevealX, uHollow, uDpr, uViewH;
uniform vec4 uShock;
uniform vec3 uMouse;
uniform float uMouseR;
varying vec2 vUv;
${GLSL_UTIL}
vec4 T(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(uTex, uv);
}
// cobertura só das LETRAS (as imagens têm b = 0)
float A(vec2 uv) { vec4 t = T(uv); return t.a * t.b; }
// foco + movimento da câmera: disco de 16 amostras, alongado no y
float S(vec2 uv, vec2 px, float blur, float motion) {
  if (blur < 0.3 && motion < 0.3) return A(uv);
  float s = 0.0;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float ang = fi * 2.39996;
    float rr = sqrt((fi + 0.5) / 16.0);
    vec2 o = vec2(cos(ang), sin(ang)) * rr * blur * px;
    o.y += (fi / 15.0 - 0.5) * motion * px.y;
    s += A(uv + o);
  }
  return s / 16.0;
}
vec3 pal(float i) {
  return i < 0.5 ? vec3(0.078) : i < 1.5 ? vec3(0.373) : i < 2.5 ? vec3(0.725) : vec3(0.957, 0.953, 0.937);
}

void main() {
  if (vUv.x > uRevealX) discard;
  vec2 px = 1.0 / uSize;
  vec2 sp = vec2(gl_FragCoord.x, uViewH * uDpr - gl_FragCoord.y) / uDpr; // px de tela, do topo
  // progresso local: da esquerda para a direita; a linha digitada fica nítida
  float el = uType > 0.5 ? 1.0 : clamp(uE * (1.0 + uStag) - vUv.x * uStag, 0.0, 1.0);
  float k = pow(1.0 - el, 3.0) * uFx;
  vec2 uv = vUv;
  // lupa: o que está sob a bola incha
  if (uMouse.z > 0.001) {
    vec2 p = uv * uSize;
    vec2 d = p - uMouse.xy;
    float f = exp(-dot(d, d) / (uMouseR * uMouseR)) * uMouse.z;
    uv = (p - d * f * 0.45) / uSize;
  }
  // onda de choque do "apresentar": empurra para fora do centro do clique
  float shock = 0.0;
  if (uShock.w > 0.01) {
    shock = ring(sp, uShock, 70.0);
    vec2 dir = normalize(sp - uShock.xy + 0.0001);
    uv -= vec2(dir.x, -dir.y) * shock * uShock.w * px;
    shock *= clamp(uShock.w / 24.0, 0.0, 1.0);
  }
  // sobe de trás da máscara, ondulando como na água
  uv.y -= k * uRise;
  uv.y += sin(uv.x * 7.0 + uTime * 2.4) * k * uWave;
  uv.x += sin(uv.y * 9.0 - uTime * 1.7) * k * uWave * 0.12;

  float blur = k * uBlurMax + uDefocus;
  float ag = S(uv, px, blur, uMotion);
  // palavra oca: só o contorno (o que sobra quando se subtrai a letra encolhida)
  if (uHollow > 0.001) {
    float er = 1.0;
    for (int i = 0; i < 8; i++) {
      float ang = float(i) * 0.785398;
      er = min(er, A(uv + vec2(cos(ang), sin(ang)) * 1.5 * px));
    }
    ag = mix(ag, clamp(ag - er, 0.0, 1.0) * 0.6, uHollow);
  }
  float ar = ag;
  float ab = ag;
  float rgb = k * uRgbMax + uRGB + shock * 9.0;
  if (rgb > 0.2) {
    ar = S(uv + vec2(rgb * px.x, 0.0), px, blur, uMotion);
    ab = S(uv - vec2(rgb * px.x * 0.7, 0.0), px, blur, uMotion);
    if (uHollow > 0.001) { ar = mix(ar, ag, uHollow); ab = mix(ab, ag, uHollow); }
  }
  // rastro do movimento (para baixo, de onde a letra veio); o vermelho fica mais longo
  float tr = k * uTrail;
  if (tr > 0.0005) {
    float tg = 0.0;
    float trr = 0.0;
    for (int i = 1; i <= 8; i++) {
      float f = float(i) / 8.0;
      tg += A(uv + vec2(0.0, tr * f));
      trr += A(uv + vec2(0.0, tr * f * 1.8));
    }
    ag = max(ag, tg / 8.0 * 0.5);
    ab = max(ab, tg / 8.0 * 0.5);
    ar = max(ar, trr / 8.0 * 0.95);
  }
  vec3 base = vUv.x < uInvX ? uInk : uColor;
  vec3 col = base * ag + uRed * max(ar - ag, 0.0) + uColor * max(ab - ag, 0.0) * 0.5;
  float a = max(ag, max(ar, ab));

  // imagens: o dither de 4 cinzas do site, em células de 3 px de tela
  vec4 ti = T(uv);
  float ia = ti.a * (1.0 - ti.b);
  if (ia > 0.001) {
    float lv = clamp(ti.r, 0.0, 1.0) * 3.0;
    float idx = floor(lv) + step(b4(floor(sp / 3.0)), fract(lv));
    col += pal(min(idx, 3.0)) * ia;
    a += ia;
  }

  // máscara na base da linha, só durante a entrada
  float mask = mix(1.0, smoothstep(uBoxBot - 0.004, uBoxBot + 0.012, vUv.y), smoothstep(0.0, 0.04, k));
  float fade = uFx > 0.5 ? smoothstep(0.0, 0.45, el) : el;
  float gr = 1.0 - uGrain * hash(gl_FragCoord.xy + fract(uTime) * 91.0);
  gl_FragColor = vec4(col, min(a, 1.0)) * uAlpha * gr * mask * fade;
}`

const GRID_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uDpr, uReveal, uUi, uTime, uDots;
uniform vec4 uShock;
${GLSL_UTIL}
void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  p.y = uRes.y - p.y;
  // a onda do "apresentar" também passa pela grade
  float shock = 0.0;
  if (uShock.w > 0.01) {
    shock = ring(p, uShock, 70.0);
    p -= normalize(p - uShock.xy + 0.0001) * shock * uShock.w;
  }
  float xr = p.x / uRes.x;
  // canto esquerdo: as linhas amolecem e viram pontilhado
  float left = 1.0 - smoothstep(0.16, 0.62, length(vec2(xr / 1.4, (p.y / uRes.y - 0.55) / 1.2)));
  vec2 d = abs(fract(p / 32.0 + 0.5) - 0.5) * 32.0;
  float w = mix(0.8, 3.4, left);
  float l = max(1.0 - smoothstep(0.0, w, d.x), 1.0 - smoothstep(0.0, w, d.y));
  float a = l * mix(0.065, 0.075, left);
  // grade de pontos: só os cruzamentos
  if (uDots > 0.5) a = (1.0 - smoothstep(0.0, w * 0.6 + 0.9, length(d))) * mix(0.22, 0.16, left);
  float boil = floor(uTime * 12.5);
  float th = b4(floor(p / 3.0) + vec2(boil * 1.7, boil * 3.1));
  a *= mix(1.0, step(th, 1.0 - left * 0.8) * 1.5, left);
  // entrada: varre em células de 6 px, da direita para a esquerda, com borda pontilhada
  vec2 cell = floor(p / 6.0);
  float t2 = b4(cell);
  float edge = (xr - (1.0 - uReveal * 1.3)) / 0.24;
  float vis = step(t2, edge);
  float fresh = vis * (1.0 - step(t2, edge - 0.45));
  a *= vis;
  // células que acabaram de entrar acendem em papel, de leve, e apagam
  float lit = fresh * step(0.82, hash(cell + boil)) * (1.0 - uReveal * 0.5);
  // na onda, as linhas acendem (a grade some junto com a interface, mas a onda ainda a pega)
  float alpha = (a + lit * 0.10) * uUi + l * shock * 0.35 * clamp(uShock.w / 24.0, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.957, 0.953, 0.937) * alpha, alpha);
}`

export function mountTextGL(canvas) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true })
  } catch {
    return null
  }
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 20000)
  const geo = new THREE.PlaneGeometry(1, 1, 96, 1)
  const lines = []
  const paper = new THREE.Color('#f4f3ef')
  const ink = new THREE.Color('#141414')
  const red = new THREE.Color('#ff4438')

  function resize(w, h) {
    const dpr = Math.min(2, devicePixelRatio || 1)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    for (const l of lines) { l.u.uDpr.value = dpr; l.u.uViewH.value = h }
    const dist = h / 2 / Math.tan((FOV * Math.PI) / 360)
    camera.aspect = w / h
    camera.position.set(w / 2, -h / 2, dist)
    camera.lookAt(w / 2, -h / 2, 0)
    camera.far = dist * 6
    camera.updateProjectionMatrix()
  }

  function addLine() {
    const cv = document.createElement('canvas')
    const ctx = cv.getContext('2d')
    const tex = new THREE.CanvasTexture(cv)
    tex.minFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    const num = (v) => ({ value: v })
    const u = {
      uTex: num(tex), uSize: num(new THREE.Vector2(1, 1)), uW: num(1), uBend: num(0),
      uColor: num(paper), uInk: num(ink), uRed: num(red),
      uAlpha: num(0), uE: num(0), uFx: num(1), uStag: num(0.6), uType: num(0), uRise: num(0), uBoxBot: num(0),
      uWave: num(0), uBlurMax: num(0), uTrail: num(0), uRgbMax: num(0), uRGB: num(0), uMotion: num(0), uDefocus: num(0),
      uGrain: num(0), uTime: num(0), uInvX: num(-1), uRevealX: num(2), uHollow: num(0), uDpr: num(1), uViewH: num(1),
      uShock: num(new THREE.Vector4()), uMouse: num(new THREE.Vector3()), uMouseR: num(60),
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: u, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    scene.add(mesh)
    const line = {
      u,
      /**
       * desenha a linha. glyphs [{ch, x, top, h}] e images [{x, top, w, h, src}] em px do .t
       * (src: canvas/imagem já carregada; a imagem é cortada em cápsula, como cover);
       * pad em px; res = px de textura por px css
       */
      draw({ width, height, font, glyphs, images = [], pad, res }) {
        const tw = Math.ceil((width + pad.x * 2) * res)
        const th = Math.ceil((height + pad.y * 2) * res)
        // o three reserva o espaço da textura uma vez só: mudou o tamanho, precisa recriar
        if (tw !== cv.width || th !== cv.height) tex.dispose()
        cv.width = tw
        cv.height = th
        ctx.setTransform(res, 0, 0, res, 0, 0)
        ctx.clearRect(0, 0, cv.width, cv.height)
        ctx.font = font
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'alphabetic'
        const m = ctx.measureText('Hg')
        const asc = m.fontBoundingBoxAscent
        const desc = m.fontBoundingBoxDescent
        for (const g of glyphs) ctx.fillText(g.ch, pad.x + g.x, pad.y + g.top + (g.h - (asc + desc)) / 2 + asc)
        for (const im of images) ctx.drawImage(capsule(im, res), pad.x + im.x, pad.y + im.top, im.w, im.h)
        tex.needsUpdate = true
      },
      /** posição na tela (px do contêiner): centro, tamanho, giro (rad) */
      place(cx, cy, w, h, rot = 0) {
        mesh.position.set(cx, -cy, 0)
        mesh.scale.set(w, h, 1)
        mesh.rotation.z = -rot
        u.uSize.value.set(w, h)
        u.uW.value = w
      },
      show(on) { mesh.visible = on },
    }
    lines.push(line)
    return line
  }

  return {
    resize,
    addLine,
    render(time) {
      for (const l of lines) l.u.uTime.value = time
      renderer.render(scene, camera)
    },
  }
}

// a imagem cortada em cápsula, em tons de cinza no r/g e b = 0 (marca de imagem para o shader)
function capsule({ w, h, src }, res) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * res))
  c.height = Math.max(1, Math.round(h * res))
  const x = c.getContext('2d')
  const r = c.height / 2
  x.beginPath()
  x.roundRect(0, 0, c.width, c.height, r)
  x.clip()
  const sw = src.naturalWidth || src.width
  const sh = src.naturalHeight || src.height
  const s = Math.max(c.width / sw, c.height / sh) // cover
  x.drawImage(src, (c.width - sw * s) / 2, (c.height - sh * s) / 2, sw * s, sh * s)
  const d = x.getImageData(0, 0, c.width, c.height)
  const px = d.data
  for (let i = 0; i < px.length; i += 4) {
    const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
    px[i] = l
    px[i + 1] = l
    px[i + 2] = 0
  }
  x.putImageData(d, 0, 0)
  return c
}

/** placeholder enquanto a foto não chega: um degradê com manchas (o dither mostra o volume) */
export function placeholderImage(seed = 1) {
  const c = document.createElement('canvas')
  c.width = 600
  c.height = 300
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 600, 300)
  g.addColorStop(0, '#2a2a2a')
  g.addColorStop(1, '#bdbdbd')
  x.fillStyle = g
  x.fillRect(0, 0, 600, 300)
  let s = seed * 9301
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  for (let i = 0; i < 5; i++) {
    const rg = x.createRadialGradient(rnd() * 600, rnd() * 300, 0, rnd() * 600, rnd() * 300, 60 + rnd() * 160)
    rg.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.8)')
    rg.addColorStop(1, 'rgba(128,128,128,0)')
    x.fillStyle = rg
    x.fillRect(0, 0, 600, 300)
  }
  return c
}

/** a grade do fundo, num contexto próprio (fica atrás do DOM) */
export function mountGridGL(canvas) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true })
  } catch {
    return null
  }
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const u = {
    uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uReveal: { value: 0 }, uUi: { value: 1 },
    uTime: { value: 0 }, uDots: { value: 0 }, uShock: { value: new THREE.Vector4() },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: u, fragmentShader: GRID_FRAG,
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  })
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat))
  let last = ''
  return {
    resize(w, h) {
      const dpr = Math.min(2, devicePixelRatio || 1)
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      u.uRes.value.set(w, h)
      u.uDpr.value = dpr
      last = ''
    },
    /** reveal 0..1 (entrada), ui 0..1 (some no "apresentar"), dots: grade de pontos, shock: [x, y, raio, força] */
    render(time, reveal, ui, dots = false, shock = null) {
      // o pontilhado "ferve" a 12,5 quadros/s: só redesenha quando algo muda
      const sk = shock ? shock.map((v) => v.toFixed(1)).join(',') : ''
      const key = `${Math.floor(time * 12.5)}|${reveal.toFixed(4)}|${ui.toFixed(4)}|${dots}|${sk}`
      if (key === last) return
      last = key
      u.uDots.value = dots ? 1 : 0
      u.uTime.value = time
      u.uReveal.value = reveal
      u.uUi.value = ui
      if (shock) u.uShock.value.set(...shock)
      else u.uShock.value.w = 0
      renderer.render(scene, camera)
    },
  }
}

/** "font" do canvas a partir do estilo calculado de uma letra do DOM */
export function canvasFont(cs) {
  const pct = parseFloat(cs.fontStretch) || 100
  const kw = (STRETCH_KW.find(([max]) => pct <= max) ?? STRETCH_KW.at(-1))[1]
  return { font: `${cs.fontStyle} ${cs.fontWeight} ${kw} ${cs.fontSize} ${cs.fontFamily}` }
}
