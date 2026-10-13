// LAB da seção 3: cada protótipo recebe o palco fixo e o progresso do
// scroll (0..1) da sua própria trilha. Hash na URL guarda a escolha (#p3).
import { loadLayers } from './angel.js'
import { PROTOS } from './protos.js'

const $ = (s) => document.querySelector(s)
const stage = $('#stage')
const track = $('#track')
const nav = $('#nav')
let active = null
let layers = null
let token = 0

PROTOS.forEach((p, i) => {
  const b = document.createElement('button')
  b.textContent = `${i + 1} · ${p.name}`
  b.dataset.id = p.id
  b.onclick = () => select(p.id)
  nav.append(b)
})
$('#info-toggle').onclick = () => {
  const info = $('#info')
  info.classList.toggle('closed')
  $('#info-toggle').textContent = info.classList.contains('closed') ? '+' : '—'
}

async function select(id) {
  const p = PROTOS.find((x) => x.id === id) || PROTOS[0]
  const my = ++token
  active?.inst?.dispose?.()
  active = null
  stage.innerHTML = ''
  track.style.height = `${p.scrollVh + 100}vh`
  window.scrollTo(0, 0)
  for (const b of nav.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.id === p.id))
  $('#info-name').textContent = p.name
  $('#info-ref').textContent = p.ref
  $('#info-desc').innerHTML = p.desc
  history.replaceState(null, '', `#${p.id}`)
  const inst = await p.mount(stage, { layers })
  if (my !== token) { inst?.dispose?.(); return }
  stage.insertAdjacentHTML('beforeend', '<div class="grid" aria-hidden="true"></div>')
  active = { p, inst }
  onScroll()
}

function onScroll() {
  if (!active) return
  const max = track.offsetHeight - innerHeight
  const prog = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
  $('#prog').style.width = `${prog * 100}%`
  active.inst?.update?.(prog)
}
addEventListener('scroll', onScroll, { passive: true })
addEventListener('resize', () => select(active?.p.id))
addEventListener('hashchange', () => { if (location.hash.slice(1) !== active?.p.id) select(location.hash.slice(1)) })

await Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('400 40px Italiana')])
await document.fonts.ready
layers = await loadLayers()
select(location.hash.slice(1))
