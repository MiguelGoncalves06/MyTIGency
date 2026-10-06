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
      // Corrida do Lenis com autoToggle: stop() só põe overflow:clip inline no
      // <html> e marca isStopped no transitionend. Se o start() vem antes desse
      // evento, ele vê isStopped=false e retorna SEM tirar o clip — o evento
      // chega depois, o Lenis se dá por parado e a página trava sem rolar
      // (reproduzido no fim do LoadingScreen). Tirar o clip aqui faz o próprio
      // Lenis reler o overflow (liberado) e voltar, em qualquer ordem.
      document.documentElement.style.removeProperty('overflow')
    }
  }, [locked, lenis])
}
