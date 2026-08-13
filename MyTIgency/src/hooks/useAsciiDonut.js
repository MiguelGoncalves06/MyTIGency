import { useEffect } from 'react'
import { renderAsciiDonut } from '../utils/asciiDonut'

export function useAsciiDonut(ref) {
  useEffect(() => {
    const pre = ref.current
    if (!pre) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const screenW = 72
    const screenH = 34
    let A = 1
    let B = 1
    let animationFrameId

    function renderDonut() {
      pre.textContent = renderAsciiDonut(screenW, screenH, A, B)
    }

    if (reduceMotion) {
      A = 0.6
      B = 0.9
      renderDonut()
    } else {
      function loop() {
        A += 0.045
        B += 0.02
        renderDonut()
        animationFrameId = requestAnimationFrame(loop)
      }
      loop()
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [ref])
}
