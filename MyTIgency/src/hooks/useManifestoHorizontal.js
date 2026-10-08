import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { mountSection3, TOTAL, S3_MAP, S3_MAP_SPAN, S3_RADAR } from '../utils/manifestoS3'
import { LINE_A_EXT, LINE_A_JOIN, LINE_A_LEN } from '../utils/manifestoLineA'
import { introPinDuration, lineAPen } from '../utils/manifestoScroll'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)

// Desktop/tablet only — o mobile das seções 2/3 é outro layout (a definir).
const DESKTOP_QUERY = '(min-width: 701px)'
// Começa um pouco antes do centro exato: quando o centro do conteúdo ainda
// está esta fração da altura da tela abaixo do meio.
const START_EARLY = 0.06
// Notebook (tela baixa): a faixa fixa do topo (marquee + header) come uma
// fatia maior da altura e o topo do conteúdo ficava embaixo dela durante o
// pin. Só aqui o pin começa mais cedo, para o topo do conteúdo encostar no
// fim do header, como já acontece no desktop.
const NOTEBOOK_QUERY = '(max-height: 900px)'
// Topo do conteúdo da seção 3, em vh (notebook: o header não pode cobri-lo).
const S3_TOP_VH = 0.133
// Seção 3 (layout "tudo junto"): o conteúdo ocupa ~140vh de largura (fica
// centrado no fim do trajeto; a trilha só anda o que passar da tela) e o
// desenho inteiro leva 4 telas de scroll. O disco do mapa começa logo depois
// da caixa de busca da seção 2 — anjo colado na TV, como no Figma.
const S3_WIDTH_VH = 1.4
const DISC_AFTER_SEARCH_VH = 0.01
// A ponta do traço A entra esta fração do raio no disco (fica sob o mapa) e
// chega depois do radar passar por ela (unidades de TOTAL): o trecho atrás
// do radar leva ~3.6 para sair dos blocos e ficar nítido, então quando a
// caneta chega a borda já está formada e o radar bem adiante.
const PEN_INTO_DISC = 0.06
const PEN_AFTER_RADAR = 4.5
const S3_SCROLL_VH = 4
// A ilustração (.s3-comp, a 2vh da borda da seção 3) começa a ser desenhada
// quando a borda esquerda dela entra até esta fração da largura da tela.
const S3_COMP_X_VH = 0.02
const DRAW_START_AT = 0.75
// Mesmo ajuste de scrub do protótipo da seção 3.
const SCRUB = 0.9
// TV gira com a posição dela na tela, como um objeto real visto por uma câmera
// que passa: à direita (onde está no início do pin) o 3/4 de repouso; no
// centro, de frente; perto da borda esquerda (TV_TURN_END_AT da largura), o
// lado direito dela, com o adesivo, de frente — TV_TURN rad além do repouso.
const TV_TURN = 1.6
const TV_TURN_END_AT = 0.2
const turnEase = gsap.parseEase('sine.inOut')

