import { useEffect } from 'react'

const GLITCH_CHARS = '.,-~:;=!*#$@'

function glitchChar(original, intensity) {
  if (original === ' ') return original
  if (Math.random() > intensity) return original
  if (Math.random() < 0.35) return original
  return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
}

export function useAsciiGlitch({ active, originalChars, cursorRef, onUpdate }) {
  useEffect(() => {
    if (!active) {
      onUpdate([...originalChars])
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let frameId
    let lastTick = 0

    function loop(now) {
      frameId = requestAnimationFrame(loop)
      if (now - lastTick < 180) return
      lastTick = now

      const { x } = cursorRef.current
      const len = originalChars.length

      const chars = originalChars.map((orig, i) => {
        const charPos = len > 1 ? i / (len - 1) : 0.5
        const dist = Math.abs(charPos - x)
        const intensity = Math.max(0.15, 1 - dist * 1.6) * 0.65
        return glitchChar(orig, intensity)
      })

      onUpdate(chars)
    }

    loop(0)

    return () => {
      cancelAnimationFrame(frameId)
      onUpdate([...originalChars])
    }
  }, [active, originalChars, cursorRef, onUpdate])
}
