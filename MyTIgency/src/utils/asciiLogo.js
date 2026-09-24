import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const MODEL_URL = new URL('../models/myt.glb', import.meta.url).href
const CHAR_SET = '.:-+*=%@#&'
const MODEL_BASE_ROTATION = { x: 0, y: 0, z: 0 }

const CORE_CHARS = ['▪', '▫', '■', '□', '1', '0', '▪']
const MID_CHARS = ['+', '×', '÷', '▫', '1', '0', '°', '+']
const NOISE_CHARS = ['+', '×', '°', '^', ':', '·', '+']

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

function getMicroGeom(row, col, intensity, timeTick) {
  const hash = Math.sin(row * 17.13 + col * 37.91 + timeTick * 0.12) * 43758.5453
  const seed = Math.abs(hash - Math.floor(hash))

  if (intensity > 0.65) {
    const char = CORE_CHARS[Math.floor(seed * CORE_CHARS.length)]
    const isRed = seed > 0.35
    return { char, isRed }
  } else if (intensity > 0.28) {
    const char = MID_CHARS[Math.floor(seed * MID_CHARS.length)]
    const isRed = seed > 0.70
    return { char, isRed }
  } else {
    const char = NOISE_CHARS[Math.floor(seed * NOISE_CHARS.length)]
    const isRed = seed > 0.88
    return { char, isRed }
  }
}

class AsciiLogoSceneEffect {
  constructor(renderer, charSet = CHAR_SET, options = {}) {
    this.renderer = renderer
    this.charSet = charSet
    this.fResolution = options.resolution || 0.16
    this.iScale = options.scale || 1
    this.bInvert = options.invert !== undefined ? options.invert : true
    this.backgroundColor = options.backgroundColor || '#fafafa'
    this.foregroundColor = options.foregroundColor || '#050505'
    this.fillScene = options.fillScene !== undefined ? options.fillScene : true
    this.density = options.density !== undefined ? options.density : 1.0
    // Quanto o brilho de uma célula é reduzido conforme a face vira de lado
    // (normal.z baixo no passe de normais) — 0 desliga a modulação
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

    this.decayBuffer = null
    this.lastMouseGrid = null
    this.rowChars = null
    this.accents = []
    // Which cells are actually lit by the 3D glyph this frame — lets hover
    // logic (see isPointOnLogo) tell "on the MyT" apart from "empty corner
    // of the container", instead of reacting to the whole bounding box.
    this.logoMask = null

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

    this.decayBuffer = new Float32Array(this.cols * this.rows)
    this.lastMouseGrid = null
    this.rowChars = new Array(this.cols)
    this.logoMask = new Uint8Array(this.cols * this.rows)
  }

  screenToGrid(screenX, screenY) {
    const col = (screenX - this.offsetX) / this.charWidth
    const row = (screenY - this.offsetY) / this.charHeight
    return { col, row }
  }

  // Container-relative point → is this cell currently part of the rendered
  // glyph? Read-only lookup against last frame's mask, cheap enough to call
  // on every pointermove.
  isPointOnLogo(screenX, screenY) {
    if (!this.logoMask || !this.cols || !this.rows) return false
    const { col, row } = this.screenToGrid(screenX, screenY)
    const c = Math.floor(col)
    const r = Math.floor(row)
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false
    return this.logoMask[r * this.cols + c] === 1
  }

