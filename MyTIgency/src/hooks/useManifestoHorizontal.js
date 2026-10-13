import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { LINE_A_EXT, LINE_A_JOIN, LINE_A_LEN } from '../utils/manifestoLineA'
import { introPinDuration, lineAPen } from '../utils/manifestoScroll'
import { mountCursor3D } from '../utils/cursor3d'
import { warpBrush } from '../utils/manifestoBrush'
import { buildSplit } from '../utils/manifestoSplit'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)

// Desktop/tablet: pin lateral. Mobile (≤700px): seção 3 empilhada, sem pin.
export const DESKTOP_QUERY = '(min-width: 701px)'
const MOBILE_QUERY = '(max-width: 700px)'
// Começa um pouco antes do centro exato: quando o centro do conteúdo ainda
// está esta fração da altura da tela abaixo do meio.
const START_EARLY = 0.06
// Notebook (tela baixa): a faixa fixa do topo (marquee + header) come uma
// fatia maior da altura e o topo do conteúdo ficava embaixo dela durante o
// pin. Só aqui o pin começa mais cedo, para o topo do conteúdo encostar no
// fim do header, como já acontece no desktop.
const NOTEBOOK_QUERY = '(max-height: 900px)'
// = caneta do traço A (useManifestoIntro): com scrubs diferentes, rolando
// rápido o cursor chegava ao traço antes dele (ou o traço passava do cursor).
const SCRUB = 1.2
// TV gira com a posição dela na tela, como um objeto real visto por uma câmera
// que passa: à direita (onde está no início do pin) o 3/4 de repouso; no
// centro, de frente; perto da borda esquerda (TV_TURN_END_AT da largura), o
// lado direito dela, com o adesivo, de frente — TV_TURN rad além do repouso.
const TV_TURN = 1.6
const TV_TURN_END_AT = 0.2
// A tela da TV sai do chiado e trava a imagem (setTune) até este ponto do
// mesmo giro — ~0.42 é onde sine.inOut chega ao ângulo de frente.
const TV_TUNE_AT = 0.42
const turnEase = gsap.parseEase('sine.inOut')

// Seção 3: uma tela (100vw) logo depois da caixa de busca; depois que ela
// centra, HOLD_VH de scroll parado para as palavras, a seleção e a pílula.
const S3_GAP_VW = 0.06
const HOLD_VH = 1.1
// Cursor (o da busca vira o cursor 3D): sai da busca a GO_AT do percurso
// lateral e chega a DRAW_END_HOLD do scroll parado. Antes de soltar dá um
// "clique" (PRESS). Pega o traço A num ponto à direita da busca
// (PICK_AFTER_VW) — assim ele só anda para frente.
const GO_AT = 0.16
const DRAW_END_HOLD = 0.35
const PRESS = 0.05
const PICK_AFTER_VW = 0.16
// Ponta do cursor na busca: logo depois da lupa, na borda de baixo da caixa
// (frações do texto/caixa); tamanho = altura da caixa × SIZE_IN_SEARCH.
const START = { textX: 0.04, boxY: 0.86 }
const SIZE_IN_SEARCH = 1.6
// O pincel do trecho novo (arte do traço A deformada) engrossa até 125% no fim.
const BRUSH_GAIN = 1.25
const sineIO = (t) => (1 - Math.cos(Math.PI * t)) / 2
const sineIOinv = (v) => Math.acos(1 - 2 * v) / Math.PI
const smooth = (t) => t * t * (3 - 2 * t)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const TAU = Math.PI * 2
// Bézier cúbica: curve(início, c1, c2, fim, c1, c2, fim, ...) em px.
const curve = (a, ...r) => `M${a}` + r.map((p, i) => (i % 3 ? ' ' : 'C') + p).join('')

