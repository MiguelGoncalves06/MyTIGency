import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { mountSection3, TOTAL } from '../utils/manifestoS3'
import { introPinDuration } from '../utils/manifestoScroll'

gsap.registerPlugin(ScrollTrigger)

// Desktop/tablet only — o mobile das seções 2/3 é outro layout (a definir).
const DESKTOP_QUERY = '(min-width: 701px)'
// Começa um pouco antes do centro exato: quando o centro do conteúdo ainda
// está esta fração da altura da tela abaixo do meio.
const START_EARLY = 0.06
// Notebook (tela baixa): a faixa fixa do topo (marquee + header) come uma
// fatia maior da altura e o topo do conteúdo ficava embaixo dela durante o
// pin. Só aqui o pin começa mais cedo e a seção 3 desce o necessário para o
// topo do conteúdo encostar no fim do header, como já acontece no desktop.
const NOTEBOOK_QUERY = '(max-height: 900px)'
// Topo do conteúdo da seção 3 (o "ideias viram produtos" girado), em vh.
const S3_TOP_VH = 0.133
// Seção 3 (protótipo): trilha de 233vh de largura, o "quem" a 8vh da borda
// esquerda dela, e 5.5 telas de scroll para o desenho inteiro.
const S3_WIDTH_VH = 2.33
const S3_QUEM_X_VH = 0.08
const S3_SCROLL_VH = 5.5
// A ilustração (.s3-comp, a 58vh da borda da seção 3) começa a ser desenhada
// quando a borda esquerda dela entra até esta fração da largura da tela —
// antes, o desenho só começava com a seção 3 já encostada na esquerda.
const S3_COMP_X_VH = 0.58
const DRAW_START_AT = 0.75
// Fim do rabo do traço A (manifest-vetorA-s3, 588×249): onde ele encosta no "quem".
const TAIL_END = [587 / 588, 5 / 249]
// Mesmo ajuste de scrub do protótipo da seção 3.
const SCRUB = 0.9

