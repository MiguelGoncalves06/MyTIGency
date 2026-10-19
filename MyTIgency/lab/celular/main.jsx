// LAB: o celular da conversa (grupo da esquerda da seção 2 do Manifesto)
// isolado, com o mesmo CSS do site (.ls-chat, .ls-msg…) e chaves para cada
// ideia. Estado padrão = o que está no site hoje (marcado com "• site").
// A sequência roda sozinha (sem scroll): "Repetir" recomeça do zero.
import { useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import '../../src/index.css'
import '../../src/App.css'
import './celular.css'

const SCRIPTS = {
  ideia3: {
    label: '3 · ideia vaga',
    site: true,
    messages: [
      ['in', 'não sei bem o que eu quero ainda'],
      ['out', 'normal! me conta do seu negócio que a gente descobre junto.'],
      ['in', 'sério?'],
      ['out', 'é a parte que a gente mais gosta.'],
    ],
  },
  ideia1: {
    label: '1 · prazo',
    messages: [
      ['in', 'quanto tempo pra ficar pronto?'],
      ['out', 'proposta em 24h. o prazo a gente fecha junto.'],
      ['in', 'e se eu quiser mudar algo?'],
      ['out', 'fala comigo. eu mesmo mudo.'],
    ],
  },
  ideia2: {
    label: '2 · sem intermediário',
    messages: [
      ['in', 'vou falar com quem depois?'],
      ['out', 'comigo. do começo ao fim.'],
      ['in', 'nada de atendente?'],
      ['out', 'nada. quem responde é quem faz.'],
    ],
  },
  ideia4: {
    label: '4 · rápido',
    messages: [
      ['in', 'oi, vocês fazem site?'],
      ['out', 'fazemos. e respondemos rápido, como agora 😉'],
    ],
  },
  antigo: {
    label: 'antigo',
    messages: [
      ['in', 'oi! preciso de um site novo.'],
      ['out', 'perfeito! em menos de 24h sua proposta tá na mão, alinhada com o que você deseja.'],
      ['in', 'sério? simples assim?'],
      ['out', 'simples assim! aqui na MYT. não buscamos complicar sua vida, eu diria que trabalhamos exatamente pelo contrário!'],
    ],
  },
  longo: {
    label: 'longo (p/ rolagem)',
    messages: [
      ['in', 'oi, vocês fazem site?'],
      ['out', 'fazemos. e respondemos rápido, como agora 😉'],
      ['in', 'não sei bem o que eu quero ainda'],
      ['out', 'normal! me conta do seu negócio que a gente descobre junto.'],
      ['in', 'vou falar com quem depois?'],
      ['out', 'comigo. do começo ao fim.'],
      ['in', 'nada de atendente?'],
      ['out', 'nada. quem responde é quem faz.'],
    ],
  },
}

// padrão = site hoje
const DEFAULTS = {
  script: 'ideia3',
  speed: 1,
  loop: false,
  buzz: true,
  kick: true,
  live: true,
  tilt: 2,
  frame: false,
  brand: false,
  composer: false,
  scroll: false,
  notify: false,
  react: false,
  glass: 'off',
  refract: false,
  wall: 'branco',
  bg: 'manifesto',
}
// mudar estas chaves não recomeça a sequência
const LIVE_KEYS = ['speed', 'tilt', 'loop']
const STORE = 'lab-celular'

// mesmo do site (useManifestoNos): o cartão só se move por variáveis CSS
const BUZZ = {
  keyframes: [[-3, -0.8], [3, 0.8], [-2.5, -0.6], [2, 0.4], [-1, -0.2], [0, 0]]
    .map(([x, r]) => ({ '--ls-x': x, '--ls-r': r, duration: 0.4 / 6, ease: 'none' })),
}

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') } } catch { return DEFAULTS }
}

