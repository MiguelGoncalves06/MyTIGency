// LAB: pin lateral da seção 2 do site (mesma lógica de useManifestoHorizontal)
// com a seção 3 trocada pelo "Split + cursor 3D". O cursor da busca
// (set:mytigency.com) vira o cursor 3D: na seção 2 ele é um cursor de
// interface (chapado, inclinado como o SVG); no pin lateral ele "clica e
// solta" e percorre UM caminho só (motion path, como nas refs de objeto que
// viaja entre seções): desce da busca até o fim do traço A, pega a ponta e,
// como caneta, desenha o resto até o centro da seção 3, onde assenta em 3/4.
//   · velocidade constante no comprimento do caminho + uma easing só no
//     trajeto inteiro (sem parar no meio);
//   · rotação pela tangente com amortecimento e inclinação na curva;
//   · tamanho interpolado em escala geométrica (cresce em ritmo constante).
import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { LINE_A_EXT, LINE_A_JOIN, LINE_A_LEN } from '../../../src/utils/manifestoLineA'
import { introPinDuration, lineAPen } from '../../../src/utils/manifestoScroll'
import { DESKTOP_QUERY } from '../../../src/hooks/useManifestoHorizontal'
import { mountCursor3D } from '../cursor3d.js'
import { splitScene, curve, stroke, ramp } from '../protos.js'
import { warpBrush } from './brushWarp.js'
import { polishSplit } from './s3Polish.js'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)

const START_EARLY = 0.06 // = site
// = caneta do traço A (useManifestoIntro, 1.2): com scrubs diferentes, rolando
// rápido o cursor chegava em J antes do traço (ou o traço passava dele)
const SCRUB = 1.2
const TV_TURN = 1.6 // = site
const TV_TURN_END_AT = 0.2
const TV_TUNE_AT = 0.42
const turnEase = gsap.parseEase('sine.inOut')
// Seção 3 nova: uma tela (100vw), logo depois da caixa de busca.
const S3_GAP_VW = 0.06
const HOLD_VH = 1.1 // scroll parado com a seção 3 centrada (palavras, marca)
// Trajeto do cursor (em px de scroll dentro do pin):
const GO_AT = 0.16 // sai da busca a 16% do percurso lateral
const DRAW_END_HOLD = 0.35 // chega a 35% do scroll parado
const PRESS = 0.05 // "clique" antes de soltar (fração do percurso lateral)
// giro da TV (rad, somado aos 0.6 do 3/4 de repouso do tv3d)
const TURN_FRONT = -0.6 // de frente
const TURN_LEFT = 0.38 // quanto começa virada para a esquerda
const TURN_RIGHT = 0.38 // até onde vai para a direita no fim (sutil)
const RIGHT_SPAN = 0.22 // scroll (fração do percurso lateral) do giro para a direita
// Esbarrão no PC: ponto de impacto (frações do canvas da TV) e tranco do cursor (px)
const EDGE_Y = 0.3 // linha (fração da altura do PC) onde o cursor encosta na borda direita do monitor
const BUMP_PX = 22 // recuo do cursor no impacto (px)
const BOOT_SPAN = 0.42 // duração do boot (fração do percurso lateral); o logo fica com o final, mais lento
// ponta na busca: logo depois da lupa, na borda de baixo da caixa (frações do texto/caixa)
const START = { textX: 0.04, boxY: 0.86 }
const PICK_AFTER_VW = 0.16 // o cursor pega o traço A a 16vw à direita da ponta na busca
const SIZE_IN_SEARCH = 1.6 // altura do cursor / altura da caixa de busca
const BRUSH_GAIN = 1.25 // o pincel engrossa até 125% no fim (a seção 3 é maior)
const sineIO = (t) => (1 - Math.cos(Math.PI * t)) / 2
const sineIOinv = (v) => Math.acos(1 - 2 * v) / Math.PI
const smooth = (t) => t * t * (3 - 2 * t)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const TAU = Math.PI * 2

