import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Desktop/tablet only — o mobile da seção 2 é outro layout (a definir).
const DESKTOP_QUERY = '(min-width: 701px)'
// Onde o fim do traço A (rumo ao "quem") para ao terminar o scroll lateral,
// como fração da largura da tela. Placeholder até a seção 3 existir: ela vai
// definir o percurso real.
const TAIL_STOP = 0.85
// Começa um pouco antes do centro exato: quando o centro do conteúdo ainda
// está esta fração da altura da tela abaixo do meio.
const START_EARLY = 0.06

// Scroll lateral da seção 2: quando o conteúdo dela chega ao centro da tela,
// o bloco inteiro do Manifesto fixa (pin) e o scroll vertical passa a mover a
// trilha para a esquerda, 1px de scroll = 1px de deslocamento. Fixa o bloco
// todo (não só a seção 2) porque o traço A emenda as duas seções: o trecho da
// seção 1 que ainda aparece no topo da tela precisa andar junto.
export function useManifestoHorizontal(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const track = root.querySelector('.ms-track')
    const ms2 = root.querySelector('.ms2')
    const groups = root.querySelectorAll('.s2-group')
    const tail = root.querySelector('.s2-line-a-tail')
    if (!track || !ms2 || !groups.length || !tail) return undefined

    // Posição no documento pela cadeia de offsetTop: é layout puro, imune ao
    // transform da transição Hero→Marquee (.reveal-panel), que no topo da
    // página desloca tudo e faria getBoundingClientRect errar o início.
    const docTop = (el) => {
      let y = 0
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop
      return y
    }
    // Centro vertical do conteúdo da seção 2 (os dois grupos, sem os traços).
    const contentCenter = () => {
      let top = Infinity
      let bottom = -Infinity
      groups.forEach((g) => {
        top = Math.min(top, g.offsetTop)
        bottom = Math.max(bottom, g.offsetTop + g.offsetHeight)
      })
      return docTop(ms2) + (top + bottom) / 2
    }

    // Medido sem o deslocamento atual da trilha (o refresh pode rodar no meio do percurso).
    const travel = () => Math.max(0,
      tail.getBoundingClientRect().right - gsap.getProperty(track, 'x') - window.innerWidth * TAIL_STOP)

    const mm = gsap.matchMedia()
    mm.add(DESKTOP_QUERY, () => {
      gsap.to(track, {
        x: () => -travel(),
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          // Começa quando o conteúdo da seção 2 chega (quase) ao centro da tela.
          start: () => contentCenter() - window.innerHeight * (0.5 + START_EARLY),
          end: () => `+=${travel()}`,
          pin: true,
          // Fixa por transform, não por position:fixed. O .reveal-panel (pai)
          // pode estar com transform/will-change da transição Hero→Marquee, e
          // aí um fixed se posiciona relativo a ele e o bloco some da tela.
          pinType: 'transform',
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: -1, // mede depois do gatilho da Hero→Marquee
          onRefresh: () => root.style.setProperty('--ms-travel', `${travel()}px`),
        },
      })
    })

    // Alturas da seção dependem de fontes web; remede quando carregarem.
    document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => mm.revert()
  }, [rootRef])
}
