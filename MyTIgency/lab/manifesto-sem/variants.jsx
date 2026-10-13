// LAB · variações do grupo da esquerda: cada uma troca o ornamento ASCII por
// UM elemento de interface que mostra a promessa ("sem intermediários") em vez
// de só dizê-la. NÓS, linhas, auréola e botão são os mesmos (SemGroup).
//   A · Organograma riscado — o caminho de agência comum, riscado no scroll
//   B · Conversa direta     — chat: quem responde é quem faz
//   C · Ticket              — "recibo" com os intermediários zerados
//   D · Janela de sistema   — diálogo retrô que remove os intermediários
// Movimento: A, C e D seguem o scroll (reversível, mesma janela da seta: do
// grupo entrando até o pin lateral); B é uma conversa, então acontece no tempo,
// uma vez, quando o grupo chega. Reduced motion: estado final direto (CSS).
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const docTop = (el) => {
  let y = 0
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop
  return y
}

// timeline 0..1 dirigida pelo scroll, da entrada do grupo até o pin lateral
function useScrub(ref, build) {
  useLayoutEffect(() => {
    const el = ref.current
    const root = el?.closest('.s2-group')
    if (!root) return undefined
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: () => docTop(root) - window.innerHeight * 0.85,
          end: () => docTop(root) + root.offsetHeight / 2 - window.innerHeight * 0.56,
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      })
      build(tl, (s) => el.querySelector(s), (s) => el.querySelectorAll(s))
      return () => { tl.scrollTrigger?.kill(); tl.kill() }
    })
    return () => mm.revert()
  }, [ref, build])
}

// timeline no tempo, uma vez, quando o grupo chega (mesmo gatilho do título)
function useOnce(ref, build) {
  useLayoutEffect(() => {
    const el = ref.current
    const root = el?.closest('.s2-group')
    if (!root) return undefined
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ paused: true })
      build(tl, (s) => el.querySelector(s), (s) => el.querySelectorAll(s))
      const st = ScrollTrigger.create({
        trigger: root,
        start: () => docTop(root) - window.innerHeight * 0.8,
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => tl.play(),
      })
      return () => { st.kill(); tl.kill() }
    })
    return () => mm.revert()
  }, [ref, build])
}

const T = {
  pt: {
    flowCap: 'agência comum', you: 'você', who: 'quem faz', direct: 'direto',
    middle: ['gerente de conta', 'terceirizado', 'intermediário'],
    chatHead: 'conversa direta', now: 'agora', seen: 'visto',
    order: 'pedido nº 0001', zero: '0', total: 'quem atende', us: 'NÓS', stamp: 'direto',
    win: 'remover.exe', ask: 'remover 3 intermediários do seu projeto?', removed: 'removido', no: 'não', yes: 'sim', done: 'pronto. agora é direto com a gente.',
  },
  en: {
    flowCap: 'usual agency', you: 'you', who: 'who builds it', direct: 'direct',
    middle: ['account manager', 'outsourcer', 'middleman'],
    chatHead: 'direct chat', now: 'now', seen: 'seen',
    order: 'order no. 0001', zero: '0', total: 'served by', us: 'US', stamp: 'direct',
    win: 'remove.exe', ask: 'remove 3 middlemen from your project?', removed: 'removed', no: 'no', yes: 'yes', done: 'done. now it is straight with us.',
  },
}
const tr = (lang) => T[lang] ?? T.pt