// Scroll lateral do Manifesto: quando o conteúdo da seção 2 chega ao centro da
// tela, o bloco inteiro fixa (pin) e o scroll vertical passa a mover a trilha
// para a esquerda. Duas fases num controlador só:
//   A) seção 2 → seção 3: trilha anda 1px por px de scroll até a seção 3
//      ficar centrada; enquanto isso a caneta do traço A (useManifestoIntro,
//      um drawSVG só desde o "+") termina de chegar no disco do mapa, no
//      instante em que o radar dele passa pelo ponto de chegada;
//   B) seção 3: a trilha anda o que sobrar (140vh − tela) ao longo de 4 telas
//      de scroll enquanto a ilustração é desenhada.
// Fixa o bloco todo (não só a seção 2) porque o traço A emenda as seções.
export function useManifestoHorizontal(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const track = root.querySelector('.ms-track')
    const ms2 = root.querySelector('.ms2')
    const groups = root.querySelectorAll('.s2-group')
    const lineLow = root.querySelector('.s2-line-a')
    const guides = root.querySelectorAll('.la-guide')
    const s3 = root.querySelector('.s3')
    const comp = root.querySelector('.s3-comp')
    const tvCanvas = root.querySelector('.s2-tv')
    const searchBox = root.querySelector('.s2-search-box')
    if (!track || !ms2 || !groups.length || !lineLow || !s3 || !comp || !searchBox) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Posição no documento pela cadeia de offsetTop: é layout puro, imune ao
    // transform da transição Hero→Marquee (.reveal-panel), que no topo da
    // página desloca tudo e faria getBoundingClientRect errar o início.
    const docTop = (el) => {
      let y = 0
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop
      return y
    }
    // Caixa de um elemento em coordenadas da trilha/bloco (sem transforms).
    const boxIn = (el) => {
      let x = 0
      let y = 0
      for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight }
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
    let vw = 1
    let tvCx = 0 // centro da TV, na trilha
    let tvF0 = 1 // fração da tela em que o centro da TV está no início do pin
    function layout() {
      const vh = window.innerHeight
      vw = window.innerWidth
      // Seção 3: ocupa a tela durante o pin (no notebook, desce até sair de
      // baixo do header); na horizontal, o disco do mapa logo depois da busca.
      const k = comp.offsetHeight / 784 // px por unidade do frame da ilustração
      const sb = boxIn(searchBox)
      const compX = sb.x + sb.w + vh * DISC_AFTER_SEARCH_VH - S3_MAP.x * k
      const s3Left = compX - comp.offsetLeft
      const s3Shift = isNotebook() ? Math.max(0, chromeBottom() - vh * S3_TOP_VH) : 0
      const s3Top = startY() - docTop(root) + s3Shift
      const compY = s3Top + comp.offsetTop
      // A caneta do traço A vai até a borda do disco (embaixo, à esquerda,
      // como no Figma), entrando um pouco nele: primeiro ponto da extensão
      // dentro do disco.
      const line = boxIn(lineLow) // SVG 2135×1216 (unidades do traço)
      const at = ([u, v]) => [line.x + (u / 2135) * line.w, line.y + (v / 1216) * line.h]
      const dcx = compX + S3_MAP.cx * k
      const dcy = compY + S3_MAP.cy * k
      const inR = S3_MAP.R * k * (1 - PEN_INTO_DISC)
      const ext = [LINE_A_JOIN, ...LINE_A_EXT]
      let lenTo = 0
      let lenAll = 0
      let tip = null
      for (let i = 1; i < ext.length; i++) {
        const [u0, v0] = ext[i - 1]
        const [u1, v1] = ext[i]
        const seg = Math.hypot(u1 - u0, v1 - v0)
        for (let s = 1; s <= 20 && !tip; s++) {
          const p = at([u0 + ((u1 - u0) * s) / 20, v0 + ((v1 - v0) * s) / 20])
          if (Math.hypot(p[0] - dcx, p[1] - dcy) <= inR) { tip = p; lenTo = lenAll + (seg * s) / 20 }
        }
        lenAll += seg
      }
      if (!tip) lenTo = lenAll
      lineAPen.frac = (LINE_A_LEN + lenTo) / (LINE_A_LEN + lenAll)
      // instante em que o radar do mapa passa pelo ponto de chegada (ângulo a
      // partir do topo, horário — a mesma conta do shader)
      const ang = tip ? ((Math.atan2(tip[0] - dcx, -(tip[1] - dcy)) / (2 * Math.PI)) + 1) % 1 : 0
      const [m0, m1] = S3_MAP_SPAN
      const arriveT = m0 + (ang * (m1 - m0)) / S3_RADAR + PEN_AFTER_RADAR
      root.style.setProperty('--s3-left', `${s3Left}px`)
      root.style.setProperty('--s3-top', `${s3Top}px`)
      const contentW = vh * S3_WIDTH_VH
      travelA = Math.max(0, s3Left - Math.max(0, (vw - contentW) / 2))
      travelB = Math.max(0, contentW - vw)
      scrollB = vh * S3_SCROLL_VH
      drawStart = Math.min(travelA, Math.max(0, s3Left + vh * S3_COMP_X_VH - vw * DRAW_START_AT))
      // scroll absoluto em que a caneta chega (o drawSVG único do traço A em
      // useManifestoIntro termina aqui)
      lineAPen.end = pinAt() + drawStart + (arriveT / TOTAL) * (travelA + scrollB - drawStart)
      if (reduced) gsap.set(guides, { drawSVG: `${lineAPen.frac * 100}%` })
      root.style.setProperty('--ms-travel', `${travelA + travelB}px`)
      if (tvCanvas) {
        const tvBox = boxIn(tvCanvas)
        tvCx = tvBox.x + tvBox.w / 2
        tvF0 = Math.max(TV_TURN_END_AT + 0.1, tvCx / vw)
      }
    }

    let s3api = null
    let drawTl = null
    const proxy = { d: 0 } // px de scroll percorridos dentro do pin

    function apply() {
      const d = proxy.d
      const x = d <= travelA ? -d : -(travelA + Math.min(1, (d - travelA) / scrollB) * travelB)
      gsap.set(track, { x })
      // giro da TV pela posição dela na tela (sem giro em reduced motion)
      if (!reduced) {
        const t = Math.min(1, Math.max(0, (tvF0 - (tvCx + x) / vw) / (tvF0 - TV_TURN_END_AT)))
        tvCanvas?.tv?.setTurn(-TV_TURN * turnEase(t))
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
      return () => {
        gsap.set(track, { clearProps: 'transform,willChange' })
        lineAPen.end = 0 // sem o pin lateral, a caneta volta a terminar na seção 2
        tvCanvas?.tv?.setTurn(0)
      }
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
        mark: q('.s3-who-word'),
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