// Scroll lateral do Manifesto: quando o conteúdo da seção 2 chega ao centro da
// tela, o bloco inteiro fixa (pin) e o scroll vertical passa a mover a trilha
// para a esquerda. Duas fases num controlador só:
//   A) seção 2 → seção 3: trilha anda 1px por px de scroll até a seção 3
//      encostar na borda esquerda (o rabo do traço A chega no "quem");
//   B) seção 3: a trilha anda o resto (233vh − tela) ao longo de 5.5 telas de
//      scroll enquanto a ilustração é desenhada (timeline de manifestoS3).
// Fixa o bloco todo (não só a seção 2) porque o traço A emenda as seções.
export function useManifestoHorizontal(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const track = root.querySelector('.ms-track')
    const ms2 = root.querySelector('.ms2')
    const groups = root.querySelectorAll('.s2-group')
    const tail = root.querySelector('.s2-line-a-tail')
    const s3 = root.querySelector('.s3')
    if (!track || !ms2 || !groups.length || !tail || !s3) return undefined

    // Posição no documento pela cadeia de offsetTop: é layout puro, imune ao
    // transform da transição Hero→Marquee (.reveal-panel), que no topo da
    // página desloca tudo e faria getBoundingClientRect errar o início.
    const docTop = (el) => {
      let y = 0
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop
      return y
    }
    // Faixa fixa do topo durante o Manifesto: marquee acoplado + header.
    const chromeBottom = () => {
      const header = document.querySelector('header')
      const marqueeH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--marquee-h')) || 0
      return marqueeH + (header?.offsetHeight ?? 0)
    }
    const isNotebook = () => window.matchMedia(NOTEBOOK_QUERY).matches
    // Em layout (sem pins). O pin de entrada da seção 1 (useManifestoIntro)
    // vem antes e segura o bloco por introPinDuration() de scroll: o início
    // real soma isso; já a posição da seção 3 dentro do bloco não muda (depois
    // daquele pin o bloco inteiro está deslocado pela mesma duração).
    const startY = () => {
      // Conteúdo da seção 2 (os dois grupos, sem os traços), no documento.
      let top = Infinity
      let bottom = -Infinity
      groups.forEach((g) => {
        top = Math.min(top, g.offsetTop)
        bottom = Math.max(bottom, g.offsetTop + g.offsetHeight)
      })
      top += docTop(ms2)
      bottom += docTop(ms2)
      const y = (top + bottom) / 2 - window.innerHeight * (0.5 + START_EARLY)
      return isNotebook() ? y - Math.max(0, chromeBottom() - (top - y)) : y
    }
    const pinAt = () => startY() + introPinDuration()

    // Medidas em coordenadas da trilha (offset*, imunes ao transform dela).
    let travelA = 0
    let travelB = 0
    let scrollB = 0
    let drawStart = 0 // px de scroll (dentro do pin) em que o desenho começa
    function layout() {
      const vh = window.innerHeight
      const tailEndX = ms2.offsetLeft + tail.offsetLeft + tail.offsetWidth * TAIL_END[0]
      const tailEndY = ms2.offsetTop + tail.offsetTop + tail.offsetHeight * TAIL_END[1]
      const s3Left = tailEndX - vh * S3_QUEM_X_VH
      // A seção 3 ocupa exatamente a tela enquanto o bloco está fixado (no
      // notebook, deslocada para baixo até o conteúdo sair de baixo do header).
      const s3Shift = isNotebook() ? Math.max(0, chromeBottom() - vh * S3_TOP_VH) : 0
      const s3Top = startY() - docTop(root) + s3Shift
      root.style.setProperty('--s3-left', `${s3Left}px`)
      root.style.setProperty('--s3-top', `${s3Top}px`)
      root.style.setProperty('--s3-quem-y', `${tailEndY - s3Top}px`)
      travelA = Math.max(0, s3Left)
      travelB = Math.max(0, vh * S3_WIDTH_VH - window.innerWidth)
      scrollB = vh * S3_SCROLL_VH
      drawStart = Math.min(travelA, Math.max(0, s3Left + vh * S3_COMP_X_VH - window.innerWidth * DRAW_START_AT))
      root.style.setProperty('--ms-travel', `${travelA + travelB}px`)
    }

    let s3api = null
    let drawTl = null
    const proxy = { d: 0 } // px de scroll percorridos dentro do pin

    function apply() {
      const d = proxy.d
      if (d <= travelA) {
        gsap.set(track, { x: -d })
      } else {
        const q = Math.min(1, (d - travelA) / scrollB)
        gsap.set(track, { x: -(travelA + q * travelB) })
      }
      // Desenho: de drawStart até o fim do pin, linear — o título continua
      // assentando no fim do percurso, como no protótipo.
      const end = travelA + scrollB
      drawTl?.time(Math.min(1, Math.max(0, (d - drawStart) / (end - drawStart))) * TOTAL)
    }

    const mm = gsap.matchMedia()
    mm.add(DESKTOP_QUERY, () => {
      layout()
      gsap.fromTo(proxy, { d: 0 }, {
        d: () => travelA + scrollB,
        ease: 'none',
        onUpdate: apply,
        scrollTrigger: {
          trigger: root,
          start: pinAt,
          end: () => `+=${travelA + scrollB}`,
          pin: true,
          // Fixa por transform, não por position:fixed. O .reveal-panel (pai)
          // pode estar com transform/will-change da transição Hero→Marquee, e
          // aí um fixed se posiciona relativo a ele e o bloco some da tela.
          pinType: 'transform',
          scrub: SCRUB,
          invalidateOnRefresh: true,
          refreshPriority: -1, // mede depois do gatilho da Hero→Marquee
          onRefreshInit: layout,
          onRefresh: apply,
          onUpdate: (self) => {
            if (proxy.d > drawStart) s3api?.setVelocity(Math.min(1, Math.abs(self.getVelocity()) / 3500))
          },
          // Mesmo padrão do tween Marquee/panel (useHeroMarqueeReveal): promove
          // a camada só enquanto o scrub lateral está de fato em jogo.
          onEnter: () => gsap.set(track, { willChange: 'transform' }),
          onEnterBack: () => gsap.set(track, { willChange: 'transform' }),
          onLeave: () => gsap.set(track, { willChange: 'auto' }),
          onLeaveBack: () => gsap.set(track, { willChange: 'auto' }),
        },
      })
      return () => gsap.set(track, { clearProps: 'transform,willChange' })
    })

    // Seção 3 (WebGL + ~1 MB de gravuras) só monta quando a seção 2 chega perto
    // E a tela é desktop — as duas condições podem virar em qualquer ordem
    // (ex.: janela alargada com a seção já na tela), então as duas tentam.
    let cancelled = false
    let near = false
    function tryMount() {
      if (s3api || cancelled || !near || !window.matchMedia(DESKTOP_QUERY).matches) return
      io.disconnect()
      const q = (sel) => s3.querySelector(sel)
      s3api = mountSection3({
        root: s3, comp: q('.s3-comp'), gl: q('.s3-gl'), gl2: q('.s3-gl2'),
        ov: q('.s3-ov'), ov2: q('.s3-ov2'), ovdefs: q('.s3-ovdefs'),
        titleDeco: q('.s3-title-deco'), tipArrow: q('.s3-tip-arrow'), hand: q('.s3-hand'),
        titleSpans: [...s3.querySelectorAll('.s3-title span')], bin: q('.s3-bin'),
      })
      s3api.ready.then((res) => {
        if (cancelled || !res?.tl) return
        drawTl = res.tl
        apply()
      }).catch((err) => console.error('[manifesto s3]', err))
    }
    const io = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting
      tryMount()
    }, { rootMargin: '100% 0px' })
    io.observe(ms2)
    mm.add(DESKTOP_QUERY, () => { tryMount() })

    // Alturas da seção dependem de fontes web; remede quando carregarem.
    document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      cancelled = true
      io.disconnect()
      mm.revert()
      s3api?.dispose()
    }
  }, [rootRef])
}
