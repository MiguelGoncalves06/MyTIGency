// TV GLB com dither (port de TVdither/tv3d.js). Mesmo visual e mesma intro
// (pontos aparecendo + giro de entrada, a cada vez que entra na tela).
// Diferenças do original: sem OrbitControls (não arrasta — o giro virá do
// scroll lateral), reduced-motion entrega direto o estado final e há
// dispose() para o React desmontar sem vazar contexto WebGL.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const gltfs = {}
const load = (url) => (gltfs[url] ||= new GLTFLoader().loadAsync(url))

export function mountDitherTV(canvas, {
  url,
  palette, // 4 cores, escuro → claro
  pixel = 2, // tamanho do ponto em px CSS
  gap = 0.3, // grade de 1px entre os pontos (0 = sem grade)
  contrast = 1.35,
  bright = 0.02,
  restAngle = 0.6, // rad, vista 3/4
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

  const pivot = new THREE.Group()
  scene.add(pivot)
  let disposed = false
  load(url).then(({ scene: src }) => {
    if (disposed) return
    const model = src.clone(true)
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    model.position.sub(box.getCenter(new THREE.Vector3()))
    // Plástico preto metálico vira mancha no dither; fosco e mais claro deixa o volume aparecer.
    model.traverse((o) => {
      if (!o.material) return
      Object.assign(o.material, { metalness: 0, metalnessMap: null })
      o.material.color.setScalar(2.5)
    })
    const holder = new THREE.Group()
    holder.add(model)
    holder.rotation.y = -Math.PI / 2 // a frente deste GLB aponta para +X
    pivot.add(holder)
    pivot.scale.setScalar(1.7 / Math.max(size.x, size.y, size.z))
  })

  // Cena → render target → dither ordenado (Bayer 8×8) em paleta de 4 cores.
  const rt = new THREE.WebGLRenderTarget(1, 1)
  const post = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      tMap: { value: rt.texture }, uRes: { value: new THREE.Vector2() },
      uPx: { value: 1 }, uReveal: { value: 0 }, uGap: { value: gap },
      uContrast: { value: contrast }, uBright: { value: bright },
      uPal: { value: palette.map((c) => new THREE.Color(c)) },
    },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform sampler2D tMap; uniform vec2 uRes; uniform vec3 uPal[4];
      uniform float uPx, uReveal, uGap, uContrast, uBright;
      float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
      float b4(vec2 a){ return b2(.5 * a) * .25 + b2(a); }
      float b8(vec2 a){ return b4(.5 * a) * .25 + b2(a); }
      void main(){
        vec2 cell = floor(gl_FragCoord.xy / uPx);
        vec4 c = texture2D(tMap, (cell + .5) * uPx / uRes);
        float l = pow(dot(c.rgb, vec3(.299, .587, .114)), 1. / 2.2);
        l = clamp((l - .5) * uContrast + .5 + uBright, 0., 1.);
        float t = b8(cell);
        float i = clamp(floor(l * 3. + t), 0., 3.);
        vec3 col = i < .5 ? uPal[0] : i < 1.5 ? uPal[1] : i < 2.5 ? uPal[2] : uPal[3];
        vec2 f = mod(gl_FragCoord.xy, uPx);
        if (uPx > 2. && (f.x < 1. || f.y < 1.)) col = mix(col, uPal[3], uGap);
        float a = step(.5, c.a) * step(t, uReveal * 1.001);
        gl_FragColor = vec4(col, a);
      }`,
  })
  const postScene = new THREE.Scene()
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post)
  postScene.add(postQuad)
  const postCam = new THREE.Camera()

  const resizeObserver = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = canvas
    if (!w || !h) return
    renderer.setSize(w, h, false)
    const dpr = renderer.getPixelRatio()
    rt.setSize(w * dpr, h * dpr)
    post.uniforms.uRes.value.set(w * dpr, h * dpr)
    post.uniforms.uPx.value = Math.max(1, Math.round(pixel * dpr))
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(canvas)

  // Intro: pontos dissolvem + giro até o repouso. Repete a cada entrada; render pausa fora da tela.
  let introStart = -Infinity
  let visible = false
  const play = () => { introStart = reduceMotion ? -Infinity : performance.now() }
  const intersectionObserver = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) play()
  }, { threshold: 0.4 })
  intersectionObserver.observe(canvas)
  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3)

  renderer.setAnimationLoop((now) => {
    if (!visible) return
    const t = (now - introStart) / 1000
    post.uniforms.uReveal.value = ease((t - 0.1) / 1.2)
    const sway = reduceMotion ? 0 : Math.sin(now / 1400) * 0.06
    pivot.rotation.y = restAngle - 2 * (1 - ease(t / 1.8)) + sway
    renderer.setRenderTarget(rt)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(postScene, postCam)
  })

  function dispose() {
    disposed = true
    renderer.setAnimationLoop(null)
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    scene.environment.dispose()
    pmrem.dispose()
    rt.dispose()
    post.dispose()
    postQuad.geometry.dispose()
    renderer.dispose()
  }

  return { play, dispose }
}