  // intensityScale lets callers dial the same brush down for a faint trail
  // vs a full-strength pulse, without duplicating the falloff math.
  addPointerPoint(screenX, screenY, isContinuousAnchor = false, intensityScale = 1) {
    if (!this.cols || !this.rows || !this.decayBuffer) return

    const { col: targetX, row: targetY } = this.screenToGrid(screenX, screenY)

    if (isContinuousAnchor) {
      const brushRadius = 3.6
      const minX = Math.max(0, Math.floor(targetX - brushRadius))
      const maxX = Math.min(this.cols - 1, Math.ceil(targetX + brushRadius))
      const minY = Math.max(0, Math.floor(targetY - brushRadius))
      const maxY = Math.min(this.rows - 1, Math.ceil(targetY + brushRadius))

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const d = Math.hypot(x - targetX, (y - targetY) * 1.6)
          if (d < brushRadius) {
            const power = Math.pow(1 - d / brushRadius, 1.8) * intensityScale
            const idx = y * this.cols + x
            this.decayBuffer[idx] = Math.min(1.0, Math.max(this.decayBuffer[idx], power))
          }
        }
      }
      return
    }

    if (!this.lastMouseGrid) {
      this.lastMouseGrid = { x: targetX, y: targetY }
    }

    const dx = targetX - this.lastMouseGrid.x
    const dy = targetY - this.lastMouseGrid.y
    const distance = Math.hypot(dx, dy)
    const steps = Math.max(1, Math.ceil(distance / 0.8))

    const brushRadius = 3.8

    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const cx = this.lastMouseGrid.x + dx * t
      const cy = this.lastMouseGrid.y + dy * t

      const minX = Math.max(0, Math.floor(cx - brushRadius))
      const maxX = Math.min(this.cols - 1, Math.ceil(cx + brushRadius))
      const minY = Math.max(0, Math.floor(cy - brushRadius))
      const maxY = Math.min(this.rows - 1, Math.ceil(cy + brushRadius))

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const d = Math.hypot(x - cx, (y - cy) * 1.6)
          if (d < brushRadius) {
            const power = Math.pow(1 - d / brushRadius, 2.0) * intensityScale
            const idx = y * this.cols + x
            this.decayBuffer[idx] = Math.min(1.0, Math.max(this.decayBuffer[idx], power))
          }
        }
      }
    }

    this.lastMouseGrid.x = targetX
    this.lastMouseGrid.y = targetY
  }

  // Called when a fresh hover starts so the trail doesn't draw one long
  // streak connecting wherever the cursor last was to the new entry point.
  resetTrail() {
    this.lastMouseGrid = null
  }

  render(scene, camera, normalMaterial) {
    this.renderer.render(scene, camera)

    if (!this.oCtx || !this.decayBuffer || !this.displayCtx) return

    // 1. Lê a amostragem do 3D renderizado na resolução exata do grid
    this.oCtx.drawImage(this.renderer.domElement, 0, 0, this.cols, this.rows * 2)
    const imgData = this.oCtx.getImageData(0, 0, this.cols, this.rows * 2).data

    // 1b. Passe extra com as normais da cena (mesma resolução minúscula, barato)
    // para saber a orientação de cada célula e diferenciar frente vs lateral
    let normalData = null
    if (normalMaterial) {
      const prevOverride = scene.overrideMaterial
      scene.overrideMaterial = normalMaterial
      this.renderer.render(scene, camera)
      scene.overrideMaterial = prevOverride
      this.oCtx.drawImage(this.renderer.domElement, 0, 0, this.cols, this.rows * 2)
      normalData = this.oCtx.getImageData(0, 0, this.cols, this.rows * 2).data
    }

    // 2. Decaimento do rastro do mouse
    const total = this.cols * this.rows
    for (let i = 0; i < total; i++) {
      if (this.decayBuffer[i] > 0.005) {
        this.decayBuffer[i] *= 0.978
      } else {
        this.decayBuffer[i] = 0
      }
    }

    const timeTick = Math.floor(performance.now() / 140)
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

    const accents = this.accents
    accents.length = 0
    const rowChars = this.rowChars

    // 3. Monta e desenha cada linha no canvas com aceleração direta por hardware
    for (let row = 0; row < this.rows; row++) {
      const y3D = row * 2
      const rowOffset = row * this.cols
      const imgOffsetBase = y3D * this.cols * 4

      for (let col = 0; col < this.cols; col++) {
        const offset = imgOffsetBase + col * 4

        const r = imgData[offset]
        const g = imgData[offset + 1]
        const b = imgData[offset + 2]
        const a = imgData[offset + 3]

        const cellIdx = rowOffset + col
        const is3DLogo = a > 0 && (r > 10 || g > 10 || b > 10)
        const corruption = this.decayBuffer[cellIdx]
        this.logoMask[cellIdx] = is3DLogo ? 1 : 0

        if (is3DLogo && corruption > 0.4) {
          // Hover-glitch "BUG": strong local corruption overrides the normal
          // shading right on the letters themselves, not just the backdrop.
          const micro = getMicroGeom(row, col, 0.9, timeTick)
          rowChars[col] = micro.char
          if (micro.isRed) {
            accents.push({ char: micro.char, col, row })
          }
        } else if (is3DLogo) {
          let brightness = (0.3 * r + 0.59 * g + 0.11 * b) / 255

          // A normal modula o próprio brilho (não troca de família de caractere):
          // face virada de lado escurece um pouco e cai pra um char mais leve na
          // mesma rampa, como um fresnel simples — leitura de volume contínua
          if (normalData) {
            const facing = normalData[offset + 2] / 255
            brightness *= 1 - this.normalContrast * (1 - facing)
          }

          let charIdx = Math.floor((1 - brightness) * (this.charSet.length - 1))
          if (this.bInvert) {
            charIdx = this.charSet.length - charIdx - 1
          }
          rowChars[col] = this.charSet[charIdx] || '.'
        } else if (this.fillScene && corruption > 0.03) {
          const micro = getMicroGeom(row, col, corruption, timeTick)
          rowChars[col] = micro.char
          if (micro.isRed) {
            accents.push({ char: micro.char, col, row })
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

      // Desenha a linha inteira de caracteres perfeitamente centralizada
      ctx.fillStyle = this.foregroundColor
      ctx.fillText(
        rowChars.join(''),
        this.offsetX,
        this.offsetY + row * this.charHeight
      )
    }

    // 4. Desenha os caracteres de destaque vermelho sobre as posições correspondentes
    if (accents.length > 0) {
      ctx.fillStyle = '#FF4438'
      for (let i = 0; i < accents.length; i++) {
        const acc = accents[i]
        ctx.fillText(
          acc.char,
          this.offsetX + acc.col * this.charWidth,
          this.offsetY + acc.row * this.charHeight
        )
      }
    }

    ctx.restore()
  }

  dispose() {
    this.decayBuffer = null
    this.rowChars = null
    this.accents = null
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

  // Sem deslocamento em X: o objeto gira continuamente, então qualquer viés
  // lateral na luz faria alguns lados da rotação parecerem mais iluminados
  // que outros. Centralizada, a luz lê como "de frente" o tempo todo.
  const keyLight = new THREE.PointLight(0xffffff, 4, 0, 0)
  keyLight.position.set(0, 3, 5)
  scene.add(keyLight)

  // Luz de preenchimento fraca: sem ela, faces que não encaram a keyLight caem a
  // preto e somem da máscara de brilho do ASCII (is3DLogo exige r/g/b > 10)
  const fillLight = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.18)
  scene.add(fillLight)

  // Luz de rim vindo de trás, também centralizada em X pelo mesmo motivo: acende
  // as bordas do extrude simetricamente, não só quando o giro favorece um lado
  const rimLight = new THREE.PointLight(0xffffff, 2.4, 0, 0)
  rimLight.position.set(0, 1.5, -4)
  scene.add(rimLight)

  // Material usado só no passe extra de normais (scene.overrideMaterial) para
  // detectar orientação de superfície por célula, sem afetar o material visível
  const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })

  // Three.js configurado para alta performance sem MSAA desnecessário
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(1)

  const effect = new AsciiLogoSceneEffect(renderer, CHAR_SET, {
    resolution: resolution ?? getAsciiResolution(),
    invert: true,
    backgroundColor,
    foregroundColor,
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

  // Hover glitch: a "BUG" pulse local to wherever the cursor is over the
  // piece — a few corrupted/red-accented characters (reusing the existing
  // decay-buffer system below, just no longer fed by a continuous trail)
  // plus a brief freeze + jitter, repeating irregularly while hovered.
  let isHovering = false
  let hoverX = 0
  let hoverY = 0
  let jitterIntensity = 0
  let glitchTimeoutId = null
  let unfreezeTimeoutId = null

  loadModel().then((gltf) => {
    const logoMesh = gltf.scene.clone(true)

    // O GLB tem 2 camadas por letra: malha externa maior ("Texto"/"Texto.002")
    // e uma malha interna menor deslocada ("Texto.001"/"Texto.003") — o próprio
    // modelo já foi desenhado com essa dualidade, mas o material único apagava.
    logoMesh.traverse((node) => {
      if (node.isMesh) {
        const isInnerLayer = node.name.endsWith('.001') || node.name.endsWith('.003')
        node.material = new THREE.MeshPhongMaterial({
          color: isInnerLayer ? 0xf3f2ec : 0xbababa,
          shininess: isInnerLayer ? 85 : 40,
          specular: 0x222222,
          side: THREE.DoubleSide,
        })
      }
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

  function fireGlitchPulse() {
    const bursts = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < bursts; i++) {
      const jx = hoverX + (Math.random() - 0.5) * 44
      const jy = hoverY + (Math.random() - 0.5) * 44
      effect.addPointerPoint(jx, jy, true)
    }

    jitterIntensity = 0.14
    isFrozen = true
    clearTimeout(unfreezeTimeoutId)
    unfreezeTimeoutId = setTimeout(() => {
      isFrozen = false
    }, 220)
  }

  function scheduleNextGlitch() {
    clearTimeout(glitchTimeoutId)
    glitchTimeoutId = setTimeout(() => {
      if (!isHovering) return
      fireGlitchPulse()
      scheduleNextGlitch()
    }, 1600 + Math.random() * 1400)
  }

  function stopHovering() {
    isHovering = false
    clearTimeout(glitchTimeoutId)
    clearTimeout(unfreezeTimeoutId)
    isFrozen = false
    jitterIntensity = 0
  }

  // Faint, continuous trail — much weaker than a glitch pulse (see
  // TRAIL_INTENSITY) so it reads as a subtle wake behind the cursor rather
  // than competing with the periodic bursts.
  const TRAIL_INTENSITY = 0.3

  // Tracks pointer position continuously (cheap: grid math + a mask lookup,
  // no repaint), but only "enters"/"leaves" the hover state when the cursor
  // crosses onto/off of a cell the glyph itself lights up — an empty corner
  // of the container never triggers it.
  function onHoverMove(e) {
    const rect = container.getBoundingClientRect()
    hoverX = e.clientX - rect.left
    hoverY = e.clientY - rect.top

    const onLogo = effect.isPointOnLogo(hoverX, hoverY)
    if (onLogo && !isHovering) {
      isHovering = true
      effect.resetTrail()
      fireGlitchPulse()
      scheduleNextGlitch()
    } else if (!onLogo && isHovering) {
      stopHovering()
    }

    if (isHovering) {
      effect.addPointerPoint(hoverX, hoverY, false, TRAIL_INTENSITY)
    }
  }

  // The hover glitch (pulse + trail + tremor) is new pointer-driven motion,
  // so — unlike the rest of this file today — it checks reduced-motion from
  // the start: reduced-motion users just get the plain, non-reactive glyph.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!prefersReducedMotion) {
    container.addEventListener('pointermove', onHoverMove, { passive: true })
    container.addEventListener('pointerleave', stopHovering)
  }

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

      // Hover-glitch tremor: a decaying random shake, back to dead still
      // once it's spent rather than lingering as a tiny perpetual wobble.
      if (jitterIntensity > 0.0008) {
        logoRig.position.x = (Math.random() - 0.5) * jitterIntensity
        logoRig.position.y = (Math.random() - 0.5) * jitterIntensity
        jitterIntensity *= 0.82
      } else if (logoRig.position.x || logoRig.position.y) {
        jitterIntensity = 0
        logoRig.position.set(0, 0, 0)
      }
    }

    // The sample-and-draw pass below forces a GPU readback (getImageData)
    // every frame, which stalls the pipeline — cheap enough at rest, but it
    // competes with the main thread for the scroll-driven reveal transition.
    // Rather than fully pausing it (which froze the rotation on screen and
    // could leave the canvas mid-resize/blank), render less often instead —
    // and while scrolling, also skip the extra normals pass (only used for
    // the fresnel-ish shading) to roughly halve the cost of the frames that
    // do render, so the spin stays visibly smooth without a bigger stutter.
    frameCounter++
    const everyNth = isScrolling ? 4 : 2
    if (frameCounter % everyNth !== 0) return

    effect.render(scene, camera, isScrolling ? null : normalMaterial)
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
    container.removeEventListener('pointermove', onHoverMove)
    container.removeEventListener('pointerleave', stopHovering)
    clearTimeout(glitchTimeoutId)
    clearTimeout(unfreezeTimeoutId)

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
