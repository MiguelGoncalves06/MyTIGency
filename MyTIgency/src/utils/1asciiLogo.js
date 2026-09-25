import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const MODEL_URL = new URL('../models/myt.glb', import.meta.url).href
// Rampa monotônica (menos tinta → mais tinta) para as faces.
// Sem '-', '|', '/', '\' de propósito: traços ficam reservados à hachura
const CHAR_SET = '.,:;+*#%@'
// Hachura das laterais pela normal (eixo y da view para cima)
const HATCH_CHARS = ['|', '\\', '-', '/']
// Laterais encarando a câmera: textura esparsa, lê como "escuro"
const SIDE_FILL = '.:'
const MODEL_BASE_ROTATION = { x: 0, y: 0, z: 0 }

// Limiares de dithering ordenado (Bayer 4×4). Cada célula tem um limiar fixo,
// então quando o brilho de uma face muda as células trocam de caractere aos
// poucos, num padrão estável — sem a face inteira "popar" junto. Comprimido
// em torno de 0.5 (DITHER_SPREAD): a mistura só acontece perto de cada corte
// da rampa, e o miolo de uma faixa fica limpo em vez de virar xadrez
const DITHER_SPREAD = 0.5
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  .map((v) => 0.5 + ((v + 0.5) / 16 - 0.5) * DITHER_SPREAD)

// Todo modelo é renderizado com este shader, que não desenha cor e sim dados
// por pixel lidos de volta no passo ASCII (renderer sem antialias, então os
// valores chegam intactos):
//   R = iluminação (luz pontual + especular)
//   G = face branca? (>= FACE_FLAG) + o quanto a superfície está de perfil
//   B = máscara (>0) + ângulo da normal no plano da tela
// Assim a convenção do Blender (Base Color branco na frente/verso, preto nas
// laterais) é o único contrato — nomes de malha e número de objetos não importam.
const FACE_FLAG = 136
const EDGE_RANGE = 112
const GLYPH_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPos = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`
const GLYPH_FRAGMENT = /* glsl */ `
  uniform float uFace;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    // Normais invertidas no Blender ou verso visto por dentro: vira pra câmera
    vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 v = normalize(-vViewPos);
    // Luz pontual presa à câmera, perto do objeto: o brilho varia AO LONGO de
    // uma face plana (não só com a normal), então a transição entre chars
    // varre a face enquanto ela gira. Centralizada em X: o objeto gira, e
    // qualquer viés lateral faria um lado da rotação parecer mais iluminado
    vec3 l = normalize(vec3(0.0, 2.5, -5.0) - vViewPos);
    float diffuse = max(dot(n, l), 0.0);
    float specular = pow(max(dot(n, normalize(l + v)), 0.0), 24.0);
    float shade = clamp(0.3 + 0.7 * diffuse + 0.35 * specular, 0.0, 1.0);
    // Perfil real em relação ao olho (varia com a perspectiva, ao contrário
    // da normal pura de uma face plana)
    float edge = 1.0 - clamp(dot(n, v), 0.0, 1.0);
    float angle = atan(n.y, n.x) / 6.2831853 + 0.5;
    gl_FragColor = vec4(
      shade,
      (uFace * ${FACE_FLAG}.0 + edge * ${EDGE_RANGE}.0) / 255.0,
      (1.0 + angle * 254.0) / 255.0,
      1.0
    );
  }
