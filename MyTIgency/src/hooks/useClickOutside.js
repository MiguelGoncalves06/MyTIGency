import { useEffect } from 'react'

export function useClickOutside(ref, handler, enabled = true, excludeRef = null) {
  useEffect(() => {
    if (!enabled) return undefined

    function onPointerDown(e) {
      if (!ref.current || ref.current.contains(e.target)) return
      if (excludeRef?.current && excludeRef.current.contains(e.target)) return
      handler(e)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ref, handler, enabled, excludeRef])
}
