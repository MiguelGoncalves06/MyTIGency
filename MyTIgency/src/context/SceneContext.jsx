import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import {
  SCENE_PHASE,
  getIntroScrollDistance,
  progressToPhase,
} from '../scene/constants'

const SceneContext = createContext(null)

function syncSceneDocument(progress, phase) {
  const root = document.documentElement
  root.dataset.scene = phase
  root.style.setProperty('--scene-progress', progress.toFixed(4))
}

export function SceneProvider({ children }) {
  const [phase, setPhase] = useState(SCENE_PHASE.INTRO)
  const phaseRef = useRef(phase)
  const progressRef = useRef(0)
  const slotRef = useRef(null)
  const lenis = useLenis()

  useLenis((instance) => {
    const distance = getIntroScrollDistance()
    const progress = Math.min(1, Math.max(0, instance.scroll / distance))
    progressRef.current = progress

    const nextPhase = progressToPhase(progress)
    syncSceneDocument(progress, nextPhase)

    if (nextPhase !== phaseRef.current) {
      phaseRef.current = nextPhase
      setPhase(nextPhase)
    }
  })

  useEffect(() => {
    syncSceneDocument(0, SCENE_PHASE.INTRO)
  }, [])

  const value = useMemo(
    () => ({
      phase,
      progressRef,
      slotRef,
      lenis,
      scrollToHero() {
        lenis?.scrollTo(getIntroScrollDistance(), { duration: 1.15 })
      },
    }),
    [phase, lenis],
  )

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
}

export function useScene() {
  const context = useContext(SceneContext)
  if (!context) {
    throw new Error('useScene precisa estar dentro de SceneProvider')
  }
  return context
}