function Phone({ o, onDone }) {
  const ref = useRef(null)
  const { messages } = SCRIPTS[o.script] || SCRIPTS.ideia3

  useLayoutEffect(() => {
    const root = ref.current
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const q = (s) => root.querySelector(s)
    const qa = (s) => [...root.querySelectorAll(s)]
    const chat = q('.cl-phone')
    const live = q('.ls-chat-head i')
    const body = q('.cl-body')
    const scroller = q('.cl-scroll')
    const composer = q('.cl-input')
    const input = q('.cl-input-text')
    const notif = q('.cl-notif')
    const seen = q('.ls-seen')
    const msgs = qa('.ls-msg')

    let dead = false
    const calls = []
    const wait = (s) => new Promise((res) => { calls.push(gsap.delayedCall(s, () => { if (!dead) res() })) })
    const hide = (el) => gsap.set(el, o.scroll ? { display: 'none' } : { autoAlpha: 0 })
    const show = (el) => gsap.set(el, o.scroll ? { display: '', autoAlpha: 1 } : { autoAlpha: 1 })
    // rolagem: mantém a última mensagem à vista (o resto sobe por baixo do topo)
    const follow = () => {
      if (!o.scroll) return
      const cs = getComputedStyle(body)
      const h = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      gsap.to(scroller, { y: Math.min(0, h - scroller.offsetHeight), duration: 0.45, ease: 'power3.out', overwrite: true })
    }
    const kick = () => {
      if (!o.kick) return
      gsap.timeline()
        .to(chat, { '--ls-y': -4, '--ls-lift': 3, duration: 0.1, ease: 'power2.out' })
        .to(chat, { '--ls-y': 0, '--ls-lift': 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
    }
    const type = async (s) => {
      composer.classList.add('is-typing')
      const step = Math.min(0.045, 1.6 / s.length)
      for (let i = 1; i <= s.length; i++) {
        input.textContent = s.slice(0, i)
        await wait(step)
      }
      await wait(0.25)
      input.textContent = ''
      composer.classList.remove('is-typing')
      gsap.fromTo(q('.cl-send'), { scale: 0.7 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' })
    }

    msgs.forEach(hide)
    hide(seen)
    gsap.set(qa('.cl-react'), { autoAlpha: 0 })
    if (notif) gsap.set(notif, { autoAlpha: 0, yPercent: -60 })

    async function run() {
      await wait(0.5)
      let lastIn = null
      for (const [i, m] of msgs.entries()) {
        const ours = m.classList.contains('ls-msg--out')
        if (!ours) {
          if (i === 0 && notif) {
            gsap.to(notif, { autoAlpha: 1, yPercent: 0, duration: 0.5, ease: 'back.out(1.8)' })
            if (o.buzz) gsap.to(chat, BUZZ)
            await wait(1.5)
            gsap.to(notif, { autoAlpha: 0, yPercent: -60, duration: 0.3, ease: 'power2.in' })
            await wait(0.25)
          }
          show(m)
          follow()
          gsap.fromTo(m, { y: 10, x: -14, scale: 0.92, transformOrigin: '0% 100%' },
            { y: 0, x: 0, scale: 1, duration: 0.45, ease: 'back.out(2.2)' })
          if (o.buzz) gsap.to(chat, BUZZ)
          gsap.fromTo(live, { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'power2.out' })
          lastIn = m
          await wait(0.9)
          continue
        }
        const text = m.querySelector('.ls-msg-text')
        const dots = m.querySelector('.ls-dots')
        if (o.composer) {
          // digitado no campo; ao enviar, o balão sai de lá de baixo
          await type(text.textContent)
          show(m)
          follow()
          gsap.fromTo(m, { y: 30, scale: 0.8, transformOrigin: '100% 100%' },
            { y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.7)' })
        } else {
          gsap.set(text, { display: 'none' })
          gsap.set(dots, { display: 'flex' })
          show(m)
          follow()
          gsap.fromTo(m, { y: 10, scale: 0.92, transformOrigin: '100% 100%' },
            { y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' })
          await wait(1)
          gsap.set(dots, { display: 'none' })
          gsap.set(text, { display: 'inline' })
          follow()
          gsap.fromTo(m, { scaleX: 1.06, scaleY: 0.86 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
        }
        kick()
        if (o.react && lastIn) {
          await wait(0.6)
          gsap.fromTo(lastIn.querySelector('.cl-react'), { autoAlpha: 0, scale: 0, rotation: -30 },
            { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' })
          lastIn = null
        }
        await wait(0.6)
      }
      show(seen)
      gsap.fromTo(seen, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
      follow()
      if (o.loop) {
        await wait(2.5)
        onDone()
      }
    }
    run()

    return () => {
      dead = true
      calls.forEach((c) => c.kill())
      gsap.killTweensOf([chat, ...root.querySelectorAll('*')])
    }
    // o pai remonta o Phone (key) quando a sequência deve recomeçar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="cl-wrap ls" ref={ref}>
      {o.notify && (
        <div className="cl-notif">
          <b className="cl-notif-app">{o.brand ? 'MYT' : 'conversa'}</b>
          <span>{messages[0][1]}</span>
          <em>agora</em>
        </div>
      )}
      <div
        className={`ls-chat cl-phone${o.frame ? ' is-frame' : ''}${o.live ? '' : ' no-live'}${o.scroll ? ' is-scroll' : ''}`}
        data-glass={o.glass}
        data-wall={o.wall}
        data-refract={o.refract || undefined}
        style={{ '--cl-tilt': `${o.tilt}deg` }}
      >
        <div className="cl-top">
          {o.frame && (
            <div className="cl-status">
              <span>9:41</span>
              <i className="cl-island" />
              <span className="cl-status-r"><i className="cl-bars" /><i className="cl-batt" /></span>
            </div>
          )}
          <div className="ls-chat-head">
            <i />
            {o.brand ? <>MYT <svg className="cl-seal" viewBox="-20 -20 40 40"><path d="M0-17V17M-14.7-8.5 14.7 8.5M-14.7 8.5 14.7-8.5" /></svg></> : 'conversa direta'}
            <em>agora</em>
          </div>
        </div>
        <div className="ls-chat-body cl-body">
          <div className="cl-scroll">
            {messages.map(([who, text], i) => (
              <p className={`ls-msg ls-msg--${who}`} key={i}>
                <span className="ls-msg-text">{text}</span>
                {who === 'out' && <span className="ls-dots"><i /><i /><i /></span>}
                {who === 'in' && o.react && <span className="cl-react" aria-hidden="true">❤️</span>}
              </p>
            ))}
            <span className="ls-seen">visto ✓✓</span>
          </div>
        </div>
        {o.composer && (
          <div className="cl-input">
            <span className="cl-input-text" data-ph="mensagem" />
            <b className="cl-send" aria-hidden="true">↑</b>
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ o, set, k, children, site }) {
  return (
    <button type="button" aria-pressed={!!o[k]} onClick={() => set({ [k]: !o[k] })}>
      {children}{site ? ' • site' : ''}
    </button>
  )
}

function Choice({ o, set, k, options }) {
  return (
    <div className="cl-row">
      {options.map(([v, label]) => (
        <button type="button" key={v} aria-pressed={o[k] === v} onClick={() => set({ [k]: v })}>{label}</button>
      ))}
    </div>
  )
}

function Lab() {
  const [o, setO] = useState(load)
  const [run, setRun] = useState(0)
  const set = (patch) => setO((prev) => {
    const next = { ...prev, ...patch }
    try { localStorage.setItem(STORE, JSON.stringify(next)) } catch { /* sem storage */ }
    return next
  })
  gsap.globalTimeline.timeScale(o.speed)
  const key = JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !LIVE_KEYS.includes(k)))) + run

  return (
    <div className="cl">
      <div className="cl-stage" data-bg={o.bg}>
        <Phone key={key} o={o} onDone={() => setRun((r) => r + 1)} />
      </div>
      <aside className="cl-panel">
        <h1>LAB — Celular</h1>
        <p className="cl-note">• site = o que está no site hoje. As escolhas ficam salvas neste navegador.</p>

        <section>
          <h2>Reprodução</h2>
          <div className="cl-row">
            <button type="button" className="cl-play" onClick={() => setRun((r) => r + 1)}>▶ Repetir</button>
            <Toggle o={o} set={set} k="loop">Loop</Toggle>
            <button type="button" onClick={() => setO(() => { try { localStorage.removeItem(STORE) } catch { /* */ } return DEFAULTS })}>Voltar ao site</button>
          </div>
          <label className="cl-range">velocidade
            <input type="range" min="0.5" max="2" step="0.1" value={o.speed} onChange={(e) => set({ speed: +e.target.value })} />
            <output>{o.speed.toFixed(1)}×</output>
          </label>
        </section>

        <section>
          <h2>Roteiro</h2>
          <Choice o={o} set={set} k="script" options={Object.entries(SCRIPTS).map(([k, s]) => [k, s.label + (s.site ? ' • site' : '')])} />
        </section>

        <section>
          <h2>Movimento</h2>
          <div className="cl-row">
            <Toggle o={o} set={set} k="buzz" site>Tremida ao receber</Toggle>
            <Toggle o={o} set={set} k="kick" site>Tranco ao enviar</Toggle>
            <Toggle o={o} set={set} k="live" site>Bolinha piscando</Toggle>
          </div>
          <label className="cl-range">inclinação
            <input type="range" min="-6" max="6" step="0.5" value={o.tilt} onChange={(e) => set({ tilt: +e.target.value })} />
            <output>{o.tilt}°</output>
          </label>
        </section>

        <section>
          <h2>Aparelho</h2>
          <div className="cl-row">
            <Toggle o={o} set={set} k="frame">Moldura de celular</Toggle>
            <Toggle o={o} set={set} k="brand">Cabeçalho MYT</Toggle>
            <Toggle o={o} set={set} k="composer">Campo de digitação</Toggle>
            <Toggle o={o} set={set} k="scroll">Conversa rolando</Toggle>
            <Toggle o={o} set={set} k="notify">Notificação</Toggle>
            <Toggle o={o} set={set} k="react">Reação ❤️</Toggle>
          </div>
          <p className="cl-note">Conversa rolando: use o roteiro "longo" para ver as mensagens subindo.</p>
        </section>

        <section>
          <h2>Liquid glass</h2>
          <Choice o={o} set={set} k="glass" options={[['off', 'sem vidro'], ['baloes', 'balões'], ['cabecalho', 'cabeçalho'], ['cartao', 'celular inteiro']]} />
          <div className="cl-row">
            <Toggle o={o} set={set} k="refract">Refração (só Chrome)</Toggle>
          </div>
          <h3>Papel de parede (dentro do celular)</h3>
          <Choice o={o} set={set} k="wall" options={[['branco', 'branco'], ['grid', 'grid'], ['cor', 'cor']]} />
          <h3>Fundo da página</h3>
          <Choice o={o} set={set} k="bg" options={[['manifesto', 'manifesto'], ['cor', 'colorido']]} />
          <p className="cl-note">Vidro só aparece com algo atrás: balões/cabeçalho pedem papel de parede "cor"
            (ou "conversa rolando" passando por baixo do cabeçalho); celular inteiro pede fundo "colorido".</p>
        </section>
      </aside>
      {/* refração: desloca o que está atrás do vidro (backdrop-filter: url(), só Chromium) */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="cl-refract" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="n" />
          <feGaussianBlur in="n" stdDeviation="2" result="nb" />
          <feDisplacementMap in="SourceGraphic" in2="nb" scale="38" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </div>
  )
}

import.meta.hot?.decline()

createRoot(document.getElementById('root')).render(<Lab />)
