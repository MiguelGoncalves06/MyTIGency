import { useEffect } from 'react'
import { createAsciiLogoScene } from '../utils/asciiLogo'

export function useAsciiLogo(ref, options) {
  useEffect(() => {
    const container = ref.current
    if (!container) return undefined

    const cleanup = createAsciiLogoScene(container, options)
    return cleanup ?? undefined
    // options is expected to be a stable module-level constant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}
