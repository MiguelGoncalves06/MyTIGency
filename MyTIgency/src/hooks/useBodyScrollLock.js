import { useEffect } from 'react'
import { useLenis } from 'lenis/react'

export function useBodyScrollLock(locked) {
  const lenis = useLenis()

  useEffect(() => {
    if (!locked) return undefined

    // Trava no <html>, não no <body>: overflow no root vale pra viewport, que
    // continua sendo o contêiner de rolagem. No <body> (somado ao clip que o
    // Lenis põe no <html>) o body virava um contêiner próprio e todo
    // position:sticky — a marquee ancorada no topo — pulava pra fora da tela.
    document.documentElement.style.overflow = 'hidden'
    lenis?.stop()

    return () => {
      lenis?.start()
      // Corrida do Lenis com autoToggle: stop() só põe overflow:clip inline no
      // <html> e marca isStopped no transitionend. Se o start() vem antes desse
      // evento, ele vê isStopped=false e retorna SEM tirar o clip — o evento
      // chega depois, o Lenis se dá por parado e a página trava sem rolar
      // (reproduzido no fim do LoadingScreen). Tirar o clip aqui faz o próprio
      // Lenis reler o overflow (liberado) e voltar, em qualquer ordem.
      document.documentElement.style.removeProperty('overflow')
      // Rede de segurança: o Lenis (autoToggle) só reavalia se está parado no
      // transitionend do overflow; se esse evento se perder (troca rápida,
      // aba em segundo plano), ele fica "parado" com a página liberada e
      // engole a roda do mouse — o scroll trava até recarregar. Reavalia no
      // frame seguinte, pelo overflow real.
      requestAnimationFrame(() => lenis?.checkOverflow?.())
    }
  }, [locked, lenis])
}
