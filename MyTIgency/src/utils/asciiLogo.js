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

    this.domElement = document.createElement('div')
    this.domElement.style.cursor = 'default'
    this.domElement.style.position = 'absolute'
    this.domElement.style.inset = '0'
    this.domElement.style.width = '100%'
    this.domElement.style.height = '100%'
    this.domElement.style.overflow = 'hidden'
    this.domElement.style.pointerEvents = 'none'
    this.domElement.style.backgroundColor = 'var(--landing-white, #fafafa)'

    // Canvas 2D de alta performance para desenhar o grid ASCII
    this.displayCanvas = document.createElement('canvas')
    this.displayCanvas.style.position = 'absolute'
    this.displayCanvas.style.inset = '0'
    this.displayCanvas.style.width = '100%'
    this.displayCanvas.style.height = '100%'
    this.displayCanvas.style.pointerEvents = 'none'
    this.displayCtx = this.displayCanvas.getContext('2d', { alpha: false })
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

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        this.updateCharMetrics()
      })
    }
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

    this.displayCanvas.width = Math.round(w * dpr)
    this.displayCanvas.height = Math.round(h * dpr)
    this.displayCanvas.style.width = `${w}px`
    this.displayCanvas.style.height = `${h}px`

    const iWidth = Math.floor(w * this.fResolution)
    const iHeight = Math.floor(h * this.fResolution)
    this.cols = iWidth
    this.rows = Math.floor(iHeight / 2)

    // O Three.js renderiza exatamente na resolução do grid ASCII
    this.renderer.setSize(this.cols, this.rows * 2)
    this.oCanvas.width = this.cols
    this.oCanvas.height = this.rows * 2

    this.decayBuffer = new Float32Array(this.cols * this.rows)
    this.lastMouseGrid = null
    this.rowChars = new Array(this.cols)

    this.updateCharMetrics()
  }

  screenToGrid(screenX, screenY) {
    const col = screenX / this.charWidth
    const row = screenY / this.charHeight
    return { col, row }
  }

  addPointerPoint(screenX, screenY, isContinuousAnchor = false) {
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
            const power = Math.pow(1 - d / brushRadius, 1.8)
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
            const power = Math.pow(1 - d / brushRadius, 2.0)
            const idx = y * this.cols + x
            this.decayBuffer[idx] = Math.min(1.0, Math.max(this.decayBuffer[idx], power))
          }
        }
      }
    }

    this.lastMouseGrid.x = targetX
    this.lastMouseGrid.y = targetY
  }

  render(scene, camera) {
    this.renderer.render(scene, camera)

    if (!this.oCtx || !this.decayBuffer || !this.displayCtx) return

    // 1. Lê a amostragem do 3D renderizado na resolução exata do grid
    this.oCtx.drawImage(this.renderer.domElement, 0, 0, this.cols, this.rows * 2)
    const imgData = this.oCtx.getImageData(0, 0, this.cols, this.rows * 2).data

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

    // Fundo limpo em #fafafa
    ctx.fillStyle = '#fafafa'
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

        const is3DLogo = a > 0 && (r > 10 || g > 10 || b > 10)
        const corruption = this.decayBuffer[rowOffset + col]

        if (is3DLogo) {
          const brightness = (0.3 * r + 0.59 * g + 0.11 * b) / 255
          let charIdx = Math.floor((1 - brightness) * (this.charSet.length - 1))
          if (this.bInvert) {
            charIdx = this.charSet.length - charIdx - 1
          }
          rowChars[col] = this.charSet[charIdx] || '.'
        } else if (corruption > 0.03) {
          const micro = getMicroGeom(row, col, corruption, timeTick)
          rowChars[col] = micro.char
          if (micro.isRed) {
            accents.push({ char: micro.char, col, row })
          }
        } else {
          rowChars[col] = '.'
        }
      }

      // Desenha a linha inteira de caracteres escuros em uma única chamada de GPU
      ctx.fillStyle = '#050505'
      ctx.fillText(rowChars.join(''), 0, row * this.charHeight)
    }

    // 4. Desenha os caracteres de destaque vermelho sobre as posições correspondentes
    if (accents.length > 0) {
      ctx.fillStyle = '#FF4438'
      for (let i = 0; i < accents.length; i++) {
        const acc = accents[i]
        ctx.fillText(acc.char, acc.col * this.charWidth, acc.row * this.charHeight)
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
    rotationStrength = 0.5,
    rotationSmoothing = 0.06,
    autoRotateSpeed = 0,
  } = options

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const initialSize = {
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

  const keyLight = new THREE.PointLight(0xffffff, 4, 0, 0)
  keyLight.position.set(2, 3, 5)
  scene.add(keyLight)

  // Three.js configurado para alta performance sem MSAA desnecessário
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(1)

  const effect = new AsciiLogoSceneEffect(renderer, CHAR_SET, {
    resolution: getAsciiResolution(),
    invert: true,
  })
  effect.setSize(initialSize.width, initialSize.height)
  container.appendChild(effect.domElement)

  const logoRig = new THREE.Group()
  scene.add(logoRig)

  const targetRotation = { x: MODEL_BASE_ROTATION.x, y: MODEL_BASE_ROTATION.y }
  let isVisible = true
  let frameId = 0

  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    isInside: false,
  }

  function onPointerMove(e) {
    mouse.x = e.clientX
    mouse.y = e.clientY
    mouse.isInside = true
    effect.addPointerPoint(e.clientX, e.clientY)
  }

  function onPointerLeave() {
    mouse.isInside = false
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('mouseleave', onPointerLeave)

  loadModel().then((gltf) => {
    const logoMesh = gltf.scene.clone(true)

    logoMesh.traverse((node) => {
      if (node.isMesh) {
        node.material = new THREE.MeshPhongMaterial({
          color: 0xd9d9d9,
          shininess: 60,
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
    logoRig.scale.setScalar(targetSize / largestDimension)

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

  function updateTargetRotation() {
    const vw = window.innerWidth
    const vh = window.innerHeight

    targetRotation.x =
      MODEL_BASE_ROTATION.x +
      (Math.PI * (mouse.y / vh) * 2 - Math.PI) * rotationStrength * 0.15

    targetRotation.y =
      MODEL_BASE_ROTATION.y +
      (Math.PI * (mouse.x / vw) * 2 - Math.PI) * rotationStrength * 0.15
  }

  const clock = new THREE.Clock()

  function animate() {
    frameId = requestAnimationFrame(animate)
    if (!isVisible) return

    const delta = clock.getDelta()

    if (autoRotateSpeed) {
      targetRotation.y += autoRotateSpeed * delta
    }

    updateTargetRotation()
    if (logoRig.children.length) {
      logoRig.rotation.x += (targetRotation.x - logoRig.rotation.x) * rotationSmoothing
      logoRig.rotation.y += (targetRotation.y - logoRig.rotation.y) * rotationSmoothing
    }

    // Mantém o ponto ativo onde o mouse estiver descansando
    if (mouse.isInside) {
      effect.addPointerPoint(mouse.x, mouse.y, true)
    }

    effect.render(scene, camera)
  }

  animate()

  function getContainerSize() {
    const rect = container.getBoundingClientRect()
    return {
      width: Math.max(Math.round(rect.width), window.innerWidth),
      height: Math.max(Math.round(rect.height), window.innerHeight),
    }
  }

  function applySize() {
    const { width: w, height: h } = getContainerSize()
    if (!w || !h) return

    camera.aspect = w / h
    camera.updateProjectionMatrix()

    effect.setSize(w, h)
  }

  applySize()

  const resizeObserver = new ResizeObserver(applySize)
  resizeObserver.observe(container)

  window.addEventListener('resize', applySize)

  return () => {
    cancelAnimationFrame(frameId)
    window.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('mouseleave', onPointerLeave)
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
}
