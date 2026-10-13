import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { introPinDuration } from '../utils/manifestoScroll'

gsap.registerPlugin(ScrollTrigger)

// Entrada em combo do grupo da direita da seção 2 do Manifesto:
//   sticker smiley, busca (caixa + texto + cursor) e TV vêm de fora da tela,
//   pela direita, conforme o scroll — mas SÓ PRA FRENTE: guarda o maior
//   progresso já alcançado, então subir não desfaz (nada volta pra fora).
//   Uma inércia curta (gsap.to no progresso) faz o combo deslizar até lá.
// Depois, uma vez só e em tempo real (não por scroll): a TV se forma pixel a
//   pixel (evento 's2:tv-play' → DitherTV), o texto da busca é digitado e o
//   cursor dá um clique. Depois fica "vivo": a barra | continua piscando, de
//   tempos em tempos apaga 1–2 letras e redigita, e o cursor clica sozinho
//   (ciclos independentes, pausados com a busca fora da tela). Ambiente (só com mouse): o sticker acompanha o
//   cursor por poucos px, como a mão da seção 1.
// Grupo da esquerda (ManifestoNos; o resto da entrada dele é do
//   useManifestoNos): uma vez, em tempo real, os itens "Sem gerente de conta /
//   terceirizar / intermediários" entram decodificando (decoder da Header,
//   evento 's2:decode' → DecodeItem); com o scroll (reversível), o contorno do
//   botão continue rolando se desenha e ele enche de água (--fill + onda em CSS).
// Reduced motion: nada disso roda — CSS já mostra tudo no lugar e a TV nasce
// pronta (tv3d.js).
const TV_PLAY_AT = 0.3 // fração da entrada em que a TV começa a se formar
const TYPE_SPEED = 0.075 // s por caractere
const EDIT_EVERY = [2.5, 5.5] // s entre uma "correção" (apaga e redigita) e outra
const CLICK_EVERY = [3.5, 7] // s entre um clique e outro do cursor
const DECODE_STAGGER = 0.22 // s entre um item e outro decodificando
// s depois da chegada do grupo em que os itens começam a decodificar (o NÓS já
// carimbou — useManifestoNos)
const ITEMS_AT = 1.2
const STICKER_TURN = 240 // graus que a estrela de fora do sticker gira no trecho todo

