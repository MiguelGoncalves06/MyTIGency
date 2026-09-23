import { useEffect } from 'react'

export function useEscapeKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined

    function onKeyDown(e) {
      if (e.key === 'Escape') handler(e)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handler, enabled])
}
