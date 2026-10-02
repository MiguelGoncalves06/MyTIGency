import { useEffect, useState } from 'react'
import { getHeroModelReady } from '../utils/1asciiLogo'

// Teto: nunca deixa o usuário preso atrás do loading screen por causa de
// rede ruim ou um asset que falhou — libera de qualquer jeito.
const MAX_WAIT_MS = 7000
// Mesmo carregando tudo instantaneamente, uma exibição mínima evita um
// "pisca" da tela de loading — e cobre o raro caso de tudo resolver rápido
// o bastante pra coincidir com o próprio burst de montagem síncrona.
const MIN_DISPLAY_MS = 350

// O que precisa estar pronto antes de liberar a primeira interação — ver
// myt-motion → Loading Gate pra critério de quando adicionar algo aqui.
function dependencies() {
  return Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    getHeroModelReady().catch(() => {}),
  ])
}

export function useAppReady() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS))
    const minDisplay = new Promise((resolve) => setTimeout(resolve, MIN_DISPLAY_MS))

    Promise.race([dependencies(), timeout])
      .then(() => minDisplay)
      .then(() => { if (!cancelled) setIsReady(true) })

    return () => { cancelled = true }
  }, [])

  return isReady
}
