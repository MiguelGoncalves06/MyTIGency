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
//   Em paralelo, a conversa no celular (timeline própria, no tempo real):
//   o cliente manda na hora; lemos, digitamos no campo e enviamos; ele demora
//   um pouco e responde; digitamos de novo… até o "visto". Cada item novo
//   empurra a conversa para cima, por baixo do topo de vidro.
// A seta acompanha o scroll (reversível), do grupo entrando até o pin lateral.
// Reduced motion: nada roda — o CSS já mostra o estado final.
const CHAT_AT = 0.5 // s até a 1ª mensagem do cliente
const READ = 0.8 // s lendo antes de começar a digitar
const CHAR = 0.065 // s por letra no campo (devagar o bastante para acompanhar)
const CHAR_PAUSE = 0.2 // respiro a mais depois de , . ! ?
const CLIENT_WAIT = 1.8 // s que o cliente leva para responder
// O cartão da conversa se move só por variáveis (--ls-x/-y em px, --ls-r em
// graus → `translate`/`rotate` no CSS), nunca pelo transform do GSAP: ao
// tocar no transform o GSAP zera `rotate`/`scale` do elemento, e o cartão
// usa os dois (inclinação; escala no mobile).
// vibração ao receber: tremida lateral com um giro mínimo
const BUZZ = {
  keyframes: [[-3, -0.8], [3, 0.8], [-2.5, -0.6], [2, 0.4], [-1, -0.2], [0, 0]]
    .map(([x, r]) => ({ '--ls-x': x, '--ls-r': r, duration: 0.4 / 6, ease: 'none' })),
}
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
    mm.add('(prefers-reduced-motion: no-preference)', (ctx) => {
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

      // conversa (timeline própria, sem o TIME_SCALE: ritmo validado no LAB).
      // Chegou mensagem → o aparelho vibra (o cartão treme, a bolinha "online"
      // acende) e o balão salta da esquerda. Nossa vez → o texto é digitado
      // no campo; ao enviar, o botão pulsa, o balão sobe do campo e o cartão
      // dá um tranco para cima, saindo da sombra.
      const chat = q('.ls-chat')
      const live = q('.ls-chat-head i')
      const scroller = q('.ls-chat-scroll')
      const field = q('.ls-input')
      const input = q('.ls-input-text')
      const send = q('.ls-send')
      const seen = q('.ls-seen')
      const msgs = [...qa('.ls-msg')]
      gsap.set([...msgs, seen], { display: 'none' })
      // item entra no fluxo; a conversa (ancorada embaixo) sobe o tanto que ele
      // ocupa, suave (FLIP). Registrado no contexto para o revert limpar.
      ctx.add('reveal', (el, from) => {
        const h0 = scroller.offsetHeight
        gsap.set(el, { display: '' })
        gsap.fromTo(scroller, { y: scroller.offsetHeight - h0 }, { y: 0, duration: 0.45, ease: 'power3.out' })
        if (from) gsap.fromTo(el, from, { x: 0, scale: 1, duration: 0.5, ease: 'back.out(2)' })
      })
      const ct = gsap.timeline({ paused: true })
      let t = CHAT_AT
      msgs.forEach((m, k) => {
        if (!m.classList.contains('ls-msg--out')) {
          if (k > 0) t += CLIENT_WAIT
          ct.call(() => ctx.reveal(m, { x: -14, scale: 0.92, transformOrigin: '0% 100%' }), null, t)
          ct.to(chat, BUZZ, t)
          ct.fromTo(live, { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'power2.out', immediateRender: false }, t)
          t += READ
          return
        }
        const s = m.textContent
        ct.call(() => field.classList.add('is-typing'), null, t)
        for (let i = 1; i <= s.length; i++) {
          t += CHAR + (/[,.!?]/.test(s[i - 2]) ? CHAR_PAUSE : 0)
          ct.call(() => { input.textContent = s.slice(0, i) }, null, t)
        }
        t += 0.35
        ct.call(() => {
          input.textContent = ''
          field.classList.remove('is-typing')
          ctx.reveal(m, { scale: 0.8, transformOrigin: '100% 100%' })
        }, null, t)
        ct.fromTo(send, { scale: 0.7 }, { scale: 1, duration: 0.4, ease: 'back.out(3)', immediateRender: false }, t)
        ct.to(chat, { '--ls-y': -4, '--ls-lift': 3, duration: 0.1, ease: 'power2.out' }, t)
        ct.to(chat, { '--ls-y': 0, '--ls-lift': 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, t + 0.1)
        t += 0.6
      })
      ct.call(() => ctx.reveal(seen), null, t)

      const enter = ScrollTrigger.create({
        trigger: root,
        start: () => docTop(root) - window.innerHeight * ENTER_AT + D1(),
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => { tl.play(); ct.play() },
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
        ct.kill()
      }
    })
    return () => mm.revert()
  }, [ref])
}
