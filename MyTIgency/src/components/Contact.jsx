import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { copyText } from '../utils/copyText'
import { submitContact } from '../utils/submitContact'
import { usePrevLabelHeld } from '../utils/pageTransition'
import { DecodeText } from './DecodeText'
import copyIcon from '../assets/contact/copy.png'
import fotoThiago from '../assets/contact/foto-thiago.jpg'
import fotoMiguel from '../assets/contact/foto-miguel.jpg'
import seal from '../assets/MyTi.svg'
import './Contact.css'

// Página de contato — "V2 em linha", escolhida no laboratório
// (lab/contato/index.html, ?v=3) depois do teste com usuário: título C1
// (colagem serifada + mono), formulário primeiro e os e-mails depois.

const EMAILS = [
  { key: 'general', address: 'info@mytigency.com.br' },
  { key: 'projects', address: 'projetos@mytigency.com.br' },
]
// Endereço sugerido quando o envio falha (o formulário é de projetos)
const FALLBACK_EMAIL = 'projetos@mytigency.com.br'

// "Ícones" tipográficos: o sinal já diz o que digitar
const CHANNELS = { email: '@', whatsapp: '+55' }
const DEADLINES = ['none', 'weeks', 'months', 'urgent']
const NEEDS = ['site', 'store', 'redo', 'identity', 'unsure']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SEAL_AUTO_CLOSE_MS = 3200
// "construir_" é digitado sem pressa; a frase da direita colore no mesmo tempo
const TYPE_DELAY_MS = 350
const TYPE_STEP_MS = 190

// ---------- ajuda do e-mail (completar provedor / corrigir digitação) ----------
const POPULAR = ['gmail.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'yahoo.com.br']
const KNOWN = [...POPULAR, 'yahoo.com', 'live.com', 'msn.com', 'uol.com.br', 'bol.com.br', 'terra.com.br']

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  }
  return d[a.length][b.length]
}

// Sem "@" ou com provedor pela metade → opções para completar; provedor
// conhecido com até 2 letras trocadas → sugestão de correção; senão nada.
function emailHelp(raw) {
  const v = raw.trim()
  if (!v) return null
  const at = v.indexOf('@')
  if (at < 0) return { kind: 'complete', options: POPULAR.map((d) => `${v}@${d}`) }
  const local = v.slice(0, at)
  const dom = v.slice(at + 1).toLowerCase()
  if (!local) return null
  if (!dom.includes('.')) {
    const opts = POPULAR.filter((d) => d.startsWith(dom))
    return opts.length ? { kind: 'complete', options: opts.map((d) => `${local}@${d}`) } : null
  }
  if (KNOWN.includes(dom)) return null
  let best = null
  let bd = 3
  for (const k of KNOWN) {
    const dist = lev(dom, k)
    if (dist < bd) { bd = dist; best = k }
  }
  return best ? { kind: 'typo', options: [`${local}@${best}`] } : null
}

// checagem mínima da lógica acima (só em dev, aparece no console se quebrar)
if (import.meta.env.DEV) {
  console.assert(emailHelp('ana').options[0] === 'ana@gmail.com', 'emailHelp: sem @')
  console.assert(emailHelp('ana@h').options[0] === 'ana@hotmail.com', 'emailHelp: provedor parcial')
  console.assert(emailHelp('ana@gmial.com')?.kind === 'typo', 'emailHelp: digitação')
  console.assert(emailHelp('ana@gmail.com') === null && emailHelp('ana@empresa.com.br') === null, 'emailHelp: válidos')
}

// Máscara brasileira (31) 9 0000-0000. Começando com "+", vira número
// internacional livre (o site também fala com quem está fora do Brasil).
function maskWhatsapp(raw) {
  if (raw.startsWith('+')) return '+' + raw.slice(1).replace(/[^\d ]/g, '')
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  let out = '(' + d.slice(0, 2)
  if (d.length > 2) out += ') ' + d[2]
  if (d.length > 3) out += ' ' + d.slice(3, 7)
  if (d.length > 7) out += '-' + d.slice(7)
  return out
}

function isWhatsappValid(value) {
  const digits = value.replace(/\D/g, '').length
  return value.startsWith('+') ? digits >= 8 && digits <= 15 : digits === 11
}