export function useManifestoS2Enter(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const q = (sel) => root.querySelector(sel)
    const group = q('.s2-group--tv')
    const smiley = q('.s2-smiley')
    const search = q('.s2-search')
    const text = q('.s2-search-text')
    const cursor = q('.s2-search-cursor')
    const tv = q('.s2-tv')
    if (!group || !smiley || !search || !text || !cursor || !tv) return undefined

    const docTop = (el) => {
      let y = 0
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop
      return y
    }
    const fullText = text.dataset.text || text.textContent

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const off = () => window.innerWidth * 1.1 // fora da tela, à direita

      /* ---------- entrada (dirigida pelo scroll, só pra frente) ---------- */
      const enter = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 1 } })
      enter.fromTo(smiley, { x: off, rotation: 38 }, { x: 0, rotation: 0 }, 0)
      enter.fromTo(tv, { x: off }, { x: 0, duration: 1.1 }, 0.08)
      enter.fromTo(search, { x: off }, { x: 0 }, 0.16)

      /* ---------- depois da entrada: digitação + clique (tempo real) ---------- */
      const counter = { n: 0 }
      const type = gsap.timeline({ paused: true })
      type.set(text, { textContent: '' })
      type.call(() => text.classList.add('is-typing'))
      type.to(counter, {
        n: fullText.length,
        duration: fullText.length * TYPE_SPEED,
        ease: 'none',
        onUpdate: () => { text.textContent = fullText.slice(0, Math.round(counter.n)) },
      }, '+=0.25')
      const click = (tl, at) => tl
        .to(cursor, { scale: 0.84, duration: 0.12, ease: 'power2.in' }, at)
        .to(cursor, { scale: 1, duration: 0.45, ease: 'back.out(3)' })
      click(type, '+=0.35')
      type.call(() => startAlive(), null, '+=0.4')

      /* ---------- depois: vivo (apaga/redigita + cliques), em tempo real ---------- */
      // Só age com a busca na tela; fora dela os ciclos seguem agendados mas
      // não mexem em nada (custo: dois delayedCall).
      let onScreen = true
      const io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting
        search.classList.toggle('is-onscreen', onScreen) // onda de cor (CSS)
      })
      io.observe(search)
      const alive = []
      const rand = ([a, b]) => gsap.utils.random(a, b)
      function scheduleEdit() { alive.push(gsap.delayedCall(rand(EDIT_EVERY), edit)) }
      function edit() {
        if (!onScreen) { scheduleEdit(); return }
        const n = Math.random() < 0.6 ? 1 : 2
        const len = fullText.length
        // barra fixa (sem piscar) enquanto "edita", como num editor de verdade
        const tl = gsap.timeline({ onComplete: () => { text.classList.remove('is-editing'); scheduleEdit() } })
        tl.call(() => text.classList.add('is-editing'))
        for (let i = 1; i <= n; i++) tl.call(() => { text.textContent = fullText.slice(0, len - i) }, null, `+=${rand([0.12, 0.2])}`)
        for (let i = n - 1; i >= 0; i--) tl.call(() => { text.textContent = fullText.slice(0, len - i) }, null, `+=${i === n - 1 ? rand([0.45, 0.9]) : rand([0.09, 0.16])}`)
        tl.to({}, { duration: 0.5 }) // volta a piscar meio segundo depois
        alive.push(tl)
      }
      function scheduleClick() {
        alive.push(gsap.delayedCall(rand(CLICK_EVERY), () => {
          if (onScreen) alive.push(click(gsap.timeline(), 0))
          scheduleClick()
        }))
      }
      function startAlive() { scheduleEdit(); scheduleClick() }
      // começa vazio (sem o caret) até a entrada terminar
      text.textContent = ''

      let maxP = 0
      let tvPlayed = false
      let typed = false
      const advance = (p, instant) => {
        if (p <= maxP) return
        maxP = p
        if (instant) enter.progress(maxP)
        else gsap.to(enter, { progress: maxP, duration: 0.9, ease: 'power2.out', overwrite: true })
        if (!tvPlayed && maxP >= TV_PLAY_AT) {
          tvPlayed = true
          tv.dispatchEvent(new Event('s2:tv-play'))
        }
        if (!typed && maxP >= 0.999) {
          typed = true
          if (instant) type.progress(1)
          else gsap.delayedCall(0.7, () => type.play())
        }
      }

      const D1 = () => introPinDuration() // o pin de entrada da seção 1 vem antes

      /* ---------- grupo da esquerda (ManifestoNos): itens e botão ---------- */
      const left = q('.s2-group--without')
      const cue = q('.s2-cue')
      const items = root.querySelectorAll('.s2-item')
      // mesmo início do pin lateral (useManifestoHorizontal): centro dos
      // grupos da seção 2 a 56% da tela
      const ms2 = q('.ms2')
      const lateralPinAt = () => {
        let top = Infinity
        let bottom = -Infinity
        ms2.querySelectorAll('.s2-group').forEach((g) => {
          top = Math.min(top, g.offsetTop)
          bottom = Math.max(bottom, g.offsetTop + g.offsetHeight)
        })
        return docTop(ms2) + (top + bottom) / 2 - window.innerHeight * 0.56 + D1()
      }
      /* ---------- itens "Sem …": decoder, uma vez, quando o grupo chega ---------- */
      // (o resto da entrada do grupo — NÓS, auréola, conversa — é do
      // useManifestoNos, no mesmo gatilho; os itens entram 1.2s depois)
      gsap.set(items, { autoAlpha: 0 })
      const decodeItems = () => items.forEach((item, i) => {
        alive.push(gsap.delayedCall(i * DECODE_STAGGER, () => {
          item.dispatchEvent(new Event('s2:decode'))
          // só aparece depois que o React já trocou o texto pelos símbolos
          alive.push(gsap.delayedCall(0.08, () => gsap.set(item, { autoAlpha: 1 })))
        }))
      })
      const titleSt = left && ScrollTrigger.create({
        trigger: left,
        start: () => docTop(left) - window.innerHeight * 0.8 + D1(),
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => alive.push(gsap.delayedCall(ITEMS_AT, decodeItems)),
      })

      // Botão (scrub, reversível): o contorno se desenha da esquerda pra
      // direita e o recipiente enche (a onda só corre enquanto está enchendo).
      let leftTl = null
      if (left && cue) {
        leftTl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: left,
            start: () => docTop(left) - window.innerHeight * 0.85 + D1(),
            end: () => Math.max(lateralPinAt(), docTop(left) - window.innerHeight * 0.85 + D1() + 1),
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
        })
        leftTl.fromTo(cue, { clipPath: 'inset(0% 100% 0% 0% round 999px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 0.14, ease: 'power2.inOut' }, 0.66)
        leftTl.fromTo(cue, { '--fill': 0 }, {
          '--fill': 1,
          duration: 0.22,
          ease: 'sine.inOut',
          onUpdate() { const p = this.progress(); cue.classList.toggle('is-filling', p > 0 && p < 1) },
        }, 0.78)
      }
      const st = ScrollTrigger.create({
        trigger: group,
        // do topo do grupo entrando por baixo da tela até o centro dele a 60%
        start: () => docTop(group) - window.innerHeight + D1(),
        end: () => docTop(group) + group.offsetHeight / 2 - window.innerHeight * 0.6 + D1(),
        invalidateOnRefresh: true,
        onUpdate: (self) => advance(self.progress, false),
        // carregou a página já depois do trecho: aparece pronto, sem animar
        onRefresh: (self) => { if (maxP === 0 && self.progress >= 1) advance(1, true) },
      })

      // Sticker: só a estrela de fora gira, devagar e ligada ao scroll (scrub
      // com inércia), do sticker entrando na tela até bem depois do pin lateral;
      // logo, texto e brilhos do miolo ficam parados.
      const ring = smiley.querySelector('.s2-smiley-ring')
      const ringTw = ring && gsap.fromTo(ring, { rotation: 0 }, {
        rotation: STICKER_TURN,
        svgOrigin: '200 200',
        ease: 'none',
        scrollTrigger: {
          trigger: group,
          start: () => docTop(group) - window.innerHeight + D1(),
          end: () => docTop(group) + window.innerHeight * 4 + D1(),
          scrub: 1.4,
          invalidateOnRefresh: true,
        },
      })

      // Sticker acompanha o mouse (xPercent/yPercent — o x da entrada fica
      // livre). Só com mouse; em toque não existe, por decisão.
      let onMove = null
      if (window.matchMedia('(pointer: fine)').matches) {
        const qx = gsap.quickTo(smiley, 'xPercent', { duration: 1.2, ease: 'power3' })
        const qy = gsap.quickTo(smiley, 'yPercent', { duration: 1.2, ease: 'power3' })
        onMove = (e) => {
          qx((e.clientX / window.innerWidth - 0.5) * 6)
          qy((e.clientY / window.innerHeight - 0.5) * 5)
        }
        window.addEventListener('pointermove', onMove)
      }

      return () => {
        ringTw?.scrollTrigger?.kill()
        ringTw?.kill()
        leftTl?.scrollTrigger?.kill()
        leftTl?.kill()
        titleSt?.kill()
        cue?.classList.remove('is-filling')
        search.classList.remove('is-onscreen')
        st.kill()
        io.disconnect()
        alive.forEach((a) => a.kill())
        if (onMove) window.removeEventListener('pointermove', onMove)
        text.classList.remove('is-typing')
        text.textContent = fullText
      }
    })

    return () => mm.revert()
  }, [rootRef])
}
