import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { introPinDuration } from '../utils/manifestoScroll'

gsap.registerPlugin(ScrollTrigger)

// Motion do grupo da esquerda da seção 2 (ManifestoNos).
// Entrada, uma vez e no tempo, quando o grupo chega (mesmo gatilho do título
// em useManifestoS2Enter — os itens "Sem …" decodificam ITEMS_AT depois, de lá):
//   o NÓS cai com peso e carimba; o aro (com o brilho) é revelado à caneta e a estrela
//   vermelha acende no fim dele;
//   as linhas sobem na ordem de leitura e o sublinhado
//   risca o "tudo."; ▶▶▶ acende um a um (aponta para o pin lateral).
//   Em paralelo, a conversa: o cliente pede, a nossa resposta aparece
//   "digitando" e vira texto, e assim por diante, até o "visto".
// A seta acompanha o scroll (reversível), do grupo entrando até o pin lateral.
// Reduced motion: nada roda — o CSS já mostra o estado final.
const POP = { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' }
const TYPING = 1 // s de "digitando" antes de cada resposta nossa
// Ritmo: a entrada espera o grupo estar bem na tela (topo a ENTER_AT da
// altura) e roda mais devagar que o tempo nominal abaixo (TIME_SCALE), para
// dar tempo de ler cada gesto. useManifestoS2Enter usa o mesmo ENTER_AT.
export const ENTER_AT = 0.55
const TIME_SCALE = 0.6
// aro, sublinhado e seta são preenchimento (não stroke): revelados da
// esquerda para a direita, como a caneta passando
const WIPE_FROM = { clipPath: 'inset(-20% 100% -20% 0%)' }
const WIPE_TO = { clipPath: 'inset(-20% 0% -20% 0%)' }

export function useManifestoNos(ref) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const q = (s) => root.querySelector(s)
    const qa = (s) => root.querySelectorAll(s)
    const docTop = (el) => {
      let y = 0
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop
      return y
    }
    const D1 = () => introPinDuration() // o pin de entrada da seção 1 vem antes

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const big = q('.ls-big')
      const tl = gsap.timeline({ paused: true }).timeScale(TIME_SCALE)
      // cai com peso: acelera, achata no chão e volta com um quique curto
      tl.fromTo(big, { autoAlpha: 0, yPercent: -60, rotation: -6 },
        { autoAlpha: 1, yPercent: 0, rotation: 0, duration: 0.5, ease: 'power3.in' }, 0)
      tl.to(big, { scaleY: 0.86, scaleX: 1.06, duration: 0.08, ease: 'power1.out' })
      tl.to(big, { scaleY: 1, scaleX: 1, duration: 1, ease: 'elastic.out(1, 0.55)' })
      tl.fromTo(q('.ls-halo'), WIPE_FROM, { ...WIPE_TO, duration: 0.9, ease: 'sine.inOut' }, 0.5)
      tl.fromTo(q('.ls-spark'), { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.4)' }, 1.25)
      tl.fromTo(qa('.ls-cross'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.08 }, 0.6)
      tl.fromTo(qa('.ls-line > span'), { yPercent: 105 }, { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.2 }, 0.62)
      tl.fromTo(q('.ls-under'), WIPE_FROM, { ...WIPE_TO, duration: 0.5, ease: 'power2.inOut' }, 1.15)
      tl.fromTo(q('.ls-star'), { autoAlpha: 0, rotation: -60 }, { autoAlpha: 1, rotation: 0, duration: 0.5, ease: 'power2.out' }, 1.2)
      tl.fromTo(qa('.ls-play path'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: 0.16 }, 1.5)

      // conversa: cada balão do cliente entra; os nossos entram "digitando"
      let at = 0.3
      qa('.ls-msg').forEach((m) => {
        const ours = m.classList.contains('ls-msg--out')
        gsap.set(m, { autoAlpha: 0, y: 10, scale: 0.92, transformOrigin: ours ? '100% 100%' : '0% 100%' })
        tl.to(m, POP, at)
        if (ours) {
          const text = m.querySelector('.ls-msg-text')
          const dots = m.querySelector('.ls-dots')
          gsap.set(text, { display: 'none' })
          gsap.set(dots, { display: 'flex' })
          tl.set(dots, { display: 'none' }, at + TYPING)
          tl.set(text, { display: 'inline' }, at + TYPING)
          at += TYPING + 0.6
        } else at += 0.9
      })
      tl.fromTo(q('.ls-seen'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at - 0.3)

      const enter = ScrollTrigger.create({
        trigger: root,
        start: () => docTop(root) - window.innerHeight * ENTER_AT + D1(),
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => tl.play(),
      })

      const arrow = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: () => docTop(root) - window.innerHeight * (ENTER_AT + 0.05) + D1(),
          end: () => docTop(root) + root.offsetHeight / 2 - window.innerHeight * 0.56 + D1(),
          scrub: 2,
          invalidateOnRefresh: true,
        },
      })
      arrow.fromTo(q('.ls-arrow'), WIPE_FROM, { ...WIPE_TO, ease: 'sine.inOut' })

      return () => {
        enter.kill()
        arrow.scrollTrigger?.kill()
        arrow.kill()
        tl.kill()
      }
    })
    return () => mm.revert()
  }, [ref])
}