// O que falta, na ordem dos campos (o foco vai para o primeiro)
function getMissing(v) {
  const miss = []
  if (!v.name.trim()) miss.push('name')
  const email = v.email.trim()
  const wa = v.whatsapp.trim()
  const emailOk = v.channels.includes('email') && EMAIL_RE.test(email)
  const waOk = v.channels.includes('whatsapp') && isWhatsappValid(wa)
  if (!v.channels.length) miss.push('channel')
  else if (!emailOk && !waOk) {
    if (v.channels.includes('email') && email) miss.push('email')
    if (v.channels.includes('whatsapp') && wa) miss.push('whatsapp')
    if (!email && !wa) miss.push('channel')
  } else {
    // um canal válido basta, mas o outro marcado e mal preenchido também é cobrado
    if (v.channels.includes('email') && email && !emailOk) miss.push('email')
    if (v.channels.includes('whatsapp') && wa && !waOk) miss.push('whatsapp')
  }
  if (!v.deadline) miss.push('deadline')
  if (!v.interests.length && !v.message.trim()) miss.push('need')
  return miss
}

const listJoin = (items, and) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}`)

// Setas do teclado percorrem o radiogroup do prazo (roving tabindex)
function handleRadioKeys(e, keys, select) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
  if (!step) return
  e.preventDefault()
  const i = keys.indexOf(e.currentTarget.dataset.key)
  const next = keys[(i + step + keys.length) % keys.length]
  select(next)
  e.currentTarget.closest('[role="radiogroup"]').querySelector(`[data-key="${next}"]`)?.focus()
}

const esc = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function Star({ className }) {
  return (
    <svg className={className} viewBox="722.99 161.49 67.01 109.02" aria-hidden="true">
      <path d="M789.99 215.51L771.28 219.28C754.81 225.72 759.11 256.43 756.5 270.51C755.56 258.92 756.03 246.89 753.55 235.45C749.96 218.88 738.1 216.92 722.99 216C738.63 214.78 749.83 213.65 753.55 196.55C756.04 185.12 755.55 173.08 756.5 161.49L758.13 186.87C760.82 208.19 767.27 216.18 790 215.51H789.99Z" />
    </svg>
  )
}

// "a" em itálico dentro da palavra (Vamos, algo) — o mesmo gesto do título antigo
function ItalicA({ word }) {
  const i = word.indexOf('a')
  if (i < 0) return word
  return <>{word.slice(0, i)}<i>a</i>{word.slice(i + 1)}</>
}

// ---------- título C1: "Vamos [construir_] algo incrível ✦ juntos [fotos]." ----------
function Title({ c }) {
  const reduceMotion = useReducedMotion()
  // No celular a frase não cabe em duas linhas: vira escada (4 linhas)
  const stair = useMediaQuery('(max-width: 700px)')
  const word = c.title.code
  const [typed, setTyped] = useState(reduceMotion ? word : '')
  // Chegando pela cortina de dither, as animações do título só começam
  // quando a revelação começa (o mesmo sinal que solta o rótulo do header);
  // abrindo a página direto, começam já.
  const start = !usePrevLabelHeld()
  // a frase da direita precisa nascer cinza e só depois ganhar a classe —
  // com a classe já no primeiro frame não há transição (nasceria colorida)
  const [inked, setInked] = useState(false)
  useEffect(() => {
    if (!start) return undefined
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setInked(true)) })
    return () => cancelAnimationFrame(raf)
  }, [start])

  // "construir" é digitado letra a letra, devagar (uma vez por montagem/idioma)
  useEffect(() => {
    if (reduceMotion) { setTyped(word); return undefined }
    setTyped('')
    if (!start) return undefined
    let i = 0
    let timer = setTimeout(function tick() {
      i += 1
      setTyped(word.slice(0, i))
      if (i < word.length) timer = setTimeout(tick, TYPE_STEP_MS)
    }, TYPE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [word, reduceMotion, start])

  const code = (
    <span className="ct-code">
      <span>{typed}</span>
      <span className="ct-code__caret">_</span>
    </span>
  )
  const star = <Star className="ct-tstar" />
  const faces = (
    <span className="ct-faces">
      <img src={fotoThiago} alt="" />
      <img src={fotoMiguel} alt="" />
    </span>
  )
  const lines = stair
    ? [
        <span key="a"><ItalicA word={c.title.a} /></span>,
        <span key="b" className="ct-t-s1">{code}</span>,
        <span key="c" className="ct-t-s2"><ItalicA word={c.title.b} /> <i>{c.title.c}</i>{star}</span>,
        <span key="d" className="ct-t-s3">{c.title.d}{faces}.</span>,
      ]
    : [
        <span key="a"><ItalicA word={c.title.a} /> {code} <ItalicA word={c.title.b} /></span>,
        <span key="b" className="ct-t-s1"><i>{c.title.c}</i>{star} {c.title.d}{faces}.</span>,
      ]

  return (
    <div className="ct-intro">
      <div className="ct-intro__title">
        <h1 className="ct-title">
          <span className="sr-only">{c.title.full}</span>
          <span aria-hidden="true">
            {lines.map((line) => <span key={line.key} className="ct-title__line">{line}</span>)}
          </span>
        </h1>
        {/* mesmo decoder do header/menu */}
        <DecodeText as="p" className="ct-hello" value={c.hello} active={start && !reduceMotion} />
      </div>
      {/* começa cinza e vai se colorindo, no mesmo tempo do "construir_" */}
      <p
        className={`ct-aside${inked ? ' is-on' : ''}`}
        style={{ '--ink-ms': `${TYPE_DELAY_MS + word.length * TYPE_STEP_MS + 900}ms` }}
      >
        {c.aside}
      </p>
    </div>
  )
}

function EmailRows({ t }) {
  const c = t.contact
  const [copied, setCopied] = useState(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  function handleCopy(address) {
    copyText(address)
    setCopied(address)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="ct-rows">
      {EMAILS.map(({ key, address }) => (
        <div className="ct-row" key={key}>
          <h2 className="ct-row__label">{t.footer.labels[key]}</h2>
          <a className="ct-row__mail" href={`mailto:${address}`}>{address}</a>
          <span className="ct-row__copy">
            <button type="button" className="ct-copy" onClick={() => handleCopy(address)} aria-label={`${c.copyAria} ${address}`}>
              <img src={copyIcon} alt="" />
            </button>
            {copied === address && <span className="ct-copied" aria-hidden="true">{c.copied}</span>}
          </span>
        </div>
      ))}
      <p className="sr-only" aria-live="polite">{copied ? `${copied} ${c.copied}` : ''}</p>
    </div>
  )
}

export function Contact() {
  const { t, lang } = useLanguage()
  const c = t.contact
  const id = useId()
  const reduceMotion = useReducedMotion()
  const pageRef = useRef(null)
  const successRef = useRef(null)
  const nameRef = useRef(null)
  const channelsRef = useRef(null)
  const emailRef = useRef(null)
  const waRef = useRef(null)
  const deadlineRef = useRef(null)
  const messageRef = useRef(null)
  const highlightRef = useRef(null)

  const [values, setValues] = useState({
    name: '', business: '', channels: [], email: '', whatsapp: '',
    budget: '', deadline: null, interests: [], message: '',
  })
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [sealOpen, setSealOpen] = useState(false)
  const [submitted, setSubmitted] = useState({ name: '', channels: [] })
  // A caixa só segura a roda do mouse quando tem texto para rolar. Com
  // data-lenis-prevent fixo, a caixa vazia (overscroll-behavior: contain do
  // Lenis) engolia a roda e a página travava com o mouse em cima dela.
  const [msgScrolls, setMsgScrolls] = useState(false)

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }))
  const touch = (key) => setTouched((s) => (s[key] ? s : { ...s, [key]: true }))

  const missing = getMissing(values)
  const isValid = missing.length === 0
  // Campo pendente só fica vermelho depois do blur ou de uma tentativa de envio
  const show = (key) => missing.includes(key) && (touched[key] || attempted)
  const help = values.channels.includes('email') ? emailHelp(values.email) : null

  function toggleChannel(ch) {
    const on = !values.channels.includes(ch)
    setValues((v) => ({ ...v, channels: on ? [...v.channels, ch] : v.channels.filter((k) => k !== ch) }))
    if (on) requestAnimationFrame(() => (ch === 'email' ? emailRef : waRef).current?.focus({ preventScroll: true }))
  }

  // Opção do [06]: marca e escreve a frase na caixa (cursor no fim); ao
  // desmarcar, tira a frase só se ela ainda estiver intacta.
  function toggleInterest(key) {
    const on = !values.interests.includes(key)
    const phrase = c.need.phrases[key]
    let message = values.message
    if (on) {
      message = message + (message && !message.endsWith('\n') ? '\n' : '') + phrase
    } else {
      const lines = message.split('\n')
      const at = lines.indexOf(phrase)
      if (at >= 0) { lines.splice(at, 1); message = lines.join('\n') }
    }
    setValues((v) => ({ ...v, message, interests: on ? [...v.interests, key] : v.interests.filter((k) => k !== key) }))
    if (on) {
      requestAnimationFrame(() => {
        const ta = messageRef.current
        if (!ta) return
        ta.focus({ preventScroll: true })
        ta.setSelectionRange(ta.value.length, ta.value.length)
        ta.scrollTop = ta.scrollHeight
      })
    }
  }

  // Camada espelho atrás do textarea: pinta de vermelho as frases intactas
  const highlighted = (() => {
    let html = esc(values.message)
    values.interests.forEach((k) => {
      const ph = esc(c.need.phrases[k])
      html = html.split(ph).join(`<mark>${ph}</mark>`)
    })
    return html + (values.message.endsWith('\n') ? ' ' : '')
  })()
  useEffect(() => {
    const ta = messageRef.current
    if (!ta) return
    if (highlightRef.current) highlightRef.current.scrollTop = ta.scrollTop
    setMsgScrolls(ta.scrollHeight > ta.clientHeight + 1)
  }, [values.message])

  function focusField(key) {
    const target = {
      name: nameRef.current,
      channel: channelsRef.current?.querySelector('button'),
      email: emailRef.current,
      whatsapp: waRef.current,
      deadline: deadlineRef.current?.querySelector('[tabindex="0"]'),
      need: messageRef.current,
    }[key]
    target?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'sending') return
    if (!isValid) {
      setAttempted(true)
      focusField(missing[0])
      return
    }
    setStatus('sending')
    const email = values.channels.includes('email') && EMAIL_RE.test(values.email.trim()) ? values.email.trim() : ''
    const whatsapp = values.channels.includes('whatsapp') && isWhatsappValid(values.whatsapp) ? values.whatsapp.trim() : ''
    try {
      await submitContact({
        name: values.name.trim(),
        business: values.business.trim(),
        email,
        whatsapp,
        budget: values.budget.trim(),
        deadline: values.deadline,
        interests: values.interests,
        message: values.message.trim(),
        lang,
      })
      setSubmitted({ name: values.name.trim(), channels: [whatsapp && 'whatsapp', email && 'email'].filter(Boolean) })
      setStatus('success')
      setSealOpen(true)
    } catch {
      setStatus('error')
    }
  }

  const closeSeal = useCallback(() => setSealOpen(false), [])
  useEscapeKey(closeSeal, sealOpen)
  useEffect(() => {
    if (!sealOpen) return undefined
    const timer = setTimeout(closeSeal, SEAL_AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [sealOpen, closeSeal])
  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
  }, [status])

  // Tremor mínimo da página no impacto do carimbo
  function shake() {
    if (reduceMotion) return
    pageRef.current?.animate(
      [{ transform: 'none' }, { transform: 'translate(-2px, 1px)' }, { transform: 'translate(2px, -1px)' }, { transform: 'translate(-1px, 0)' }, { transform: 'none' }],
      { duration: 180, easing: 'linear' },
    )
  }

  const reveal = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }

  const num = (n) => <span className="ct-num" aria-hidden="true">[{n}]</span>
  const req = <span className="ct-req" aria-hidden="true">*</span>

  return (
    <main className="contact" ref={pageRef}>
      <Title c={c} />

      <section className="ct-formblock" aria-labelledby={`${id}-fill`}>
        <h2 className="ct-formblock__label" id={`${id}-fill`}>{c.fill}</h2>

        {status === 'success' ? (
          <div className="ct-success" ref={successRef} tabIndex={-1}>
            <img className="ct-success__seal" src={seal} alt="" />
            <p className="ct-success__text">
              {c.success(submitted.name, submitted.channels.map((k) => c.channel.names[k]).join(c.channelsOr))}
            </p>
          </div>
        ) : (
          <form className="ct-form" onSubmit={handleSubmit} noValidate>
            {/* [01] nome */}
            <div className="ct-field" data-invalid={show('name') || undefined}>
              <label className="ct-label" htmlFor={`${id}-name`}>{num('01')} {c.name.label} {req}</label>
              <div className="ct-line">
                <input
                  ref={nameRef}
                  id={`${id}-name`}
                  className="ct-input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={show('name') || undefined}
                  placeholder={c.name.placeholder}
                  value={values.name}
                  onChange={(e) => set('name')(e.target.value)}
                  onBlur={() => touch('name')}
                />
              </div>
            </div>

            {/* [02] negócio */}
            <div className="ct-field">
              <label className="ct-label" htmlFor={`${id}-business`}>{num('02')} {c.business.label} <span className="ct-opt">{c.optional}</span></label>
              <div className="ct-line">
                <input
                  id={`${id}-business`}
                  className="ct-input"
                  type="text"
                  name="business"
                  autoComplete="organization"
                  placeholder={c.business.placeholder}
                  value={values.business}
                  onChange={(e) => set('business')(e.target.value)}
                />
              </div>
            </div>

            {/* [03] canais — caixas de marcação (um ou os dois) + campo de cada canal */}
            <div className="ct-field" data-invalid={(show('channel') || show('email') || show('whatsapp')) || undefined}>
              <p className="ct-label" id={`${id}-channels`}>{num('03')} {c.channel.label} {req} <span className="ct-opt">{c.both}</span></p>
              <div className="ct-toggle" role="group" aria-labelledby={`${id}-channels`} ref={channelsRef}>
                {Object.entries(CHANNELS).map(([key, sign]) => (
                  <button
                    key={key}
                    type="button"
                    role="checkbox"
                    aria-checked={values.channels.includes(key)}
                    className="ct-ch"
                    onClick={() => toggleChannel(key)}
                    onBlur={() => touch('channel')}
                  >
                    <svg className="ct-ch__box" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.2 9.4l3.2 3.1 6.4-7" /></svg>
                    <b className="ct-ch__sign" aria-hidden="true">{sign}</b>
                    {c.channel.options[key]}
                  </button>
                ))}
              </div>

              <AnimatePresence initial={false}>
                {values.channels.includes('email') && (
                  <motion.div key="email" className="ct-reveal" {...reveal}>
                    <div className="ct-line" data-invalid={show('email') || undefined}>
                      <input
                        ref={emailRef}
                        className="ct-input"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        name="email"
                        aria-label={c.channel.aria.email}
                        aria-invalid={show('email') || undefined}
                        placeholder={c.channel.fields.email}
                        value={values.email}
                        onChange={(e) => set('email')(e.target.value)}
                        onBlur={() => touch('email')}
                      />
                    </div>
                    {help && (
                      <div className="ct-sugg">
                        {help.kind === 'typo' ? (
                          <>
                            <span>{c.emailHelp.typo}</span>
                            <button type="button" onClick={() => { set('email')(help.options[0]); emailRef.current?.focus() }}>{help.options[0]}</button>
                            <span>{c.emailHelp.typoEnd}</span>
                          </>
                        ) : (
                          <>
                            <span>{c.emailHelp.complete}</span>
                            {help.options.map((o) => (
                              <button key={o} type="button" onClick={() => { set('email')(o); emailRef.current?.focus() }}>@{o.split('@')[1]}</button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
                {values.channels.includes('whatsapp') && (
                  <motion.div key="whatsapp" className="ct-reveal" {...reveal}>
                    <div className="ct-line" data-invalid={show('whatsapp') || undefined}>
                      <input
                        ref={waRef}
                        className="ct-input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        name="whatsapp"
                        aria-label={c.channel.aria.whatsapp}
                        aria-invalid={show('whatsapp') || undefined}
                        placeholder={c.channel.fields.whatsapp}
                        value={values.whatsapp}
                        onChange={(e) => set('whatsapp')(maskWhatsapp(e.target.value))}
                        onBlur={() => touch('whatsapp')}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* [04] investimento — texto livre ("50 mil" vale) */}
            <div className="ct-field">
              <label className="ct-label" htmlFor={`${id}-budget`}>{num('04')} {c.budget.label} <span className="ct-opt">{c.optional}</span></label>
              <div className="ct-line">
                <input
                  id={`${id}-budget`}
                  className="ct-input"
                  type="text"
                  name="budget"
                  placeholder={c.budget.placeholder}
                  value={values.budget}
                  onChange={(e) => set('budget')(e.target.value)}
                />
              </div>
            </div>

            {/* [05] prazo — escolha única */}
            <div className="ct-field ct-field--full" data-invalid={show('deadline') || undefined}>
              <p className="ct-label" id={`${id}-deadline`}>{num('05')} {c.deadline.label} {req}</p>
              <div
                ref={deadlineRef}
                className="ct-pills"
                role="radiogroup"
                aria-labelledby={`${id}-deadline`}
                aria-required="true"
                onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && touch('deadline')}
              >
                {DEADLINES.map((key, i) => {
                  const checked = values.deadline === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      data-key={key}
                      aria-checked={checked}
                      tabIndex={checked || (!values.deadline && i === 0) ? 0 : -1}
                      className="ct-pill"
                      onClick={() => set('deadline')(key)}
                      onKeyDown={(e) => handleRadioKeys(e, DEADLINES, set('deadline'))}
                    >
                      {c.deadline.options[key]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* [06] o que busca — opções (viram frase na caixa) + texto livre */}
            <div className="ct-field ct-field--full" data-invalid={show('need') || undefined}>
              <p className="ct-label" id={`${id}-need`}>{num('06')} {c.need.label} {req}</p>
              <div className="ct-chips" role="group" aria-labelledby={`${id}-need`}>
                {NEEDS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="ct-chip"
                    aria-pressed={values.interests.includes(key)}
                    onClick={() => toggleInterest(key)}
                  >
                    {c.need.options[key]}
                  </button>
                ))}
              </div>
              <div className="ct-msg">
                {/* só texto escapado + <mark> (frases prontas em vermelho) */}
                <div className="ct-msg__hl" ref={highlightRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlighted }} />
                <textarea
                  ref={messageRef}
                  className="ct-msg__ta"
                  name="message"
                  data-lenis-prevent={msgScrolls || undefined}
                  aria-labelledby={`${id}-need`}
                  aria-invalid={show('need') || undefined}
                  placeholder={c.need.placeholder}
                  value={values.message}
                  onChange={(e) => set('message')(e.target.value)}
                  onBlur={() => touch('need')}
                  onScroll={(e) => { if (highlightRef.current) highlightRef.current.scrollTop = e.currentTarget.scrollTop }}
                />
              </div>
            </div>

            <div className="ct-legal ct-field--full">
              <p>
                {c.privacy}{' '}
                {/* Página de política ainda não existe */}
                <a className="ct-legal__link" href="#">{c.privacyLink}</a>
              </p>
              <p>
                {c.whoReads[0]}<b>{c.whoReads[1]}</b>{c.whoReads[2]}<b>{c.whoReads[3]}</b>{c.whoReads[4]}<strong>{c.whoReads[5]}</strong>
              </p>
            </div>

            <div className="ct-submit ct-field--full">
              <p className="ct-status" aria-live="polite">
                {attempted && !isValid && c.missingPrefix + listJoin(missing.map((k) => c.missing[k]), c.and) + '.'}
                {status === 'error' && (
                  <span className="ct-status__error">
                    {c.error}<a href={`mailto:${FALLBACK_EMAIL}`}>{FALLBACK_EMAIL}</a>
                  </span>
                )}
              </p>
              <button
                type="submit"
                className="ct-send"
                aria-disabled={!isValid || status === 'sending'}
                aria-busy={status === 'sending' || undefined}
              >
                <span className="ct-send__label">{status === 'sending' ? c.sending : c.submit}</span>
                <span className="ct-send__prompt" aria-hidden="true">&gt;_</span>
              </button>
            </div>
          </form>
        )}
      </section>

      <EmailRows t={t} />

      {/* Selo: só existe na animação de sucesso, nunca em erro */}
      <AnimatePresence>
        {sealOpen && (
          <motion.div
            className="ct-seal-overlay"
            role="button"
            tabIndex={-1}
            aria-label={c.closeSeal}
            onClick={closeSeal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.img
              className="ct-seal"
              src={seal}
              alt=""
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -18 }}
              animate={{ opacity: 1, scale: 1, rotate: -8 }}
              transition={reduceMotion ? { duration: 0.3 } : { duration: 0.3, ease: [0.55, 0, 0.9, 0.35] }}
              onAnimationComplete={shake}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
