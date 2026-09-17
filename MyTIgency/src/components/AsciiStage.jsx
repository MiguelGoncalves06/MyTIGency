import { useEffect, useRef } from 'react'
import { useLenis } from 'lenis/react'
import { useAsciiLogo } from '../hooks/useAsciiLogo'
import { useScene } from '../context/SceneContext'
import { getIntroScrollDistance, SHARED_ASCII_OPTIONS } from '../scene/constants'

// Curva suave cúbica in-out para sensação física de desaceleração e chegada
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function AsciiStage() {
  const stageRef = useRef(null)
  const { slotRef } = useScene()
  const sceneRef = useAsciiLogo(stageRef, SHARED_ASCII_OPTIONS)

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.style.transform = 'translate3d(0px, 0px, 0) scale(1, 1)'
      stageRef.current.style.visibility = 'visible'
    }
    sceneRef.current?.setProgress(0)
  }, [sceneRef])

  useLenis((lenis) => {
    const stage = stageRef.current
    const slot = slotRef.current
    if (!stage || !slot) return

    const distance = getIntroScrollDistance()
    const scroll = lenis.scroll
    const progress = Math.min(1, Math.max(0, scroll / distance))

    // Atualiza controles dinâmicos de densidade, freeze e física do cursor
    sceneRef.current?.setProgress(progress)

    const vw = Math.max(window.innerWidth, 1)
    const vh = Math.max(window.innerHeight, 1)
    const slotRect = slot.getBoundingClientRect()

    // Otimização: esconde fora da tela quando o usuário rolar muito além da hero
    // (só se aplica após a transição intro->hero; antes disso o slot ainda
    // está fora da tela por estar mais abaixo no fluxo do documento)
    if (scroll >= distance && (slotRect.bottom < -120 || slotRect.top > vh + 120)) {
      if (stage.style.visibility !== 'hidden') {
        stage.style.visibility = 'hidden'
      }
      return
    }
    if (stage.style.visibility === 'hidden') {
      stage.style.visibility = 'visible'
    }

    let currentX = 0
    let currentY = 0
    let scaleX = 1
    let scaleY = 1

    if (scroll < distance) {
      // Fase de Transição (Intro -> Hero)
      // Calcula o topo final fixo invariante do slot na viewport
      const remainingScroll = distance - scroll
      const finalTop = slotRect.top - remainingScroll
      const finalLeft = slotRect.left
      const finalWidth = slotRect.width
      const finalHeight = slotRect.height

      const ep = easeInOutCubic(progress)

      // Nuance de peso físico no meio do trajeto (leve contração de ~4% e retorno)
      const scaleDip = 1 - Math.sin(progress * Math.PI) * 0.045

      currentX = finalLeft * ep
      currentY = finalTop * ep

      const targetScaleX = (finalWidth / vw) * scaleDip
      const targetScaleY = (finalHeight / vh) * scaleDip

      scaleX = 1 + (targetScaleX - 1) * ep
      scaleY = 1 + (targetScaleY - 1) * ep
    } else {
      // Hero estabelecida ou rolagem subsequente: fica travado 1:1 ao container
      currentX = slotRect.left
      currentY = slotRect.top
      scaleX = slotRect.width / vw
      scaleY = slotRect.height / vh
    }

    stage.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) scale(${scaleX.toFixed(5)}, ${scaleY.toFixed(5)})`
  })

  return <div id="ascii-stage" ref={stageRef} aria-hidden="true" />
}

