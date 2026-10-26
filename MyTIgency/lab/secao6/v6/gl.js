// Texto e grade da seção 6 em WebGL (LAB v5).
//
// TEXTO — cada linha vira um quad com a própria textura (o texto desenhado
// num canvas 2D, letra a letra, nas posições que o DOM mediu; o DOM continua
// sendo o layout e a interface do editor por cima). O quad é subdividido no x
// para poder CURVAR: as pontas vão para trás (z ∝ x², câmera em perspectiva).
// A entrada é calculada POR PIXEL a partir do progresso da linha (uE), com
// técnicas de sites premiados (máscara de linha + atraso escalonado, revelação
// por desfoque, distorção suavizada, aberração cromática no sentido do
// movimento), mais o que o usuário aprovou na v5:
//   · as letras sobem de trás de uma máscara na base da linha, da esquerda
//     para a direita (o "split lines + stagger", sem partir o DOM);
//   · ondulam como na água enquanto sobem;
//   · deixam um rastro de movimento para baixo, com o vermelho mais longo;
//   · saem do desfoque para o foco.
// Também: RGB pela velocidade do scroll, desfoque das linhas fora de foco,
// halftone escorrendo ("lendo"), lupa sob a bola do cursor e grão; na v6,
// a borracha (um traço redondo que apaga), o vidro canelado (tiras fixas na
// tela que refratam o texto, no "apresentar") e a tinta gasta ("vivenciando.").
//
// GRADE — um quad de tela cheia (contexto próprio, atrás do DOM): linhas a
// cada 32 px; no canto esquerdo elas amolecem e se misturam ao fundo num
// pontilhado (Bayer, "fervendo" como a tinta do ato 2); a entrada varre a
// grade em células de pixel, da direita para a esquerda, com algumas células
// acendendo na frente — sem borda dura na troca 5 → 6. Opcional (v6): só os
// cruzamentos, como grade de pontos.
//
// A câmera em perspectiva é posta de modo que z = 0 caia 1:1 em px de tela.
import * as THREE from 'three'

const FOV = 35
const STRETCH_KW = [[56, 'ultra-condensed'], [69, 'extra-condensed'], [81, 'condensed'], [94, 'semi-condensed'], [106, 'normal'], [119, 'semi-expanded'], [131, 'expanded']]