export function useLabHorizontal(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const q = (s) => root.querySelector(s)
    const track = q('.ms-track')
    const ms2 = q('.ms2')
    const groups = root.querySelectorAll('.s2-group')
    const lineLow = q('.s2-line-a')
    const guides = root.querySelectorAll('.la-guide')
    const s3 = q('.s3x')
    const tvCanvas = q('.s2-tv')
    const searchBox = q('.s2-search-box')
    const searchCursor = q('.s2-search-cursor')
    const searchText = q('.s2-search-text')
    const search = q('.s2-search') // useManifestoS2Enter anima o x dele (entrada)
    if (!track || !ms2 || !lineLow || !s3 || !searchBox || !searchCursor || !searchText) return undefined
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y }
    const boxIn = (el) => {
      let x = 0, y = 0
      for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight }
    }
    const startY = () => {
      let top = Infinity, bottom = -Infinity
      groups.forEach((g) => { top = Math.min(top, g.offsetTop); bottom = Math.max(bottom, g.offsetTop + g.offsetHeight) })
      return docTop(ms2) + (top + bottom) / 2 - innerHeight * (0.5 + START_EARLY)
    }
    const pinAt = () => startY() + introPinDuration()

    let travelA = 0, scrollB = 0, vw = 1, vh = 1, tvCx = 0, tvF0 = 1
    let sHit = -1, prevS = -1, bumpAt = -1e9, bumpDir = 1, hitN = [1, 0]
    let s3Left = 0, s3Top = 0, dGo = 0, dEnd = 0, rootDoc = 0, T = [0, 0], st = null
    let J = [0, 0], Jdir = [1, 0], pickS = 0, artScale = 1
    function layout() {
      vh = innerHeight
      vw = innerWidth
      const sb = boxIn(searchBox)
      s3Left = sb.x + sb.w + vw * S3_GAP_VW
      s3Top = startY() - docTop(root)
      rootDoc = docTop(root)
      root.style.setProperty('--s3-left', `${s3Left}px`)
      root.style.setProperty('--s3-top', `${s3Top}px`)
      travelA = s3Left
      scrollB = vh * HOLD_VH
      dGo = travelA * GO_AT
      dEnd = travelA + scrollB * DRAW_END_HOLD
      // O traço A do site segue pela extensão até um ponto à DIREITA da busca
      // (PICK_AFTER_VW): ali o cursor o pega — assim ele só anda para frente.
      const line = boxIn(lineLow) // SVG 2135×1216
      const sx = line.w / 2135, sy = line.h / 1216
      const at = ([u, v]) => [line.x + u * sx, line.y + v * sy]
      const pickX = startIn(boxIn(searchBox), boxIn(searchText))[0] + vw * PICK_AFTER_VW
      const ext = [LINE_A_JOIN, ...LINE_A_EXT]
      let lenAll = 0, lenTo = -1
      for (let i = 1; i < ext.length; i++) {
        const seg = Math.hypot(ext[i][0] - ext[i - 1][0], ext[i][1] - ext[i - 1][1])
        const a = at(ext[i - 1]), b = at(ext[i])
        if (lenTo < 0 && b[0] >= pickX) {
          const f = Math.max(0, Math.min(1, (pickX - a[0]) / (b[0] - a[0])))
          J = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
          const n = Math.hypot(b[0] - a[0], b[1] - a[1])
          Jdir = [(b[0] - a[0]) / n, (b[1] - a[1]) / n]
          lenTo = lenAll + seg * f
        }
        lenAll += seg
      }
      if (lenTo < 0) { lenTo = lenAll; J = at(ext[ext.length - 1]) }
      pickS = lenTo
      // a máscara do traço A usa pincel redondo de 40 unid.: a ponta dele vai 20
      // além do fim do drawSVG — termina 20 antes para a arte parar exatamente em J
      lineAPen.frac = (LINE_A_LEN + lenTo - 20) / (LINE_A_LEN + lenAll)
      lineAPen.end = pinAt() + travelA * 0.4 // provisório; buildExt() acerta com o caminho
      if (reduced) gsap.set(guides, { drawSVG: `${lineAPen.frac * 100}%` })
      artScale = sx
      root.style.setProperty('--ms-travel', `${travelA}px`)
      if (tvCanvas) {
        const tvBox = boxIn(tvCanvas)
        tvCx = tvBox.x + tvBox.w / 2
        tvF0 = Math.max(TV_TURN_END_AT + 0.1, tvCx / vw)
      }
      buildExt()
    }

    /* ---------- seção 3 (split) + traço novo + cursor ---------- */
    let split = null, pol = null, cur = null, ext = null, sF = 200, s0 = 40, F = [0, 0], cancelled = false
    let L = 1, L1 = 1
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'lab-ext')
    // pincel (arte do traço A deformada) revelado por uma máscara de caneta,
    // como o traço A do site; motion/seg1 são só geometria (invisíveis)
    svg.innerHTML = '<defs><mask id="lab-brush-mask" maskUnits="userSpaceOnUse" x="-20000" y="-20000" width="60000" height="60000">'
      // ponta reta (butt): a redonda avançava meia espessura além da cabeça e o
      // traço aparecia na frente da ponta do cursor
      + '<path fill="none" stroke="#fff" stroke-linecap="butt" stroke-linejoin="round"/></mask></defs>'
      + '<path fill="#FF4438" mask="url(#lab-brush-mask)"/><path fill="none"/><path fill="none"/>'
    track.append(svg)
    // marca de impacto do esbarrão: riscos vermelhos curtos que se abrem e somem
    const impact = document.createElement('div')
    impact.className = 'lab-impact'
    impact.innerHTML = '<svg viewBox="-50 -50 100 100">'
      + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-16" x2="0" y2="-34" transform="rotate(${a})"/>`).join('') + '</svg>'
    track.append(impact)
    const extPath = svg.querySelector('mask path')
    const [, brushArt, motion, seg1] = svg.children
    const canvas = Object.assign(document.createElement('canvas'), { className: 'lab-cursor' })
    document.body.append(canvas)
    // ponta do cursor na busca (caixas em px: trilha sem transforms, ou tela)
    const startIn = (box, text) => [text.x + text.w * START.textX, box.y + box.h * START.boxY]
    function buildExt() {
      if (!split || !cur) return
      const gap = (() => { const a = split.q('.ts-c').getBoundingClientRect(), b = s3.getBoundingClientRect(); return { x: a.left - b.left, w: a.width } })()
      sF = Math.min(gap.w * 0.78, vh * 0.3)
      const [bx, by] = cur.body(sF)
      F = [s3Left + gap.x + gap.w / 2 - bx, s3Top + vh / 2 - by]
      T = startIn(boxIn(searchBox), boxIn(searchText))
      // Esbarrão de verdade: G = borda direita REAL do monitor (raycast na
      // malha, numa linha a EDGE_Y da altura do PC), medida com o giro que a
      // TV terá no instante do toque. O trecho 1 passa por G: a ponta do
      // cursor encosta no monitor ali, e é ali que o esbarrão dispara.
      const findEdge = (turn) => {
        const tv = tvCanvas?.tv
        const pb = tv?.projBox?.(turn)
        if (!pb) return null
        const tb = boxIn(tvCanvas)
        const yRow = pb.y + pb.h * EDGE_Y
        for (let x = pb.x + pb.w; x > pb.x; x -= 3) if (tv.hit(x, yRow, turn)) return [tb.x + x, tb.y + yRow]
        return null
      }
      const c3 = [J[0] + Jdir[0] * vw * 0.35, J[1] + Jdir[1] * vw * 0.35]
      const c4 = [F[0], F[1] + vh * 0.5]
      // trecho 1: T → (G) → J, tangente contínua; devolve o comprimento até G
      const buildSeg1 = (G) => {
        if (!G) {
          const c1 = [T[0] + vw * 0.06, T[1] + vh * 0.12] // para frente, longe da TV
          const c2 = [J[0] - Jdir[0] * vw * 0.12, J[1] - Jdir[1] * vw * 0.12]
          seg1.setAttribute('d', curve(T, c1, c2, J))
          return -1
        }
        const dTG = Math.hypot(G[0] - T[0], G[1] - T[1]), dGJ = Math.hypot(J[0] - G[0], J[1] - G[1])
        const dir = [(J[0] - G[0]) / dGJ, (J[1] - G[1]) / dGJ]
        const a1 = [T[0], T[1] + dTG * 0.4] // sai da busca descendo
        const a2 = [G[0] - dir[0] * dTG * 0.4, G[1] - dir[1] * dTG * 0.4]
        seg1.setAttribute('d', curve(T, a1, a2, G))
        const lenG = seg1.getTotalLength()
        const b1 = [G[0] + dir[0] * dGJ * 0.35, G[1] + dir[1] * dGJ * 0.35]
        const b2 = [J[0] - Jdir[0] * Math.min(vw * 0.12, dGJ * 0.4), J[1] - Jdir[1] * Math.min(vw * 0.12, dGJ * 0.4)]
        seg1.setAttribute('d', curve(T, a1, a2, G, b1, b2, J))
        return lenG
      }
      // duas passadas: o giro no toque depende de onde o toque cai no caminho
      let lenG = -1
      let sGuess = 0.06
      for (let pass = 0; pass < 2; pass++) {
        const dTouch = dGo + sineIOinv(Math.min(1, Math.max(0, sGuess))) * (dEnd - dGo)
        lenG = buildSeg1(findEdge(turnAt(dTouch)))
        L1 = seg1.getTotalLength()
        const segD = seg1.getAttribute('d')
        motion.setAttribute('d', `${segD}${curve(J, c3, c4, F).slice(1 + String(J).length)}`)
        L = motion.getTotalLength()
        if (lenG < 0) break
        sGuess = lenG / L
      }
      sHit = lenG > 0 ? lenG / L : -1
      if (sHit > 0) {
        // direção do cursor no toque e marca de impacto no ponto de contato
        const h0 = motion.getPointAtLength(lenG - 4), h1 = motion.getPointAtLength(lenG + 4), hp = motion.getPointAtLength(lenG)
        const hl = Math.hypot(h1.x - h0.x, h1.y - h0.y) || 1
        hitN = [(h1.x - h0.x) / hl, (h1.y - h0.y) / hl]
        Object.assign(impact.style, { left: `${hp.x}px`, top: `${hp.y}px` })
      }
      extPath.setAttribute('stroke-width', 70 * artScale * BRUSH_GAIN) // cobre a arte inteira
      ext = stroke(extPath, curve(J, c3, c4, F))
      brushArt.setAttribute('d', warpBrush(extPath, pickS, artScale, BRUSH_GAIN))
      // o traço A do site chega em J no instante em que o cursor passa por ali
      lineAPen.end = pinAt() + dGo + sineIOinv(L1 / L) * (dEnd - dGo)
      s0 = searchBox.offsetHeight * SIZE_IN_SEARCH
      // etiqueta "nós dois" junto ao corpo do cursor assentado (px do palco)
      pol?.tagAt(F[0] - s3Left + sF * 0.7, F[1] - s3Top + sF * 1.02)
      apply()
    }
    const progress = (d) => sineIO(ramp(d, dGo, dEnd)) // fração do comprimento do caminho
    // giro da TV em função do scroll: segura de frente só enquanto o logo
    // entra (boot 0.60–1) e logo depois vira para a direita (RIGHT_SPAN)
    function turnAt(d) {
      const b0 = dGo - travelA * PRESS, span = travelA * BOOT_SPAN
      const frontIn = b0 + span * 0.58, frontOut = b0 + span * 0.97 // de frente durante o logo (0.60–1)
      return d < frontIn
        ? TURN_FRONT - TURN_LEFT * (1 - smooth(ramp(d, 0, frontIn)))
        : TURN_FRONT + TURN_RIGHT * smooth(ramp(d, frontOut, frontOut + travelA * RIGHT_SPAN))
    }
    ;(async () => {
      const box = Math.round(innerWidth * 0.2)
      split = await splitScene(s3, '<i class="t2-gap"></i>', box, '', 'sticker') // pílula da Sobreposição
      if (cancelled) return
      split.q('.route')?.remove() // o traço aqui é o da trilha (.lab-ext)
      pol = polishSplit(s3, split)
      // tick roda DENTRO do quadro do cursor (antes de renderizar): sem um
      // segundo rAF, o cursor não fica um quadro atrás do traço
      cur = await mountCursor3D(canvas, { size: 40, before: tick })
      if (cancelled) { cur.dispose(); return }
      ScrollTrigger.refresh() // remede com o caminho pronto (lineAPen.end)
    })()

    const proxy = { d: 0 }
    function apply() {
      const d = proxy.d
      const x = -Math.min(d, travelA)
      gsap.set(track, { x })
      const tv = tvCanvas?.tv
      if (tv && !reduced) {
        const t = Math.min(1, Math.max(0, (tvF0 - (tvCx + x) / vw) / (tvF0 - TV_TURN_END_AT)))
        // Giro contrário ao avanço da página: começa virada para a ESQUERDA,
        // chega DE FRENTE quando o logo entra na tela e segura de frente
        // durante a varredura dele; depois só um pouco para a direita.
        // (rotação = 0.6 + giro: −0.6 = de frente, menor = esquerda.)
        if (tv.setBoot) {
          tv.setTurn(turnAt(d))
        } else tv.setTurn(-TV_TURN * turnEase(t))
        tv.setShift(x)
        // A busca liga o PC: a tela fica desligada (cursor de espera) até o
        // cursor 3D clicar na busca (PRESS, logo antes de soltar); daí o
        // boot de CRT corre com o scroll até o logo, enquanto o PC ainda está
        // na tela. Sem chiado de sintonia (o boot substitui).
        if (tv.setBoot) {
          tv.setTune(1)
          tv.setBoot(ramp(d, dGo - travelA * PRESS, dGo + travelA * BOOT_SPAN))
        } else tv.setTune(t / TV_TUNE_AT)
      }
      // a seção 3 entra pela direita enquanto a trilha anda: rótulos digitam,
      // DESENHA é desenhada, PROGRAMA compila; com o cursor assentado, seleção
      // (Figma) e inspeção (DevTools), carimbo e etiqueta; por último a nota
      pol?.update({
        kickL: ramp(d, travelA - vw * 0.85, travelA - vw * 0.6),
        desenha: ramp(d, travelA - vw * 0.8, travelA - vw * 0.25),
        kickR: ramp(d, travelA - vw * 0.7, travelA - vw * 0.45),
        programa: ramp(d, travelA - vw * 0.6, travelA - vw * 0.05),
        crop: ramp(d, travelA - vw * 0.5, travelA),
        sel: ramp(d, dEnd - scrollB * 0.02, dEnd + scrollB * 0.2),
        inspect: ramp(d, dEnd + scrollB * 0.1, dEnd + scrollB * 0.3),
        mark: ramp(d, dEnd + scrollB * 0.22, dEnd + scrollB * 0.42),
        tag: ramp(d, dEnd + scrollB * 0.32, dEnd + scrollB * 0.45),
        note: ramp(d, dEnd + scrollB * 0.42, travelA + scrollB * 0.95),
      })
      ext?.set(Math.max(0, (progress(d) * L - L1) / (L - L1)))
    }

    // Cursor a cada quadro, sem ler layout (getBoundingClientRect forçava
    // recálculo de estilo logo depois do GSAP escrever os transforms): a
    // posição da trilha na tela vem do y do pin + o x dela.
    function tick(now) {
      if (!ext || !st) return
      const d = proxy.d
      const s = progress(d)
      // Esbarrão: ao cruzar o ponto mais rente ao monitor (em qualquer sentido
      // do scroll), o PC recebe um impulso proporcional à velocidade e balança
      // na base com peso; o cursor dá um tranco curto para o lado oposto.
      if (sHit > 0 && prevS >= 0 && (prevS - sHit) * (s - sHit) < 0) {
        bumpDir = Math.sign(s - prevS)
        tvCanvas?.tv?.bump?.(bumpDir * Math.min(1.2, 0.45 + Math.abs(s - prevS) * 40))
        bumpAt = now
        impact.classList.remove('on'); void impact.offsetWidth; impact.classList.add('on') // reinicia a marca
      }
      prevS = s
      const age = (now - bumpAt) / 1000
      // recuo: quica para trás da direção em que vinha (mola amortecida),
      // achata e dá um giro rápido
      const hitK = age < 1.4 ? Math.exp(-age * 6) : 0
      const jolt = hitK * Math.sin(age * 26 + 0.5) * BUMP_PX * bumpDir
      const squash = 1 - 0.2 * (age < 1 ? Math.exp(-age * 10) : 0)
      const spin = hitK * Math.sin(age * 20) * 0.45 * bumpDir
      const y = window.scrollY
      // y do pin (transform) que o GSAP aplicou no bloco — soma o pin de entrada
      // da seção 1 e o lateral; lido do cache do GSAP, sem recalcular estilo
      const trTop = rootDoc - y + gsap.getProperty(root, 'y')
      const trLeft = gsap.getProperty(track, 'x')
      const click = gsap.getProperty(searchCursor, 'scale')
      const press = 1 - 0.14 * Math.sin(Math.PI * ramp(d, dGo - travelA * PRESS, dGo + travelA * 0.015))
      // escala geométrica: cada trecho cresce a mesma proporção (sem "estourar" no fim)
      const size = s0 * (sF / s0) ** smooth(ramp(s, 0.08, 0.95)) * press * (s > 0 ? 1 : click) * squash
      // até pegar o traço (trecho 1): continua cursor de interface e gira aos
      // poucos, no sentido horário, até apontar na direção do traço em J — sem
      // virar a ponta para baixo na descida
      const w = smooth(clamp01((s * L) / L1))
      const settle = Math.max(1 - w, smooth(ramp(s, 0.88, 1)))
      const flat = 1 - w
      const aimJ = cur.aimFor(Math.atan2(-Jdir[1], Jdir[0]))
      const aim = s * L < L1 ? cur.flatZ + (((aimJ - cur.flatZ) % TAU) - TAU) % TAU * w : null
      if (s <= 0) {
        cur.set(trLeft + T[0] + gsap.getProperty(search, 'x'), trTop + T[1], Math.PI / 2, 1, 1, size, 1)
        return
      }
      const a = motion.getPointAtLength(s * L)
      const p0 = motion.getPointAtLength(Math.max(0, s * L - 6)), p1 = motion.getPointAtLength(Math.min(L, s * L + 6))
      pol?.cursor(trLeft + a.x, trTop + a.y)
      cur.set(trLeft + a.x - hitN[0] * jolt, trTop + a.y - hitN[1] * jolt, Math.atan2(p0.y - p1.y, p1.x - p0.x), settle, 1, size, flat, aim === null ? null : aim + spin)
    }

    const mm = gsap.matchMedia()
    mm.add(DESKTOP_QUERY, () => {
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
          pinType: 'transform',
          scrub: SCRUB,
          invalidateOnRefresh: true,
          refreshPriority: -1,
          onRefreshInit: layout,
          onRefresh: apply,
        },
      }).scrollTrigger
      return () => {
        gsap.set(track, { clearProps: 'transform' })
        lineAPen.end = 0
        tvCanvas?.tv?.setTurn(0)
        tvCanvas?.tv?.setTune(1)
      }
    })
    // TV pronta: remede (a borda real do monitor entra no caminho do cursor)
    const onTvReady = () => ScrollTrigger.refresh()
    tvCanvas?.addEventListener('s2:tv-ready', onTvReady)
    tvCanvas?.addEventListener('tv3d:loaded', onTvReady)
    document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      cancelled = true
      tvCanvas?.removeEventListener('s2:tv-ready', onTvReady)
      tvCanvas?.removeEventListener('tv3d:loaded', onTvReady)
      mm.revert()
      cur?.dispose()
      canvas.remove()
      svg.remove()
      impact.remove()
    }
  }, [rootRef])
}
