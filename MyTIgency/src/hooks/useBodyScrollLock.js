import { useEffect } from 'react'
import { useLenis } from 'lenis/react'

export function useBodyScrollLock(locked) {
  const lenis = useLenis()

  useEffect(() => {
    if (!locked) return undefined

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    lenis?.stop()

    return () => {
      document.body.style.overflow = prevOverflow
      lenis?.start()
    }
  }, [locked, lenis])
}
