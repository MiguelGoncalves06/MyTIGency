// TV GLB com dither (port de TVdither/tv3d.js). Mesmo visual e mesma intro
// (pontos aparecendo + giro de entrada, a cada vez que entra na tela).
// Diferenças do original: sem OrbitControls (não arrasta — o giro virá do
// scroll lateral), reduced-motion entrega direto o estado final e há
// dispose() para o React desmontar sem vazar contexto WebGL.
//
// Durante o scroll (useManifestoHorizontal + DitherTV), três camadas:
//  - peso: giro e inclinação seguem o scroll por molas amortecidas — a TV
//    inclina contra o movimento lateral da trilha e balança ao parar;
//  - sintonia: a tela mostra chiado que entra em sintonia (setTune) até
//    travar no logo MyTi quando a TV fica de frente;
//  - foco: scroll rápido engrossa o dither (ponto maior, menos tons), que
//    volta a ficar nítido quando o scroll desacelera.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'

// Molas (k = rigidez, zeta = amortecimento; < 1 passa do ponto e volta).
// Giro: segue o alvo do scroll com um leve overshoot — sensação de massa.
const TURN_SPRING = { k: 70, zeta: 0.62 }
// Inclinação: mais solta, para balançar um pouco quando a trilha para.
const TILT_SPRING = { k: 48, zeta: 0.26 }
// rad de inclinação por (largura de tela / s) de velocidade lateral, e teto.
const TILT_GAIN = 0.06
const TILT_MAX = 0.13
// Suavização (fração por frame a 60fps) das velocidades medidas por frame —
// o ticker do GSAP e o loop daqui não andam em fase, o delta bruto oscila.
const VEL_SMOOTH = 0.25
// Foco: velocidade de scroll (alturas de tela / s) em que o dither começa a
// engrossar e em que chega ao máximo; entra rápido e volta devagar.
const BLUR_SPEED = [1.4, 4.5]
const BLUR_ATTACK = 0.35
const BLUR_RELEASE = 0.06
const BLUR_PX = 1.2 // ponto chega a pixel × (1 + BLUR_PX)

// Vidro da tela, medido no tv.min.glb (raycast frontal, na escala em que a TV
// é normalizada — maior dimensão = 1.7, centrada, frente para +Z): retângulo
// ±HX × ±HY em torno de y = CY, abaulado z = Z0 − A·u² − B·v² + C·u²v² com
// u, v ∈ [−1, 1]. A imagem fica OFFSET à frente do vidro e passa MARGIN da
// borda — o excesso some atrás da moldura, que é mais alta que o vidro ali.
export const SCREEN = { CY: 0.1736, HX: 0.676, HY: 0.526, Z0: 0.7675, A: 0.135, B: 0.09, C: 0.045, OFFSET: 0.008, MARGIN: 1.03 }
const TV_SIZE = 1.7

const gltfs = {}
const load = (url) => (gltfs[url] ||= new GLTFLoader().loadAsync(url))

// Mola amortecida, Euler semi-implícito em passos fixos (estável com dt alto).
function stepSpring(s, target, { k, zeta }, dt) {
  const c = 2 * zeta * Math.sqrt(k)
  const n = Math.ceil(dt * 120)
  const h = dt / n
  for (let i = 0; i < n; i++) {
    s.v += (k * (target - s.x) - c * s.v) * h
    s.x += s.v * h
  }
  return Math.abs(target - s.x) > 0.0005 || Math.abs(s.v) > 0.002
}

// Tela: chiado → sintonia → imagem travada. uTune 0..1 vem do scroll; o
// chiado anima no tempo (é o estado "sem sinal", não decoração). Valores em
// espaço de tela; sai com pow 2.2 porque o passe de dither aplica 1/2.2.
const screenFragment = `
  uniform sampler2D uMap; uniform float uTime, uTune;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    float s = 1. - uTune;
    vec2 uv = vUv;
    // V-hold: a imagem rola e desacelera até travar conforme sintoniza
    // (posição = função do scroll), com a faixa escura entre quadros.
    float roll = s * s * 2.6;
    uv.y = fract(uv.y + roll);
    float seam = roll > 0. ? smoothstep(.07, 0., min(uv.y, 1. - uv.y)) * min(1., s * 4.) : 0.;
    // H-hold: linhas deslocadas, cada vez menos.
    float row = floor(uv.y * 96.);
    uv.x += s * (sin(row * .7 + uTime * 7.) * .03 + (hash(vec2(row, floor(uTime * 18.))) - .5) * .12 * s);
    float img = dot(texture2D(uMap, clamp(uv, 0., 1.)).rgb, vec3(.299, .587, .114));
    float n = hash(floor(vUv * vec2(150., 116.)) + fract(uTime * 7.31) * 113.);
    float signal = smoothstep(.12, .9, uTune);
    float l = mix(n * 1.1, img, signal) + (n - .5) * .35 * (1. - signal) * signal * 2.;
    l *= 1. - seam * .85;
    l *= .9 + .1 * sin(vUv.y * 380.); // scanlines
    vec2 c = vUv - .5;
    l *= 1. - dot(c, c) * 1.1; // vinheta do tubo
    gl_FragColor = vec4(vec3(pow(clamp(l, 0., 1.), 2.2)), 1.);
  }`

