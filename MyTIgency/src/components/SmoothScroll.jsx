import { useEffect } from 'react'
import { ReactLenis, useLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { setPageLenis, usePageCovered } from '../utils/pageTransition'

// Transição entre páginas: scroll travado enquanto a cortina cobre a tela, e
// o Lenis registrado para a troca de rota rolar pro topo/âncora por baixo dela
function PageTransitionScroll() {
  const lenis = useLenis()
  useEffect(() => setPageLenis(lenis), [lenis])
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
      <PageTransitionScroll />
      {children}
    </ReactLenis>
  )
}
