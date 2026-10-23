// LAB — seção 6 do Manifesto (as três últimas linhas numa cena só). Base
// comum às versões:
//   · a seção 5 REAL (utils/manifestoS5.js + as classes .s5-* do App.css) no
//     estado final, a fermata — de onde a seção 6 parte;
//   · a trilha lateral do pin (1 px de scroll = 1 px de lado, como no site):
//     a primeira tela de scroll leva da fermata até a seção 6;
//   · o registro da visita (dados reais, medidos aqui, que nunca saem do
//     navegador): tempo, px rolados, caminho do cursor, pausas e a velocidade
//     do scroll ao longo do tempo;
//   · réplica dos globais do site (faixa de frases, header, grão) e o painel.
// Cada versão monta a cena dela dentro de .scene--6 e diz quanto scroll
// precisa (em alturas de tela); update(p) recebe essa posição (p em alturas
// de tela, a partir do fim do deslocamento). Reduced motion: estado final.
import Lenis from 'lenis'
import '../../src/App.css'
import './base.css'
import { mountS5 } from '../../src/utils/manifestoS5'
import { strings } from '../../src/i18n/strings'
import logoUrl from '../../src/assets/logo.svg?url'
import brushRaw from '../../src/assets/s4-brush.svg?raw'

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const ramp = (p, a, b) => clamp01((p - a) / (b - a))
export const easeOut = (t) => 1 - (1 - t) ** 3
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
export const backOut = (t) => (t <= 0 ? 0 : 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2)
export const lerp = (a, b, t) => a + (b - a) * t
export const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches
export const FINE = matchMedia('(pointer: fine)').matches
export const M = strings.pt.manifesto

// pincel do marcador: "lendo" é riscado pela mesma linha que riscou "promessas"
const BRUSH_D = brushRaw.match(/ d="([^"]+)"/)[1]
export const strikeSvg = () => `<svg class="strike" viewBox="0 0 353 19" preserveAspectRatio="none" aria-hidden="true"><path d="${BRUSH_D}"/></svg>`

// Registro da visita. Só dados medidos de verdade; ficam na memória da aba.
export const visit = {
  t0: performance.now(),
  scrolled: 0, // px rolados (somando idas e voltas)
  pointer: 0, // px percorridos pelo cursor
  taps: 0, // toques (sem cursor)
  pauses: 0, // vezes que o scroll parou depois de andar
  samples: [], // |velocidade| do scroll a cada SAMPLE_MS
}
const SAMPLE_MS = 100
const PAUSE_MS = 600
const MOVING = 0.5 // px/quadro a partir do qual o scroll "está andando"

export function mountLab({ title, links, scene, controls = '' }) {
  const $ = (s) => document.querySelector(s)
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="g-ticker mono" aria-hidden="true"><div class="g-ticker-in"></div></div>
    <div class="g-header mono" aria-hidden="true"><img alt="" /><span>Lang</span><span>Menu</span></div>
    <div class="ms-grain" aria-hidden="true"></div>
    <div class="stage"><div class="track">
      <section class="scene scene--5"><h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${esc(M.act2.b.sentence)}</h2><div class="s5" aria-hidden="true"></div></section>
      <section class="scene scene--6"></section>
    </div></div>
    <form class="panel" onsubmit="return false">
      <h1>${esc(title)}</h1>
      <button type="button" id="restart">↺ fermata</button><button type="button" id="to-end">fim ↓</button>
      <p class="phase" id="phase">—</p>
      ${controls}
      ${links.map(([href, label, on]) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}
    </form>`)

  // globais do site (réplica): logo e a faixa de frases reais
  $('.g-header img').src = logoUrl
  const phrases = strings.pt.marquee.phrases.map((p, i) => `<span><b>[0${i + 1}]</b>${esc(p)}</span>`).join('')
  $('.g-ticker-in').innerHTML = phrases + phrases

  // seção 5 real, parada na fermata (still = o estado final do site)
  const s5Host = $('.s5')
  s5Host.dataset.s5 = JSON.stringify(M.act2.b)
  const s5 = mountS5(s5Host)
  s5.still()
  // a fermata assenta sobre o ponto final (no site isso vem do measure do pin)
  const placeFermata = () => {
    const hora = s5Host.querySelector('.s5-hora')
    const last = [...hora.childNodes].reverse().find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
    if (!last) return
    const r = document.createRange()
    r.setStart(last, last.textContent.length - 1)
    r.setEnd(last, last.textContent.length)
    const b = r.getBoundingClientRect()
    const h = hora.getBoundingClientRect()
    s5Host.querySelector('.s5-fermata').style.setProperty('--fx', `${b.left + b.width / 2 - h.left}px`)
  }

  const track = $('.track')
  const host = $('.scene--6')
  const sc = scene(host)
  let vw = 0
  let vh = 0
  let total = 0
  const layout = () => {
    vw = innerWidth
    vh = innerHeight
    total = vw + sc.length * vh
    document.body.style.height = REDUCE ? '100vh' : `${total + vh}px`
    track.style.transform = ''
    placeFermata()
    sc.measure?.({ vw, vh })
  }

  const lenis = new Lenis()
  $('#restart').addEventListener('click', () => lenis.scrollTo(0, { immediate: true }))
  $('#to-end').addEventListener('click', () => lenis.scrollTo(total, { duration: 2.4 }))
  const phaseEl = $('#phase')

  // registro da visita
  let lastY = window.scrollY
  let lastSample = performance.now()
  let moving = false
  let lastMove = 0
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    if (e.movementX || e.movementY) visit.pointer += Math.hypot(e.movementX, e.movementY)
  })
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') visit.taps++ })

  function render(now) {
    const y = window.scrollY
    visit.scrolled += Math.abs(y - lastY)
    lastY = y
    const v = REDUCE ? 0 : Math.abs(lenis.velocity || 0)
    if (v > MOVING) { moving = true; lastMove = now } else if (moving && now - lastMove > PAUSE_MS) { moving = false; visit.pauses++ }
    if (now - lastSample >= SAMPLE_MS) {
      lastSample = now
      visit.samples.push(v)
      if (visit.samples.length > 3000) visit.samples.shift()
    }

    const d = REDUCE ? total : y
    const shift = Math.min(d, vw)
    track.style.transform = `translate3d(${-shift}px,0,0)`
    const p = Math.max(0, d - vw) / vh
    const phase = sc.update(p, { vw, vh, v, now, shift: shift / vw })
    phaseEl.textContent = d < vw ? `a tempo · ${Math.round((shift / vw) * 100)}%` : `${phase ?? ''} · ${p.toFixed(2)} / ${sc.length} tela`
  }

  function raf(t) { lenis.raf(t); render(t); requestAnimationFrame(raf) }
  document.fonts.ready.then(() => {
    layout()
    addEventListener('resize', layout)
    addEventListener('lab:relayout', layout) // controles do painel que mudam a composição
    requestAnimationFrame(raf)
  })
}

/** "03:42" */
export const clock = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export const fmt = (n) => Math.round(n).toLocaleString('pt-BR')
