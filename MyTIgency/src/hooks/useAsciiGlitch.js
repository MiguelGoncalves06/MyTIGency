import { useEffect } from 'react'

// Matches the reference decode effect: one flat symbol set, no weighting by position.
const GLYPHS = '-=+*/\\<>▓_█▒░'
const START_DELAY_MS = 460 // brief full-scramble "wind up" before the reveal starts
const MS_PER_CHAR = 101 // constant linear reveal speed
const TICK_MS = 86 // calm, steady refresh — faster reads as jittery

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
}

export function useAsciiGlitch({ active, originalChars, onUpdate }) {
  useEffect(() => {
    if (!active) {
      onUpdate([...originalChars])
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const len = originalChars.length
    const totalDuration = START_DELAY_MS + len * MS_PER_CHAR

    let frameId
    let lastTick = 0
    const startTime = performance.now()

    function loop(now) {
      const elapsed = now - startTime

      if (elapsed >= totalDuration) {
        onUpdate([...originalChars])
        return
      }

      frameId = requestAnimationFrame(loop)
      if (now - lastTick < TICK_MS) return
      lastTick = now

      const revealCount = Math.max(0, Math.floor((elapsed - START_DELAY_MS) / MS_PER_CHAR))

      const chars = originalChars.map((orig, i) => {
        if (orig === ' ') return orig
        return i < revealCount ? orig : randomGlyph()
      })

      onUpdate(chars)
    }

    loop(startTime)

    return () => {
      cancelAnimationFrame(frameId)
      onUpdate([...originalChars])
    }
  }, [active, originalChars, onUpdate])
}