// Scroll lateral do Manifesto: quando o conteúdo da seção 2 chega ao centro da
// tela, o bloco inteiro fixa (pin) e o scroll vertical passa a mover a trilha
// para a esquerda até a seção 3 ficar centrada; depois, HOLD_VH de scroll
// parado. Fixa o bloco todo (não só a seção 2) porque o traço A emenda as
// seções. O cursor da busca (set:mytigency.com) vira o cursor 3D: na seção 2
// é um cursor de interface; no pin ele "clica e solta" e percorre UM caminho
// só (velocidade constante, uma easing no trajeto inteiro): desce até a ponta
// do traço A, pega-a e, como caneta, desenha o resto do traço (a mesma arte,
// deformada) até o vão entre as palavras da seção 3, onde assenta em 3/4.
export function useManifestoHorizontal(rootRef, lang) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const q = (sel) => root.querySelector(sel)
    const track = q('.ms-track')
    const ms2 = q('.ms2')
    const groups = root.querySelectorAll('.s2-group')
    const lineLow = q('.s2-line-a')
    const guides = root.querySelectorAll('.la-guide')
    const s3 = q('.s3')
    const s3vis = q('.s3-vis')
    const tvCanvas = q('.s2-tv')
    const search = q('.s2-search') // useManifestoS2Enter anima o x dele (entrada)
    const searchBox = q('.s2-search-box')
    const searchText = q('.s2-search-text')
    const searchCursor = q('.s2-search-cursor')
    if (!track || !ms2 || !groups.length || !lineLow || !s3 || !s3vis || !search || !searchBox || !searchText || !searchCursor) return undefined
    const who = JSON.parse(s3vis.dataset.who)
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
    // vem antes e segura o bloco por introPinDuration() de scroll.
    const startY = () => {
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
    // ponta do cursor na busca (caixas em px)
    const startIn = (box, text) => [text.x + text.w * START.textX, box.y + box.h * START.boxY]

    // Seção 3: o DOM é montado quando as fontes chegam (o corpo das palavras é
    // medido); cada modo (desktop/mobile) só reajusta e anima.
    let cancelled = false
    let split = null
    const ready = Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('500 16px "JetBrains Mono"'),
    ]).catch(() => {}).then(() => {
      if (!cancelled) split = buildSplit(s3vis, who)
      return split
    })
    // o cursor (e a seção 3) só montam quando a seção 2 chega perto
    let near = false
    const nearWaiters = []
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      near = true
      io.disconnect()
      nearWaiters.splice(0).forEach((fn) => fn())
    }, { rootMargin: '100% 0px' })
    io.observe(ms2)
    const whenNear = (fn) => (near ? fn() : nearWaiters.push(fn))

    const mm = gsap.matchMedia()

    /* ------------------------------ desktop ------------------------------ */
    mm.add(DESKTOP_QUERY, () => {
      let alive = true
      let st = null
      let cur = null
      let canvas = null
      // medidas em coordenadas da trilha (offset*, imunes ao transform dela)
      let travelA = 0
      let scrollB = 0
      let vw = 1
      let vh = 1
      let tvCx = 0 // centro da TV, na trilha
      let tvF0 = 1 // fração da tela em que o centro da TV está no início do pin
      let s3Left = 0
      let s3Top = 0
      let rootDoc = 0
      let dGo = 0
      let dEnd = 0
      let J = [0, 0] // onde o cursor pega o traço A
      let Jdir = [1, 0]
      let pickS = 0 // comprimento da extensão do traço A até J (unid. do SVG)
      let artScale = 1 // px por unidade do SVG do traço A
      let T = [0, 0] // ponta na busca
      let F = [0, 0] // ponta final, no vão da seção 3
      let sF = 200 // tamanho final do cursor
      let s0 = 40 // tamanho na busca
      let L = 1 // comprimento do caminho inteiro
      let L1 = 1 // ... até J
      let ext = null

      // traço novo: arte do traço A deformada, revelada por uma máscara de
      // caneta (como a do site); motion/seg1 são só geometria
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('class', 's3-ext')
      svg.setAttribute('aria-hidden', 'true')
      Object.assign(svg.style, { position: 'absolute', left: 0, top: 0, width: '1px', height: '1px', overflow: 'visible', zIndex: 1, pointerEvents: 'none' })
      // ponta reta (butt) na máscara: a redonda avançava meia espessura além
      // da cabeça e o traço aparecia na frente da ponta do cursor
      svg.innerHTML = '<defs><mask id="s3-brush-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="0" height="0">'
        + '<path fill="none" stroke="#fff" stroke-linecap="butt" stroke-linejoin="round"/></mask></defs>'
        + '<path fill="#FF4438" mask="url(#s3-brush-mask)"/><path fill="none"/><path fill="none"/>'
      track.append(svg)
      const maskEl = svg.querySelector('mask')
      const extPath = maskEl.firstChild
      const [, brushArt, motion, seg1] = svg.children
      // drawSVG manual: dasharray = comprimento; set(t) revela até t
      const stroke = (path, d) => {
        path.setAttribute('d', d)
        const len = path.getTotalLength()
        path.style.strokeDasharray = `${len}`
        return { set: (t) => { path.style.strokeDashoffset = `${len * (1 - t)}` } }
      }

      function layout() {
        vh = window.innerHeight
        vw = window.innerWidth
        const sb = boxIn(searchBox)
        s3Left = sb.x + sb.w + vw * S3_GAP_VW
        s3Top = startY() - docTop(root)
        rootDoc = docTop(root)
        root.style.setProperty('--s3-left', `${s3Left}px`)
        root.style.setProperty('--s3-top', `${s3Top}px`)
        // a pílula fica abaixo da faixa fixa do topo
        root.style.setProperty('--s3-chrome', `${Math.max(0, chromeBottom() - (docTop(root) + s3Top - startY()))}px`)
        travelA = s3Left
        scrollB = vh * HOLD_VH
        dGo = travelA * GO_AT
        dEnd = travelA + scrollB * DRAW_END_HOLD
        // ponto da extensão do traço A a PICK_AFTER_VW à direita da busca
        const line = boxIn(lineLow) // SVG 2135×1216
        const sx = line.w / 2135
        const sy = line.h / 1216
        const at = ([u, v]) => [line.x + u * sx, line.y + v * sy]
        T = startIn(boxIn(searchBox), boxIn(searchText))
        const pickX = T[0] + vw * PICK_AFTER_VW
        const pts = [LINE_A_JOIN, ...LINE_A_EXT]
        let lenAll = 0
        let lenTo = -1
        for (let i = 1; i < pts.length; i++) {
          const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
          const a = at(pts[i - 1])
          const b = at(pts[i])
          if (lenTo < 0 && b[0] >= pickX) {
            const f = clamp01((pickX - a[0]) / (b[0] - a[0]))
            J = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
            const n = Math.hypot(b[0] - a[0], b[1] - a[1])
            Jdir = [(b[0] - a[0]) / n, (b[1] - a[1]) / n]
            lenTo = lenAll + seg * f
          }
          lenAll += seg
        }
        if (lenTo < 0) { lenTo = lenAll; J = at(pts[pts.length - 1]) }
        pickS = lenTo
        artScale = sx
        // a máscara do traço A usa pincel redondo de 40 unid.: a ponta dele vai
        // 20 além do fim do drawSVG — termina 20 antes para a arte parar em J
        lineAPen.frac = (LINE_A_LEN + lenTo - 20) / (LINE_A_LEN + lenAll)
        if (reduced) gsap.set(guides, { drawSVG: `${lineAPen.frac * 100}%` })
        root.style.setProperty('--ms-travel', `${travelA}px`)
        if (tvCanvas) {
          const tvBox = boxIn(tvCanvas)
          tvCx = tvBox.x + tvBox.w / 2
          tvF0 = Math.max(TV_TURN_END_AT + 0.1, tvCx / vw)
        }
        buildPath()
      }

      // caminho do cursor + traço novo (precisa da seção 3 montada para o vão)
      function buildPath() {
        if (!split) { lineAPen.end = pinAt() + travelA * 0.4; return }
        split.refit(Math.round(vw * 0.2))
        const gap = split.gap()
        sF = Math.min(gap.w * 0.78, vh * 0.3)
        // corpo do cursor centrado no vão (antes do modelo carregar, aproximado)
        const [bx, by] = cur?.body(sF) ?? [sF * 0.33, sF * 0.45]
        F = [s3Left + gap.x + gap.w / 2 - bx, s3Top + vh / 2 - by]
        // 1) da busca desce para a frente até J, chegando na direção do traço;
        // 2) segue na mesma direção e sobe reto pelo vão (tangente contínua em J)
        const c1 = [T[0] + vw * 0.06, T[1] + vh * 0.12]
        const c2 = [J[0] - Jdir[0] * vw * 0.12, J[1] - Jdir[1] * vw * 0.12]
        const c3 = [J[0] + Jdir[0] * vw * 0.35, J[1] + Jdir[1] * vw * 0.35]
        const c4 = [F[0], F[1] + vh * 0.5]
        seg1.setAttribute('d', curve(T, c1, c2, J))
        motion.setAttribute('d', curve(T, c1, c2, J, c3, c4, F))
        L1 = seg1.getTotalLength()
        L = motion.getTotalLength()
        const bw = 70 * artScale * BRUSH_GAIN // cobre a arte
        extPath.setAttribute('stroke-width', bw)
        ext = stroke(extPath, curve(J, c3, c4, F))
        // região da máscara = caixa do traço (+ espessura). Grande demais (era
        // 60000²) estoura a textura da GPU e a página inteira fica preta.
        const bb = extPath.getBBox()
        Object.entries({ x: bb.x - bw, y: bb.y - bw, width: bb.width + bw * 2, height: bb.height + bw * 2 })
          .forEach(([k, v]) => maskEl.setAttribute(k, v))
        brushArt.setAttribute('d', warpBrush(extPath, pickS, artScale, BRUSH_GAIN))
        // o traço A chega em J no instante em que o cursor passa por ali
        lineAPen.end = pinAt() + dGo + sineIOinv(L1 / L) * (dEnd - dGo)
        s0 = searchBox.offsetHeight * SIZE_IN_SEARCH
        split.tagAt(F[0] - s3Left + sF * 0.7, F[1] - s3Top + sF * 1.02)
      }

      // fração do comprimento do caminho em que o cursor está
      const progress = (d) => (reduced ? 1 : sineIO(ramp(d, dGo, dEnd)))
      const proxy = { d: 0 } // px de scroll percorridos dentro do pin

      function apply() {
        const d = proxy.d
        const x = -Math.min(d, travelA)
        gsap.set(track, { x })
        // giro, sintonia e peso da TV pela posição dela na tela (nada disso em
        // reduced motion: a TV fica no repouso, já sintonizada)
        const tv = tvCanvas?.tv
        if (tv && !reduced) {
          const t = clamp01((tvF0 - (tvCx + x) / vw) / (tvF0 - TV_TURN_END_AT))
          tv.setTurn(-TV_TURN * turnEase(t))
          tv.setTune(t / TV_TUNE_AT)
          tv.setShift(x)
        }
        // a seção 3 entra pela direita: rótulos digitam, a 1ª palavra é
        // desenhada, a 2ª compila; com o cursor assentado, seleção (Figma) e
        // inspeção (DevTools), carimbo e etiqueta; por último a nota
        split?.update({
          kickA: ramp(d, travelA - vw * 0.85, travelA - vw * 0.6),
          wordA: ramp(d, travelA - vw * 0.8, travelA - vw * 0.25),
          kickB: ramp(d, travelA - vw * 0.7, travelA - vw * 0.45),
          wordB: ramp(d, travelA - vw * 0.6, travelA - vw * 0.05),
          crop: ramp(d, travelA - vw * 0.5, travelA),
          sel: ramp(d, dEnd - scrollB * 0.02, dEnd + scrollB * 0.2),
          inspect: ramp(d, dEnd + scrollB * 0.1, dEnd + scrollB * 0.3),
          mark: ramp(d, dEnd + scrollB * 0.22, dEnd + scrollB * 0.42),
          tag: ramp(d, dEnd + scrollB * 0.32, dEnd + scrollB * 0.45),
          note: ramp(d, dEnd + scrollB * 0.42, travelA + scrollB * 0.95),
        })
        ext?.set(Math.max(0, (progress(d) * L - L1) / (L - L1)))
      }

      // Cursor a cada quadro, dentro do quadro do próprio cursor (antes de
      // renderizar — sem atraso de um quadro para o traço) e sem ler layout:
      // a posição da trilha na tela vem do y do pin (transform aplicado pelo
      // GSAP, soma o pin de entrada da seção 1 e o lateral) + o x dela.
      function tick() {
        if (!ext || !st || !cur) return
        const d = proxy.d
        const s = progress(d)
        const trTop = rootDoc - window.scrollY + gsap.getProperty(root, 'y')
        const trLeft = gsap.getProperty(track, 'x')
        const click = gsap.getProperty(searchCursor, 'scale')
        const press = 1 - 0.14 * Math.sin(Math.PI * ramp(d, dGo - travelA * PRESS, dGo + travelA * 0.015))
        // escala geométrica: cada trecho cresce a mesma proporção
        const size = s0 * (sF / s0) ** smooth(ramp(s, 0.08, 0.95)) * press * (s > 0 ? 1 : click)
        // até pegar o traço: continua cursor de interface (chapado) e gira aos
        // poucos, no sentido horário, até a direção do traço em J
        const w = smooth(clamp01((s * L) / L1))
        const settle = Math.max(1 - w, smooth(ramp(s, 0.88, 1)))
        const flat = 1 - w
        const aimJ = cur.aimFor(Math.atan2(-Jdir[1], Jdir[0]))
        const aim = s * L < L1 ? cur.flatZ + ((((aimJ - cur.flatZ) % TAU) - TAU) % TAU) * w : null
        if (s <= 0) {
          cur.set(trLeft + T[0] + gsap.getProperty(search, 'x'), trTop + T[1], Math.PI / 2, 1, 1, size, 1)
          return
        }
        const a = motion.getPointAtLength(s * L)
        const p0 = motion.getPointAtLength(Math.max(0, s * L - 6))
        const p1 = motion.getPointAtLength(Math.min(L, s * L + 6))
        split?.cursor(trLeft + a.x, trTop + a.y)
        cur.set(trLeft + a.x, trTop + a.y, Math.atan2(p0.y - p1.y, p1.x - p0.x), settle, 1, size, flat, aim)
      }

      layout()
      st = gsap.fromTo(proxy, { d: 0 }, {
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
          // Mesmo padrão do tween Marquee/panel (useHeroMarqueeReveal): promove
          // a camada só enquanto o scrub lateral está de fato em jogo.
          onEnter: () => gsap.set(track, { willChange: 'transform' }),
          onEnterBack: () => gsap.set(track, { willChange: 'transform' }),
          onLeave: () => gsap.set(track, { willChange: 'auto' }),
          onLeaveBack: () => gsap.set(track, { willChange: 'auto' }),
        },
      }).scrollTrigger

      // seção 3 montada → remede (vão, caminho, lineAPen.end)
      ready.then(() => { if (alive && split) ScrollTrigger.refresh() })
      // cursor 3D: canvas da tela inteira (fora do bloco fixado)
      whenNear(async () => {
        await ready
        if (!alive || !split) return
        canvas = Object.assign(document.createElement('canvas'), { className: 'ms-cursor-cv' })
        canvas.setAttribute('aria-hidden', 'true')
        document.body.append(canvas)
        let c = null
        try {
          c = await mountCursor3D(canvas, { size: 40, before: tick })
        } catch (err) {
          console.error('[manifesto cursor]', err)
        }
        if (!alive || !c) { c?.dispose(); canvas.remove(); canvas = null; return }
        cur = c
        // em reduced motion o cursor não viaja: o SVG da busca fica e o 3D
        // aparece já assentado na seção 3
        if (!reduced) root.classList.add('has-cursor3d')
        ScrollTrigger.refresh() // corpo exato do cursor → ponta final
      })
      const onTvReady = () => apply()
      tvCanvas?.addEventListener('s2:tv-ready', onTvReady)

      return () => {
        alive = false
        tvCanvas?.removeEventListener('s2:tv-ready', onTvReady)
        cur?.dispose()
        canvas?.remove()
        svg.remove()
        root.classList.remove('has-cursor3d')
        gsap.set(track, { clearProps: 'transform,willChange' })
        lineAPen.end = 0 // sem o pin lateral, a caneta volta a terminar na seção 2
        lineAPen.frac = 1
        tvCanvas?.tv?.setTurn(0)
        tvCanvas?.tv?.setTune(1) // sem o pin lateral não há sintonia pelo scroll
      }
    })

    /* ------------------------------ mobile ------------------------------- */
    // Empilhada: pílula, é quem DESENHA, cursor 3D já assentado, e quem
    // PROGRAMA, nota. Os efeitos de texto seguem o scroll vertical da seção.
    mm.add(MOBILE_QUERY, () => {
      let alive = true
      let stm = null
      let cv = null
      let c = null
      const stateAt = (p) => ({
        mark: ramp(p, 0, 0.18),
        kickA: ramp(p, 0.08, 0.2),
        wordA: ramp(p, 0.1, 0.4),
        kickB: ramp(p, 0.3, 0.42),
        wordB: ramp(p, 0.34, 0.62),
        crop: ramp(p, 0.4, 0.62),
        sel: ramp(p, 0.55, 0.75),
        inspect: ramp(p, 0.62, 0.82),
        tag: ramp(p, 0.7, 0.85),
        note: ramp(p, 0.8, 1),
      })
      whenNear(async () => {
        await ready
        if (!alive || !split) return
        split.refit(0)
        stm = ScrollTrigger.create({
          trigger: s3,
          start: 'top 85%',
          end: 'bottom 75%',
          scrub: SCRUB,
          invalidateOnRefresh: true,
          onRefresh: (self) => { split.refit(0); split.update(stateAt(self.progress)) },
          onUpdate: (self) => split.update(stateAt(self.progress)),
        })
        split.update(stateAt(stm.progress))
        cv = document.createElement('canvas')
        s3vis.querySelector('.s3-gap').append(cv)
        try {
          c = await mountCursor3D(cv, { size: 100 })
        } catch (err) {
          console.error('[manifesto cursor]', err)
        }
        if (!alive || !c) { c?.dispose(); cv.remove(); return }
        // assentado no meio do vão, com a etiqueta junto ao corpo
        const g = split.gap()
        const size = g.h * 0.72
        const [bx, by] = c.body(size)
        const tip = [g.w / 2 - bx, g.h / 2 - by]
        c.set(tip[0], tip[1], Math.PI / 2, 1, 1, size, 0)
        split.tagAt(g.x + tip[0] + size * 0.7, g.y + tip[1] + size * 1.02)
      })
      return () => {
        alive = false
        stm?.kill()
        c?.dispose()
        cv?.remove()
      }
    })

    // Alturas da seção dependem de fontes web; remede quando carregarem.
    document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      cancelled = true
      io.disconnect()
      mm.revert()
      s3vis.innerHTML = ''
    }
  }, [rootRef, lang])
}
