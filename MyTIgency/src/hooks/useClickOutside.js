import { useEffect } from 'react'

export function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined

    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handler(e)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ref, handler, enabled])
}
