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
    this.domElement.style.color = 'var(--landing-black, #050505)'

    this.oAscii = document.createElement('table')
    this.domElement.appendChild(this.oAscii)

    this.oCanvas = document.createElement('canvas')
    this.oCtx = this.oCanvas.getContext('2d', { willReadFrequently: true })

    this.width = 0
    this.height = 0
    this.iWidth = 0
    this.iHeight = 0
    this.cols = 0
    this.rows = 0

    this.charWidth = 7.5
    this.charHeight = 12.5

    this.decayBuffer = null
    this.lastMouseGrid = null

    this.probe = document.createElement('span')
    this.probe.style.fontFamily = 'var(--font-mono, "Source Code Pro", "Courier New", monospace)'
    this.probe.style.letterSpacing = '-0.6px'
    this.probe.style.whiteSpace = 'pre'
    this.probe.style.position = 'absolute'
    this.probe.style.visibility = 'hidden'
    this.probe.style.pointerEvents = 'none'
    this.probe.textContent = '01234567890123456789012345678901234567890123456789'
    this.domElement.appendChild(this.probe)

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        this.updateCharMetrics()
      })
    }
  }

  updateCharMetrics() {
    const fFontSize = (2 / this.fResolution) * this.iScale
    const fLineHeight = (2 / this.fResolution) * this.iScale

    this.probe.style.fontSize = `${fFontSize}px`
    this.probe.style.lineHeight = `${fLineHeight}px`

    const rect = this.probe.getBoundingClientRect()
    if (rect.width > 0) {
      this.charWidth = rect.width / 50
    } else {
      this.charWidth = fFontSize * 0.6 - 0.6
    }
    this.charHeight = fLineHeight
  }

  setSize(w, h) {
    this.width = w
    this.height = h
    this.renderer.setSize(w, h)

    this.iWidth = Math.floor(w * this.fResolution)
    this.iHeight = Math.floor(h * this.fResolution)
    this.cols = this.iWidth
    this.rows = Math.floor(this.iHeight / 2)

    this.oCanvas.width = this.iWidth
    this.oCanvas.height = this.iHeight

    this.decayBuffer = new Float32Array(this.cols * this.rows)
    this.lastMouseGrid = null

    this.oAscii.cellSpacing = '0'
    this.oAscii.cellPadding = '0'

    const fFontSize = (2 / this.fResolution) * this.iScale
    const fLineHeight = (2 / this.fResolution) * this.iScale

    const oStyle = this.oAscii.style
    oStyle.whiteSpace = 'pre'
    oStyle.margin = '0px'
    oStyle.padding = '0px'
    oStyle.letterSpacing = '-0.6px'
    oStyle.fontFamily = 'var(--font-mono, "Source Code Pro", monospace)'
    oStyle.fontSize = `${fFontSize}px`
    oStyle.lineHeight = `${fLineHeight}px`
    oStyle.textAlign = 'left'

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

    if (!this.oCtx || !this.decayBuffer) return

    this.oCtx.clearRect(0, 0, this.iWidth, this.iHeight)
    this.oCtx.drawImage(this.renderer.domElement, 0, 0, this.iWidth, this.iHeight)
    const imgData = this.oCtx.getImageData(0, 0, this.iWidth, this.iHeight).data

    // Decaimento suave do rastro (~2.5 a 3.5 segundos)
    const total = this.cols * this.rows
    for (let i = 0; i < total; i++) {
      if (this.decayBuffer[i] > 0.005) {
        this.decayBuffer[i] *= 0.978
      } else {
        this.decayBuffer[i] = 0
      }
    }

    const timeTick = Math.floor(performance.now() / 140)
    let strChars = ''
    let inAccentSpan = false

    for (let row = 0; row < this.rows; row++) {
      const y = row * 2
      for (let col = 0; col < this.cols; col++) {
        const x = col
        const offset = (y * this.iWidth + x) * 4

        const r = imgData[offset]
        const g = imgData[offset + 1]
        const b = imgData[offset + 2]
        const a = imgData[offset + 3]

        // Identifica com precisão se o pixel pertence à malha 3D
        const is3DLogo = a > 0 && (r > 10 || g > 10 || b > 10)

        const corruption = this.decayBuffer[row * this.cols + col]
        let char = '.'
        let isAccent = false

        if (is3DLogo) {
          // A LOGO 3D MANTÉM SUA RENDERIZAÇÃO E SOMBREAMENTO ORIGINAL INTOCADA
          const brightness = (0.3 * r + 0.59 * g + 0.11 * b) / 255
          let charIdx = Math.floor((1 - brightness) * (this.charSet.length - 1))
          if (this.bInvert) {
            charIdx = this.charSet.length - charIdx - 1
          }
          char = this.charSet[charIdx] || '.'
          isAccent = false
        } else {
          // FUNDO: MICRO-GEOMETRIA SOB O MOUSE
          if (corruption > 0.03) {
            const micro = getMicroGeom(row, col, corruption, timeTick)
            char = micro.char
            isAccent = micro.isRed
          } else {
            char = '.'
            isAccent = false
          }
        }

        if (char === ' ') char = '&nbsp;'

        if (isAccent && !inAccentSpan) {
          strChars += '<span style="color:var(--accent,#FF4438);font-weight:600">'
          inAccentSpan = true
        } else if (!isAccent && inAccentSpan) {
          strChars += '</span>'
          inAccentSpan = false
        }

        strChars += char
      }

      if (inAccentSpan) {
        strChars += '</span>'
        inAccentSpan = false
      }

      strChars += '<br/>'
    }

    this.oAscii.innerHTML = `<tr><td style="display:block;width:${this.width}px;height:${this.height}px;overflow:hidden">${strChars}</td></tr>`
  }

  dispose() {
    this.decayBuffer = null
    this.oCtx = null
    this.oCanvas = null
    if (this.probe?.parentNode) {
      this.probe.parentNode.removeChild(this.probe)
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

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(initialSize.width, initialSize.height)

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

    renderer.setSize(w, h)
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
