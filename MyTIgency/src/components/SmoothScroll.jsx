import { ReactLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'

const LENIS_OPTIONS = {
  autoRaf: true,
  autoToggle: true,
  anchors: true,
  lerp: 0.09,
  duration: 1.15,
  smoothWheel: true,
  touchMultiplier: 1.2,
  respectReducedMotion: true,
}

export function SmoothScroll({ children }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  )
}