`

// Luminância do Base Color que veio do GLB (sem material = branco, padrão glTF)
function createGlyphMaterial(source) {
  const c = source?.color
  const luminance = c ? 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b : 1
  return new THREE.ShaderMaterial({
    uniforms: { uFace: { value: luminance > 0.35 ? 1 : 0 } },
    vertexShader: GLYPH_VERTEX,
    fragmentShader: GLYPH_FRAGMENT,
    side: THREE.DoubleSide,
  })
}

let modelLoadPromise = null

function loadModel() {
  if (!modelLoadPromise) {
    modelLoadPromise = new GLTFLoader().loadAsync(MODEL_URL)
  }
  return modelLoadPromise
}

function getAsciiResolution() {
  const area = window.innerWidth * window.innerHeight
  const resolution = 0.2 - 0.00000006 * Math.max(area - 1200000, 0)
  return Math.max(0.12, Math.min(0.22, resolution))
}

class AsciiLogoSceneEffect {
  constructor(renderer, charSet = CHAR_SET, options = {}) {
    this.renderer = renderer
    this.charSet = charSet
    this.fResolution = options.resolution || 0.16
    this.iScale = options.scale || 1
    this.backgroundColor = options.backgroundColor || '#fafafa'
    this.foregroundColor = options.foregroundColor || '#050505'
    this.edgeColor = options.edgeColor || '#6B6B64'
    this.fillScene = options.fillScene !== undefined ? options.fillScene : true
    this.density = options.density !== undefined ? options.density : 1.0
    // Quanto o brilho de uma face é reduzido conforme ela vira de perfil
    // (fresnel simples) — 0 desliga a modulação
    this.normalContrast = options.normalContrast !== undefined ? options.normalContrast : 0.45

    this.domElement = document.createElement('div')
    this.domElement.style.cursor = 'default'
    this.domElement.style.position = 'absolute'
    this.domElement.style.inset = '0'
    this.domElement.style.width = '100%'
    this.domElement.style.height = '100%'
    this.domElement.style.overflow = 'hidden'
    this.domElement.style.pointerEvents = 'none'
    this.domElement.style.backgroundColor = this.backgroundColor

    // Canvas 2D de alta performance para desenhar o grid ASCII.
    // alpha:true é proposital (não é o mais barato) — resize() limpa o canvas
    // pra transparente, então até o próximo render ele deixa o backgroundColor
    // do domElement (abaixo) aparecer em vez de pintar um retângulo preto.
    this.displayCanvas = document.createElement('canvas')
    this.displayCanvas.style.position = 'absolute'
    this.displayCanvas.style.inset = '0'
    this.displayCanvas.style.width = '100%'
    this.displayCanvas.style.height = '100%'
    this.displayCanvas.style.pointerEvents = 'none'
    this.displayCtx = this.displayCanvas.getContext('2d', { alpha: true })
    this.domElement.appendChild(this.displayCanvas)

    // Canvas offscreen pequeno para amostragem do 3D
    this.oCanvas = document.createElement('canvas')
    this.oCtx = this.oCanvas.getContext('2d', { willReadFrequently: true })

    this.width = 0
    this.height = 0
    this.dpr = 1
    this.cols = 0
    this.rows = 0

    this.charWidth = 7.5
    this.charHeight = 12.5

    this.rowChars = null
    this.edgeChars = null

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        this.updateCharMetrics()
      })
    }
  }

  setDensity(val) {
    this.density = Math.max(0, Math.min(1, val))
  }

  updateCharMetrics() {
    const fFontSize = (2 / this.fResolution) * this.iScale
    const fLineHeight = (2 / this.fResolution) * this.iScale
    this.charHeight = fLineHeight

    if (this.displayCtx) {
      this.displayCtx.font = `600 ${fFontSize}px "Source Code Pro", "Courier New", monospace`
      if ('letterSpacing' in this.displayCtx) {
        this.displayCtx.letterSpacing = '-0.6px'
      }
      const metrics = this.displayCtx.measureText('M')
      this.charWidth = metrics.width || (fFontSize * 0.6 - 0.6)
    } else {
      this.charWidth = fFontSize * 0.6 - 0.6
    }
  }

  setSize(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.dpr = dpr
    this.width = w
    this.height = h

    this.updateCharMetrics()

    this.displayCanvas.width = Math.round(w * dpr)
    this.displayCanvas.height = Math.round(h * dpr)
    this.displayCanvas.style.width = `${w}px`
    this.displayCanvas.style.height = `${h}px`

    // Grid dimension calculations based on actual charWidth & charHeight
    this.cols = Math.ceil(w / this.charWidth) + 1
    this.rows = Math.ceil(h / this.charHeight) + 1

    this.offsetX = (w - this.cols * this.charWidth) / 2
    this.offsetY = (h - this.rows * this.charHeight) / 2

    // O Three.js renderiza exatamente na resolução do grid ASCII
    this.renderer.setSize(this.cols, this.rows * 2)
    this.oCanvas.width = this.cols
    this.oCanvas.height = this.rows * 2

    this.rowChars = new Array(this.cols)
    this.edgeChars = new Array(this.cols)
  }

  render(scene, camera) {
    this.renderer.render(scene, camera)

    if (!this.oCtx || !this.rowChars || !this.displayCtx) return

    // 1. Lê de volta os dados do shader (ver GLYPH_FRAGMENT) na resolução do grid
    this.oCtx.drawImage(this.renderer.domElement, 0, 0, this.cols, this.rows * 2)
    const imgData = this.oCtx.getImageData(0, 0, this.cols, this.rows * 2).data

    const ctx = this.displayCtx
    const dpr = this.dpr
    const fFontSize = (2 / this.fResolution) * this.iScale

    ctx.save()
    ctx.scale(dpr, dpr)

    ctx.fillStyle = this.backgroundColor
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.font = `600 ${fFontSize}px "Source Code Pro", "Courier New", monospace`
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = '-0.6px'
    }
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    const rowChars = this.rowChars
    const edgeChars = this.edgeChars
    const lastRampIdx = this.charSet.length - 1

    // 3. Monta e desenha cada linha no canvas com aceleração direta por hardware
    for (let row = 0; row < this.rows; row++) {
      const imgOffsetBase = row * 2 * this.cols * 4

      for (let col = 0; col < this.cols; col++) {
        const offset = imgOffsetBase + col * 4

        const r = imgData[offset]
        const g = imgData[offset + 1]
        const b = imgData[offset + 2]
        edgeChars[col] = ' '

        if (b > 0) {
          const isFace = g >= FACE_FLAG - 12
          const dither = BAYER4[((row & 3) << 2) | (col & 3)]

          let char
          if (isFace) {
            // Face: rampa pela luz com fresnel suave, arredondada
            // pelo limiar Bayer da célula em vez de um corte único
            const edge = Math.min(1, Math.max(0, g - FACE_FLAG) / EDGE_RANGE)
            const brightness = (r / 255) * (1 - this.normalContrast * edge * edge)
            char = this.charSet[Math.min(lastRampIdx, Math.floor(brightness * lastRampIdx + dither))]
          } else {
            // Lateral: de perfil vira hachura na direção da parede
            // (perpendicular à normal); de frente, textura esparsa. Os dois
            // cortes são ditherizados pra transicionar aos poucos
            const edge = Math.min(1, g / EDGE_RANGE)
            if (edge > 0.35 + dither * 0.3) {
              const normalAngle = ((b - 1) / 254) * Math.PI * 2
              const bucket = Math.floor((normalAngle % Math.PI) / (Math.PI / 4) + dither) % 4
              char = HATCH_CHARS[bucket]
            } else {
              char = SIDE_FILL[r / 255 + (dither - 0.5) * 0.4 > 0.55 ? 1 : 0]
            }
          }

          // Face em tinta; lateral no tom secundário
          if (isFace) {
            rowChars[col] = char
          } else {
            rowChars[col] = ' '
            edgeChars[col] = char
          }
        } else {
          if (this.fillScene && this.density > 0.01) {
            if (this.density >= 0.99) {
              rowChars[col] = '.'
            } else {
              // Dissolução orgânica determinística por célula
              const cellHash = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453
              const seed = Math.abs(cellHash - Math.floor(cellHash))
              rowChars[col] = seed < this.density ? '.' : ' '
            }
          } else {
            rowChars[col] = ' '
          }
        }
      }

      // Desenha a linha inteira de caracteres perfeitamente centralizada;
      // as laterais saem numa segunda camada, no tom secundário
      const y = this.offsetY + row * this.charHeight
      ctx.fillStyle = this.foregroundColor
      ctx.fillText(rowChars.join(''), this.offsetX, y)
      ctx.fillStyle = this.edgeColor
      ctx.fillText(edgeChars.join(''), this.offsetX, y)
    }

    ctx.restore()
  }

  dispose() {
    this.rowChars = null
    this.edgeChars = null
    this.oCtx = null
    this.oCanvas = null
    this.displayCtx = null
    if (this.displayCanvas?.parentNode) {
      this.displayCanvas.parentNode.removeChild(this.displayCanvas)
    }
  }
}

export function createAsciiLogoScene(container, options = {}) {
  if (!container) return null

  const {
    targetSize = 8.5,
    cameraZ = 10,
    autoRotateSpeed = 0,
    fitToContainer = false,
    fillScene = true,
    resolution,
    normalContrast,
    backgroundColor,
    foregroundColor,
    edgeColor,
  } = options

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const initialSize = fitToContainer
    ? {
        width: Math.max(container.clientWidth, 1),
        height: Math.max(container.clientHeight, 1),
      }
    : {
        width: Math.max(container.clientWidth, window.innerWidth),
        height: Math.max(container.clientHeight, window.innerHeight),
      }

  const camera = new THREE.PerspectiveCamera(
    70,
    initialSize.width / initialSize.height,
    1,
    1000,
  )
  camera.position.set(0, 0, cameraZ)

  // Sem luzes na cena: a iluminação é calculada no GLYPH_FRAGMENT

  // Three.js configurado para alta performance sem MSAA desnecessário
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(1)

  const effect = new AsciiLogoSceneEffect(renderer, CHAR_SET, {
    resolution: resolution ?? getAsciiResolution(),
    backgroundColor,
    foregroundColor,
    edgeColor,
    fillScene,
    normalContrast,
  })
  effect.setSize(initialSize.width, initialSize.height)
  container.appendChild(effect.domElement)

  const logoRig = new THREE.Group()
  scene.add(logoRig)

  // Rotation is a simple constant spin (see animate()) — no cursor tracking
  // drives it anymore, so there's no target/current split to lerp between.
  let rotationY = MODEL_BASE_ROTATION.y
  let isVisible = true
  let isScrolling = false
  let frameId = 0
  let isFrozen = false
  let sceneProgress = 0
  let loadedMeshLargestDimension = 0

  loadModel().then((gltf) => {
    const logoMesh = gltf.scene.clone(true)

    // Contrato com o Blender: Base Color branco = frente/verso, preto = laterais.
    // Um shader por material de origem (primitivas que o compartilham reusam)
    const glyphMaterials = new Map()
    logoMesh.traverse((node) => {
      if (!node.isMesh) return
      const source = node.material
      if (!glyphMaterials.has(source)) glyphMaterials.set(source, createGlyphMaterial(source))
      node.material = glyphMaterials.get(source)
    })

    const box = new THREE.Box3().setFromObject(logoMesh)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    logoMesh.position.sub(center)

    const largestDimension = Math.max(size.x, size.y, size.z)
    loadedMeshLargestDimension = largestDimension
    const currentScaleBoost = 1 + sceneProgress * 0.35
    logoRig.scale.setScalar((targetSize / largestDimension) * currentScaleBoost)

    logoRig.rotation.set(
      MODEL_BASE_ROTATION.x,
      MODEL_BASE_ROTATION.y,
      MODEL_BASE_ROTATION.z,
    )

    logoRig.add(logoMesh)
  })

  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting
    },
    { threshold: 0.05 },
  )
  observer.observe(container)

  const clock = new THREE.Clock()
  let frameCounter = 0

  function animate() {
    frameId = requestAnimationFrame(animate)
    if (!isVisible) return

    const delta = clock.getDelta()

    // Trophy-style idle spin: a plain constant rotation, no cursor input.
    // This keeps advancing even while scroll-throttled below, so the piece
    // never visibly stalls during the hero reveal transition.
    if (autoRotateSpeed && !isFrozen) {
      rotationY += autoRotateSpeed * delta
    }
    if (logoRig.children.length) {
      logoRig.rotation.x = MODEL_BASE_ROTATION.x
      logoRig.rotation.y = rotationY
    }

    // The sample-and-draw pass below forces a GPU readback (getImageData)
    // every frame, which stalls the pipeline — cheap enough at rest, but it
    // competes with the main thread for the scroll-driven reveal transition.
    // Rather than fully pausing it (which froze the rotation on screen and
    // could leave the canvas mid-resize/blank), render less often instead,
    // so the spin stays visibly smooth without a bigger stutter.
    frameCounter++
    const everyNth = isScrolling ? 4 : 2
    if (frameCounter % everyNth !== 0) return

    effect.render(scene, camera)
  }

  animate()

  function getContainerSize() {
    const rect = container.getBoundingClientRect()
    if (fitToContainer) {
      return {
        width: Math.max(Math.round(rect.width), 1),
        height: Math.max(Math.round(rect.height), 1),
      }
    }

    return {
      width: Math.max(Math.round(rect.width), window.innerWidth),
      height: Math.max(Math.round(rect.height), window.innerHeight),
    }
  }

  function applySize() {
    const { width: w, height: h } = getContainerSize()
    // A hidden ancestor (Hero gets display:none once docked — see
    // useHeroMarqueeReveal) collapses this container to ~0, which the
    // ResizeObserver still reports. Shrinking the renderer down to that and
    // back once Hero reappears was corrupting the WebGL readback into visible
    // noise, so degenerate sizes are ignored — the renderer just keeps its
    // last real dimensions while hidden, and resumes cleanly when shown again.
    if (w < 10 || h < 10) return

    effect.setSize(w, h)

    camera.aspect = (effect.cols * effect.charWidth) / (effect.rows * effect.charHeight)
    camera.updateProjectionMatrix()
  }

  applySize()

  const resizeObserver = new ResizeObserver(applySize)
  resizeObserver.observe(container)

  window.addEventListener('resize', applySize)

  function setProgress(progress) {
    const p = Math.max(0, Math.min(1, progress))
    sceneProgress = p

    // Curva de perda de densidade: 0.15 -> 0.70 desmancha os pontos de fundo
    const density = 1 - Math.min(1, Math.max(0, (p - 0.15) / 0.55))
    effect.setDensity(density)

    // Ajuste dinâmico calibrado de escala 3D
    if (loadedMeshLargestDimension && logoRig.children.length) {
      const scaleBoost = 1 + p * 0.35
      logoRig.scale.setScalar((targetSize / loadedMeshLargestDimension) * scaleBoost)
    }
  }

  function setFreeze(frozen) {
    isFrozen = Boolean(frozen)
  }

  function setScrolling(scrolling) {
    isScrolling = Boolean(scrolling)
  }

  function setDensity(density) {
    effect.setDensity(density)
  }

  function destroy() {
    cancelAnimationFrame(frameId)
    window.removeEventListener('resize', applySize)
    resizeObserver.disconnect()
    observer.disconnect()

    if (effect.domElement.parentNode === container) {
      container.removeChild(effect.domElement)
    }

    effect.dispose()
    renderer.dispose()
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose()
        obj.material?.dispose()
      }
    })
  }

  return {
    destroy,
    setProgress,
    setFreeze,
    setDensity,
    setScrolling,
  }
}
