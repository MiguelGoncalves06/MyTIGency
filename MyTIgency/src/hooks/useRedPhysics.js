import { useEffect } from 'react'

const GRAVITY = 0.4
const CURSOR_PULL = 0.18
const MAX_OFFSET = 14

export function useRedPhysics() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    function handleMove(e) {
      document.querySelectorAll('.red-text:not(.red-text--hovering)').forEach((el) => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = e.clientX - cx
        const dy = e.clientY - cy
        const dist = Math.hypot(dx, dy) || 1

        const pull = Math.min(MAX_OFFSET, 120 / (dist * 0.04 + 1))
        const tx = (dx / dist) * pull * CURSOR_PULL
        const ty = (dy / dist) * pull * CURSOR_PULL + GRAVITY

        el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`
      })
    }

    function handleLeave() {
      document.querySelectorAll('.red-text:not(.red-text--hovering)').forEach((el) => {
        el.style.transform = `translate(0px, ${GRAVITY}px)`
      })
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseleave', handleLeave)

    document.querySelectorAll('.red-text').forEach((el) => {
      el.style.transform = `translate(0px, ${GRAVITY}px)`
    })

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseleave', handleLeave)
      document.querySelectorAll('.red-text').forEach((el) => {
        el.style.transform = ''
      })
    }
  }, [])
}
