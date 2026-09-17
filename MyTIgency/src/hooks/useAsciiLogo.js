import { useEffect, useRef } from 'react'
import { createAsciiLogoScene } from '../utils/asciiLogo'

export function useAsciiLogo(ref, options) {
  const sceneRef = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return undefined

    const scene = createAsciiLogoScene(container, options)
    if (!scene) return undefined

    sceneRef.current = scene

    return () => {
      scene.destroy?.()
      sceneRef.current = null
    }
    // options is expected to be a stable module-level constant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  return sceneRef
}