/* ------------------------- A · Organograma riscado ------------------------ */
// O caminho de uma agência comum, de cima para baixo. O scroll risca os nós do
// meio um a um e desenha o atalho vermelho: você → quem faz (o NÓS ao lado).
const buildFlow = (tl, q, qa) => {
  qa('.lv-node--mid').forEach((n, i) => {
    tl.fromTo(n, { '--strike': 0, opacity: 1 }, { '--strike': 1, opacity: 0.35, duration: 0.16 }, 0.08 + i * 0.16)
  })
  tl.fromTo(q('.lv-bypass path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.28, ease: 'sine.inOut' }, 0.6)
  tl.fromTo(q('.lv-bypass-tag'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.74)
  tl.fromTo(q('.lv-node--who'), { '--on': 0 }, { '--on': 1, duration: 0.06 }, 0.88)
}
function Flow({ lang }) {
  const ref = useRef(null)
  const c = tr(lang)
  useScrub(ref, buildFlow)
  return (
    <div className="lv lv-flow" ref={ref}>
      <span className="lv-cap">{c.flowCap}</span>
      <span className="lv-node lv-node--you">{c.you}</span>
      {c.middle.map((m) => <span className="lv-node lv-node--mid" key={m}>{m}</span>)}
      <span className="lv-node lv-node--who">{c.who}</span>
      <svg className="lv-bypass" viewBox="0 0 60 300" preserveAspectRatio="none">
        <path d="M2 18C40 18 56 40 56 150S40 282 2 282" />
      </svg>
      <span className="lv-bypass-tag">{c.direct}</span>
    </div>
  )
}

/* -------------------------- B · Conversa direta --------------------------- */
// Conversa genérica (sem nome, sem cliente real). O cliente pede; a nossa
// resposta é digitada ("…" dentro do balão) por quem faz; o cliente estranha
// a falta de intermediário; a gente confirma. Roteiros no LAB: ?roteiro=1|2|3.
export const CHAT_SCRIPTS = {
  1: {
    label: 'quem faz',
    pt: [['in', 'oi! preciso de um site novo.'], ['out', 'oi! aqui é quem vai desenhar e programar o seu site.'], ['in', 'sem gerente de conta no meio?'], ['out', 'ninguém no meio. me conta do seu negócio?']],
    en: [['in', 'hi! I need a new website.'], ['out', "hi! you're talking to who will design and code it."], ['in', 'no account manager in between?'], ['out', 'nobody in between. tell me about your business?']],
  },
  2: {
    label: 'telefone sem fio',
    pt: [['in', 'oi! preciso de um site novo.'], ['out', 'bora! fala direto com a gente: quem responde é quem faz.'], ['in', 'sério? sem repassar pra ninguém?'], ['out', 'nada de telefone sem fio. o que você conta, a gente constrói.']],
    en: [['in', 'hi! I need a new website.'], ['out', "let's go! talk straight to us: whoever answers is who builds."], ['in', 'really? not passed on to anyone?'], ['out', 'no broken telephone. what you tell us is what we build.']],
  },
  3: {
    label: 'resolvemos',
    pt: [['in', 'oi! preciso de um site novo.'], ['out', 'bora resolver. o que tá travando hoje?'], ['in', 'o site atual não traz cliente nenhum…'], ['out', 'anotado. quem desenha e quem programa já tá lendo isso.']],
    en: [['in', 'hi! I need a new website.'], ['out', "let's fix it. what's stuck right now?"], ['in', "the current site brings no clients…"], ['out', 'noted. the ones who design and code are already reading this.']],
  },
}
const chatScript = () => {
  const k = new URLSearchParams(location.search).get('roteiro')
  return CHAT_SCRIPTS[k] ? k : '2'
}

const pop = { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' }
const buildChat = (tl, q, qa) => {
  let t = 0.3
  qa('.lv-msg').forEach((m) => {
    const out = m.classList.contains('lv-msg--out')
    const text = m.querySelector('.lv-msg-text')
    const dots = m.querySelector('.lv-dots')
    gsap.set(m, { autoAlpha: 0, y: 10, scale: 0.92, transformOrigin: out ? '100% 100%' : '0% 100%' })
    if (out) {
      // balão aparece "digitando", depois troca pelo texto
      gsap.set(text, { display: 'none' })
      gsap.set(dots, { display: 'flex' })
      tl.to(m, pop, t)
      tl.set(dots, { display: 'none' }, t + 1)
      tl.set(text, { display: 'inline' }, t + 1)
      t += 1.6
    } else {
      tl.to(m, pop, t)
      t += 0.9
    }
  })
  tl.fromTo(q('.lv-seen'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t - 0.3)
}
function Chat({ lang }) {
  const ref = useRef(null)
  const c = tr(lang)
  const script = CHAT_SCRIPTS[chatScript()]
  useOnce(ref, buildChat)
  return (
    <div className="lv lv-chat" ref={ref}>
      <div className="lv-chat-head"><i />{c.chatHead}<em>{c.now}</em></div>
      <div className="lv-chat-body">
        {(script[lang] ?? script.pt).map(([who, text]) => (
          <p className={`lv-msg lv-msg--${who}`} key={text}>
            <span className="lv-msg-text">{text}</span>
            {who === 'out' && <span className="lv-dots"><i /><i /><i /></span>}
          </p>
        ))}
        <span className="lv-seen">{c.seen} ✓✓</span>
      </div>
    </div>
  )
}

/* ------------------------------- C · Ticket ------------------------------- */
// O recibo sai da impressora com o scroll (de cima para baixo); os
// intermediários vêm zerados, o total é NÓS, e no fim o carimbo.
const buildTicket = (tl, q) => {
  tl.fromTo(q('.lv-paper'), { clipPath: 'inset(0% 0% 100% 0%)', y: -30 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.7, ease: 'steps(14)' }, 0.05)
  tl.fromTo(q('.lv-stamp'), { autoAlpha: 0, scale: 1.8, rotation: -30 }, { autoAlpha: 1, scale: 1, rotation: -14, duration: 0.12, ease: 'power3.in' }, 0.8)
}
function Ticket({ lang, items }) {
  const ref = useRef(null)
  const c = tr(lang)
  useScrub(ref, buildTicket)
  return (
    <div className="lv lv-ticket" ref={ref}>
      <div className="lv-paper">
        <b className="lv-ticket-brand">MYT.</b>
        <span className="lv-ticket-meta">{c.order}</span>
        <hr />
        {items.map((it) => <span className="lv-row" key={it}><s>{it.toLowerCase()}</s><i />{c.zero}</span>)}
        <hr />
        <span className="lv-row lv-row--total"><span>{c.total}</span><i />{c.us}</span>
        <span className="lv-barcode" />
      </div>
      <span className="lv-stamp">{c.stamp}</span>
    </div>
  )
}

/* -------------------------- D · Janela de sistema ------------------------- */
// Diálogo retrô (conversa com o PC 3D e o terminal da direita): o "sim" é
// apertado, a barra corre com o scroll e cada intermediário é removido.
const buildDialog = (tl, q, qa) => {
  tl.fromTo(q('.lv-btn--yes'), { '--press': 0 }, { '--press': 1, duration: 0.05, yoyo: true, repeat: 1 }, 0.06)
  tl.fromTo(q('.lv-bar i'), { scaleX: 0 }, { scaleX: 1, duration: 0.66 }, 0.16)
  const pct = q('.lv-pct')
  const n = { v: 0 }
  tl.fromTo(n, { v: 0 }, { v: 100, duration: 0.66, onUpdate: () => { pct.textContent = `${String(Math.round(n.v)).padStart(3, '0')}%` } }, 0.16)
  qa('.lv-check').forEach((el, i) => {
    tl.fromTo(el, { '--done': 0 }, { '--done': 1, duration: 0.02 }, 0.3 + i * 0.2)
  })
  tl.fromTo(q('.lv-win-done'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.86)
  tl.fromTo(q('.lv-win-btns'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.06 }, 0.86)
}
function Dialog({ lang, items }) {
  const ref = useRef(null)
  const c = tr(lang)
  useScrub(ref, buildDialog)
  return (
    <div className="lv lv-win" ref={ref}>
      <div className="lv-win-bar"><span>{c.win}</span><i>_</i><i>×</i></div>
      <div className="lv-win-body">
        <p className="lv-win-ask"><span className="lv-warn">!</span>{c.ask}</p>
        {items.map((it) => (
          <span className="lv-check" key={it}><b /><span>{it.toLowerCase()}</span><em>{c.removed}</em></span>
        ))}
        <span className="lv-bar"><i /></span>
        <span className="lv-pct">100%</span>
        <div className="lv-win-btns"><span className="lv-btn">{c.no}</span><span className="lv-btn lv-btn--yes">{c.yes}</span></div>
        <p className="lv-win-done">{c.done}</p>
      </div>
    </div>
  )
}

// hideList/hideArrow: quando o elemento já mostra a lista "Sem …", ela e a
// seta que apontava para ela saem (sem repetir a mesma informação)
export const VARIANTS = {
  0: { label: 'Atual', El: null },
  a: { label: 'A · Organograma', El: Flow, hideArrow: true },
  b: { label: 'B · Conversa', El: Chat },
  c: { label: 'C · Ticket', El: Ticket, hideList: true, hideArrow: true },
  d: { label: 'D · Sistema', El: Dialog, hideList: true, hideArrow: true },
}
