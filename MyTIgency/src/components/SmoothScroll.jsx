import { ReactLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { usePageCovered } from '../utils/pageTransition'

// Scroll travado enquanto a cortina da transição entre páginas cobre a tela
function PageTransitionScrollLock() {
  useBodyScrollLock(usePageCovered())
  return null
}

const LENIS_OPTIONS = {
  autoRaf: true,
  autoToggle: true,
  anchors: true,
  lerp: 0.09,
  duration: 1.15,
  smoothWheel: true,
  // Touch também passa pelo Lenis (sem isso o mobile rola 100% nativo). Scroll
  // programático não recolhe a barra do navegador, então a viewport fica
  // estável durante a transição Hero→Marquee (a barra recolhendo mudava a
  // altura da tela no meio do scroll: ASCII redimensionava e a marquee pulava).
  syncTouch: true,
  touchMultiplier: 1.2,
  respectReducedMotion: true,
}

export function SmoothScroll({ children }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <PageTransitionScrollLock />
      {children}
    </ReactLenis>
  )
}