const GLSL_UTIL = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float b2(vec2 p) { p = floor(p); return fract(p.x * 0.5 + p.y * p.y * 0.75); }
float b4(vec2 p) { return b2(p * 0.5) * 0.25 + b2(p); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { return vnoise(p) * 0.5 + vnoise(p * 2.1) * 0.3 + vnoise(p * 4.3) * 0.2; }
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
uniform float uHalftone, uGrain, uTime, uInvX, uRevealX;
uniform float uErase, uEraseR, uReed, uWorn, uDpr;
uniform vec4 uEA;
uniform vec3 uMouse;
uniform float uMouseR;
varying vec2 vUv;
${GLSL_UTIL}
float A(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(uTex, uv).a;
}
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

void main() {
  if (vUv.x > uRevealX) discard;
  vec2 px = 1.0 / uSize;
  // progresso local: da esquerda para a direita (ou logo atrás do cursor de texto)
  float el = uType > 0.5 ? clamp((uRevealX - vUv.x) / 0.12, 0.0, 1.0)
                         : clamp(uE * (1.0 + uStag) - vUv.x * uStag, 0.0, 1.0);
  float k = (1.0 - (1.0 - pow(1.0 - el, 3.0))) * uFx;
  vec2 uv = vUv;
  // lupa: o que está sob a bola incha
  if (uMouse.z > 0.001) {
    vec2 p = uv * uSize;
    vec2 d = p - uMouse.xy;
    float f = exp(-dot(d, d) / (uMouseR * uMouseR)) * uMouse.z;
    uv = (p - d * f * 0.45) / uSize;
  }
  // vidro canelado (no "apresentar"): tiras verticais fixas na tela que refratam o texto
  if (uReed > 0.001) {
    float f = fract(gl_FragCoord.x / uDpr / 26.0) - 0.5;
    uv.x += f * uReed * 42.0 * px.x;
  }
  // sobe de trás da máscara, ondulando como na água
  uv.y -= k * uRise;
  uv.y += sin(uv.x * 7.0 + uTime * 2.4) * k * uWave;
  uv.x += sin(uv.y * 9.0 - uTime * 1.7) * k * uWave * 0.12;

  float blur = k * uBlurMax + uDefocus + uReed * 4.0;
  float ag = S(uv, px, blur, uMotion);
  float ar = ag;
  float ab = ag;
  float rgb = k * uRgbMax + uRGB;
  if (rgb > 0.2) {
    ar = S(uv + vec2(rgb * px.x, 0.0), px, blur, uMotion);
    ab = S(uv - vec2(rgb * px.x * 0.7, 0.0), px, blur, uMotion);
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
  // halftone escorrendo
  if (uHalftone > 0.001) {
    float n = hash(vec2(floor(vUv.x * uSize.x / 6.0), 3.1));
    float len = uHalftone * (0.15 + n * 0.85) * 0.45;
    float m = ag;
    for (int i = 1; i <= 10; i++) {
      float fi = float(i);
      m = max(m, A(uv + vec2(0.0, len * fi / 10.0)) * (1.0 - fi / 11.0));
    }
    vec2 g = vUv * uSize / 6.0;
    float r = sqrt(m) * 0.62;
    float dots = 1.0 - smoothstep(r - 0.08, r + 0.08, length(fract(g) - 0.5));
    float h = smoothstep(0.0, 0.35, uHalftone);
    ag = mix(ag, dots, h);
    ar = mix(ar, dots, h);
    ab = mix(ab, dots, h);
  }
  // borracha: um traço redondo que apaga por onde passa (ref. Photoshop)
  if (uErase > 0.001) {
    vec2 pp = vUv * uSize;
    float keep = 1.0;
    for (int i = 0; i <= 28; i++) {
      float t = float(i) / 28.0 * uErase;
      vec2 c = vec2(uEA.x + uEA.y * t, uEA.z - uEA.w * sin(t * 12.566));
      keep = min(keep, smoothstep(uEraseR * 0.82, uEraseR, length(pp - c)));
    }
    ag *= keep;
    ar *= keep;
    ab *= keep;
  }
  // tinta gasta (só "vivenciando.", no fim): manchas e pontinhos sem tinta
  if (uWorn > 0.001) {
    vec2 q = vUv * uSize;
    float wear = smoothstep(0.5, 0.66, fbm(q / 6.0));
    float specks = step(0.86, hash(floor(q / 1.6)));
    float keep = clamp(1.0 - uWorn * (wear * 0.8 + specks * 0.55), 0.0, 1.0);
    ag *= keep;
    ar *= keep;
    ab *= keep;
  }
  // máscara na base da linha, só durante a entrada
  float mask = mix(1.0, smoothstep(uBoxBot - 0.004, uBoxBot + 0.012, vUv.y), smoothstep(0.0, 0.04, k));
  float fade = mix(1.0, smoothstep(0.0, 0.45, el), uFx) * (uFx > 0.5 ? 1.0 : el);
  vec3 base = vUv.x < uInvX ? uInk : uColor;
  vec3 col = base * ag + uRed * max(ar - ag, 0.0) + uColor * max(ab - ag, 0.0) * 0.5;
  float a = max(ag, max(ar, ab));
  float gr = 1.0 - uGrain * hash(gl_FragCoord.xy + fract(uTime) * 91.0);
  gl_FragColor = vec4(col, a) * uAlpha * gr * mask * fade;
}`

const GRID_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uDpr, uReveal, uUi, uTime, uDots;
${GLSL_UTIL}
void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  p.y = uRes.y - p.y;
  float xr = p.x / uRes.x;
  // canto esquerdo: as linhas amolecem e viram pontilhado
  float left = 1.0 - smoothstep(0.16, 0.62, length(vec2(xr / 1.4, (p.y / uRes.y - 0.55) / 1.2)));
  vec2 d = abs(fract(p / 32.0 + 0.5) - 0.5) * 32.0;
  float w = mix(0.8, 3.4, left);
  float l = max(1.0 - smoothstep(0.0, w, d.x), 1.0 - smoothstep(0.0, w, d.y));
  float a = l * mix(0.065, 0.075, left);
  // grade de pontos (ref. "Graphic & Digital Design"): só os cruzamentos
  if (uDots > 0.5) a = (1.0 - smoothstep(0.0, w * 0.6 + 0.9, length(d))) * mix(0.22, 0.16, left);
  float boil = floor(uTime * 12.5);
  float th = b4(floor(p / 3.0) + vec2(boil * 1.7, boil * 3.1));
  a *= mix(1.0, step(th, 1.0 - left * 0.8) * 1.5, left);
  // entrada: varre em células de 6 px, da direita para a esquerda, com borda pontilhada
  vec2 cell = floor(p / 6.0);
  float t2 = b4(cell);
  float front = 1.0 - uReveal * 1.3;
  float edge = (xr - front) / 0.24;
  float vis = step(t2, edge);
  float fresh = vis * (1.0 - step(t2, edge - 0.45));
  a *= vis;
  // células que acabaram de entrar acendem em papel, de leve, e apagam (sem vermelho)
  float lit = fresh * step(0.82, hash(cell + boil)) * (1.0 - uReveal * 0.5);
  float alpha = a + lit * 0.10;
  gl_FragColor = vec4(vec3(0.957, 0.953, 0.937) * alpha, alpha) * uUi;
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
    for (const l of lines) l.u.uDpr.value = dpr
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
      uHalftone: num(0), uGrain: num(0), uTime: num(0), uInvX: num(-1), uRevealX: num(2),
      uErase: num(0), uEraseR: num(10), uEA: num(new THREE.Vector4()), uReed: num(0), uWorn: num(0), uDpr: num(1),
      uMouse: num(new THREE.Vector3()), uMouseR: num(60),
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
      /** desenha a linha: glyphs [{ch, x, top, h}] em px do .t; pad em px; res = px de textura por px css */
      draw({ width, height, font, glyphs, pad, res }) {
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
  const u = { uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uReveal: { value: 0 }, uUi: { value: 1 }, uTime: { value: 0 }, uDots: { value: 0 } }
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
    /** reveal 0..1 (entrada), ui 0..1 (some no "apresentar"), dots: grade de pontos */
    render(time, reveal, ui, dots = false) {
      // o pontilhado "ferve" a 12,5 quadros/s: só redesenha quando algo muda
      const key = `${Math.floor(time * 12.5)}|${reveal.toFixed(4)}|${ui.toFixed(4)}|${dots}`
      if (key === last) return
      last = key
      u.uDots.value = dots ? 1 : 0
      u.uTime.value = time
      u.uReveal.value = reveal
      u.uUi.value = ui
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