function buildScreen(imageUrl, shape) {
  const { CX = 0, CY, HX, HY, Z0, A, B, C, OFFSET, MARGIN } = shape
  const geo = new THREE.PlaneGeometry(2 * HX * MARGIN, 2 * HY * MARGIN, 24, 18)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / HX
    const v = pos.getY(i) / HY
    pos.setXYZ(i, pos.getX(i) + CX, pos.getY(i) + CY, Z0 - A * u * u - B * v * v + C * u * u * v * v + OFFSET)
  }
  // Imagem da sintonia: logo centrado num quadro escuro 4:3 (o vidro é ~1.29:1).
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 198
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#161616'
  ctx.fillRect(0, 0, cv.width, cv.height)
  const map = new THREE.CanvasTexture(cv)
  if (imageUrl) {
    const img = new Image()
    img.onload = () => {
      const h = cv.height * 0.72
      const w = h * (img.naturalWidth / img.naturalHeight || 1)
      ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h)
      map.needsUpdate = true
    }
    img.src = imageUrl
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uTime: { value: 0 }, uTune: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: screenFragment,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.dispose = () => { geo.dispose(); mat.dispose(); map.dispose() }
  return mesh
}

export function mountDitherTV(canvas, {
  url,
  palette, // 4 cores, escuro → claro
  pixel = 2, // tamanho do ponto em px CSS
  gap = 0.3, // grade de 1px entre os pontos (0 = sem grade)
  contrast = 1.35,
  bright = 0.02,
  restAngle = 0.6, // rad, vista 3/4
  // autoPlay: intro toca sozinha a cada entrada na tela (comportamento do
  // protótipo). false = começa escondida e só toca quando play() for chamado,
  // uma vez — quem chama decide o momento (ex.: entrada em combo da seção 2).
  autoPlay = true,
  revealDuration = 1.2, // s até os pontos aparecerem todos
  spinDuration = 1.8, // s do giro de entrada até o repouso
  screenImage = null, // url da imagem que a tela sintoniza
  tune: initialTune = 1, // 0 = chiado, 1 = sintonizada (ver setTune)
  // Por modelo (padrões = tv.min.glb): para onde a frente do GLB aponta
  // (rotação em Y que a vira para +Z), o vidro medido (ver SCREEN) e se a
  // tela da sintonia aparece (false = mostra a tela do próprio modelo).
  front = -Math.PI / 2,
  screenShape = SCREEN,
  showScreen = true,
  colorBoost = 2.5, // clareia o material (plástico escuro); modelo claro pede menos
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true })
  // Mesmo teto do outro WebGL do projeto (asciiLogo.js) — o dither já é
  // deliberadamente blocado, então DPR nativo não acrescenta nitidez
  // perceptível, só custo de fill-rate por frame.
  renderer.setPixelRatio(1)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  camera.position.set(0, 0.9, 5.4)
  // O OrbitControls do original apontava a câmera para a origem no setup.
  camera.lookAt(0, 0, 0)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.8))
  const key = new THREE.DirectionalLight(0xffffff, 2.8)
  key.position.set(3, 3, 5)
  scene.add(key)
  // Luz quente logo acima da tela: dá os pontos de brilho no vidro.
  const glare = new THREE.PointLight(0xffffff, 2.5, 3)
  glare.position.set(-0.2, 1.1, 1.2)
  scene.add(glare)

  // tilt (inclinação, eixo na base da TV) → pivot (giro em Y, centro).
  const tilt = new THREE.Group()
  scene.add(tilt)
  const pivot = new THREE.Group()
  tilt.add(pivot)
  let screen = null
  let screenScale = 1
  let screenVisible = showScreen
  let mixer = null
  let disposed = false
  load(url).then(({ scene: src, animations }) => {
    if (disposed) return
    // SkeletonUtils: um clone simples quebra modelos com esqueleto
    const model = cloneSkinned(src)
    if (animations.length) {
      mixer = new THREE.AnimationMixer(model)
      animations.forEach((clip) => mixer.clipAction(clip).play())
    }
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    model.position.sub(box.getCenter(new THREE.Vector3()))
    // Plástico preto metálico vira mancha no dither; fosco e mais claro deixa o volume aparecer.
    model.traverse((o) => {
      if (!o.material) return
      for (const m of [].concat(o.material)) {
        Object.assign(m, { metalness: 0, metalnessMap: null })
        m.color?.setScalar(colorBoost)
      }
    })
    const holder = new THREE.Group()
    holder.add(model)
    holder.rotation.y = front
    pivot.add(holder)
    const scale = TV_SIZE / Math.max(size.x, size.y, size.z)
    pivot.scale.setScalar(scale)
    // Inclina pela base, como um objeto apoiado — não pelo centro.
    const base = (size.y * scale) / 2
    tilt.position.y = -base
    pivot.position.y = base
    screenScale = 1 / scale // SCREEN está na escala normalizada
    setScreenShape(screenShape)
  })

  function setScreenShape(shape) {
    screenShape = shape
    if (!screenScale || disposed || !pivot.children.length) return
    if (screen) { pivot.remove(screen); screen.dispose() }
    screen = buildScreen(screenImage, shape)
    screen.scale.setScalar(screenScale)
    screen.visible = screenVisible
    pivot.add(screen)
  }

  // Cena → render target → dither ordenado (Bayer 8×8) em paleta de 4 cores.
  const rt = new THREE.WebGLRenderTarget(1, 1)
  const post = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      tMap: { value: rt.texture }, uRes: { value: new THREE.Vector2() },
      uPx: { value: 1 }, uReveal: { value: 0 }, uGap: { value: gap }, uGrid: { value: 0 },
      uLevels: { value: 3 },
      uContrast: { value: contrast }, uBright: { value: bright },
      uPal: { value: palette.map((c) => new THREE.Color(c)) },
    },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    // uLevels: degraus de tom — 3 = as 4 cores (repouso), 1 = só os extremos.
    fragmentShader: `
      uniform sampler2D tMap; uniform vec2 uRes; uniform vec3 uPal[4];
      uniform float uPx, uReveal, uGap, uGrid, uLevels, uContrast, uBright;
      float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
      float b4(vec2 a){ return b2(.5 * a) * .25 + b2(a); }
      float b8(vec2 a){ return b4(.5 * a) * .25 + b2(a); }
      void main(){
        vec2 cell = floor(gl_FragCoord.xy / uPx);
        vec4 c = texture2D(tMap, (cell + .5) * uPx / uRes);
        float l = pow(dot(c.rgb, vec3(.299, .587, .114)), 1. / 2.2);
        l = clamp((l - .5) * uContrast + .5 + uBright, 0., 1.);
        float t = b8(cell);
        float k = clamp(floor(l * uLevels + t), 0., uLevels);
        float i = floor(k * 3. / uLevels + .5);
        vec3 col = i < .5 ? uPal[0] : i < 1.5 ? uPal[1] : i < 2.5 ? uPal[2] : uPal[3];
        vec2 f = mod(gl_FragCoord.xy, uPx);
        if (uGrid > .5 && (f.x < 1. || f.y < 1.)) col = mix(col, uPal[3], uGap);
        float a = step(.5, c.a) * step(t, uReveal * 1.001);
        gl_FragColor = vec4(col, a);
      }`,
  })
  const postScene = new THREE.Scene()
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post)
  postScene.add(postQuad)
  const postCam = new THREE.Camera()

  let basePx = 1
  const resizeObserver = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = canvas
    if (!w || !h) return
    renderer.setSize(w, h, false)
    const dpr = renderer.getPixelRatio()
    rt.setSize(w * dpr, h * dpr)
    post.uniforms.uRes.value.set(w * dpr, h * dpr)
    basePx = Math.max(1, Math.round(pixel * dpr))
    // grade só no tamanho de repouso — o ponto engrossado pelo foco não a ganha
    post.uniforms.uGrid.value = basePx > 2 ? 1 : 0
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(canvas)

  // Intro: pontos dissolvem + giro até o repouso; render pausa fora da tela.
  // autoPlay: repete a cada entrada. Senão: escondida (introStart = +∞ → t
  // negativo) até o primeiro play(); chamadas seguintes não reiniciam.
  let introStart = reduceMotion || autoPlay ? -Infinity : Infinity
  let played = false
  let visible = false
  const play = () => {
    if (reduceMotion) { introStart = -Infinity; return }
    if (!autoPlay && played) return
    played = true
    introStart = performance.now()
  }
  const intersectionObserver = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible && autoPlay) play()
  }, { threshold: autoPlay ? 0.4 : 0 })
  intersectionObserver.observe(canvas)
  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3)

  // Renderiza menos durante scroll ativo — ver setScrolling(). Giro/uniforms
  // continuam atualizando todo frame (barato); só os dois render() caros
  // (cena 3D + passe de post-process) ficam de fora nos frames pulados.
  let isScrolling = false
  let frameCounter = 0
  // Entradas do scroll: giro (setTurn, deslocamento do ângulo em relação ao
  // repouso), deslocamento lateral da trilha (setShift, px) e posição do
  // scroll (setScroll, px). As velocidades saem da diferença entre frames.
  let turnTarget = 0
  let shift = 0
  let scroll = 0
  let lastShift = 0
  let lastScroll = 0
  let shiftVel = 0 // larguras de tela / s
  let scrollVel = 0 // alturas de tela / s
  const turnS = { x: 0, v: 0 }
  const tiltS = { x: 0, v: 0 }
  let blur = 0
  let tune = reduceMotion ? 1 : initialTune
  let lastNow = 0

  renderer.setAnimationLoop((now) => {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0
    lastNow = now
    // Fora da tela as posições continuam sendo acompanhadas — senão a volta
    // à tela leria todo o trajeto perdido como um único salto de velocidade.
    if (dt > 0) {
      const k = 1 - Math.pow(1 - VEL_SMOOTH, dt * 60)
      shiftVel += ((shift - lastShift) / dt / window.innerWidth - shiftVel) * k
      scrollVel += ((scroll - lastScroll) / dt / window.innerHeight - scrollVel) * k
    }
    lastShift = shift
    lastScroll = scroll
    if (!visible) return

    let moving = false
    if (!reduceMotion && dt > 0) {
      moving = stepSpring(turnS, turnTarget, TURN_SPRING, dt)
      const lean = Math.max(-TILT_MAX, Math.min(TILT_MAX, shiftVel * TILT_GAIN))
      moving = stepSpring(tiltS, lean, TILT_SPRING, dt) || moving
      const [s0, s1] = BLUR_SPEED
      const target = Math.min(1, Math.max(0, (Math.abs(scrollVel) - s0) / (s1 - s0)))
      blur += (target - blur) * (1 - Math.pow(1 - (target > blur ? BLUR_ATTACK : BLUR_RELEASE), dt * 60))
      if (blur < 0.001) blur = 0
      moving ||= blur > 0
    }
    const t = (now - introStart) / 1000
    post.uniforms.uReveal.value = ease((t - 0.1) / revealDuration)
    post.uniforms.uPx.value = Math.round(basePx * (1 + blur * BLUR_PX))
    post.uniforms.uLevels.value = 3 - Math.round(blur * 2)
    pivot.rotation.y = restAngle - 2 * (1 - ease(t / spinDuration)) + turnS.x
    tilt.rotation.z = tiltS.x
    if (mixer && dt > 0 && !reduceMotion) mixer.update(dt)
    if (screen) {
      screen.material.uniforms.uTime.value = now / 1000
      screen.material.uniforms.uTune.value = tune
    }

    frameCounter++
    // em movimento, renderiza todo frame (senão o giro engasga)
    if (isScrolling && !moving && frameCounter % 3 !== 0) return

    renderer.setRenderTarget(rt)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(postScene, postCam)
  })

  function setScrolling(scrolling) {
    isScrolling = Boolean(scrolling)
  }

  function dispose() {
    disposed = true
    renderer.setAnimationLoop(null)
    mixer?.stopAllAction()
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    screen?.dispose()
    scene.environment.dispose()
    pmrem.dispose()
    rt.dispose()
    post.dispose()
    postQuad.geometry.dispose()
    renderer.dispose()
  }

  const setTurn = (offset) => { turnTarget = offset }
  // A primeira leitura vira referência (não um salto a partir de 0).
  let hasShift = false
  let hasScroll = false
  const setShift = (px) => { shift = px; if (!hasShift) { lastShift = px; hasShift = true } }
  const setScroll = (px) => { scroll = px; if (!hasScroll) { lastScroll = px; hasScroll = true } }
  const setTune = (p) => { if (!reduceMotion) tune = Math.min(1, Math.max(0, p)) }
  const setScreenVisible = (v) => { screenVisible = v; if (screen) screen.visible = v }

  return { play, dispose, setScrolling, setTurn, setShift, setScroll, setTune, setScreenVisible, setScreenShape }
}
