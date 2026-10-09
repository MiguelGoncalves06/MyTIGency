import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { copyText } from '../utils/copyText'
import { submitContact } from '../utils/submitContact'
import atIcon from '../assets/contact/at.png'
import whatsappIcon from '../assets/contact/whatsapp.png'
import copyIcon from '../assets/contact/copy.png'
import seal from '../assets/MyTi.svg'
import './Contact.css'

const EMAILS = [
  { key: 'general', address: 'info@mytigency.com.br' },
  { key: 'projects', address: 'projetos@mytigency.com.br' },
]
// Endereço sugerido quando o envio falha (o formulário é de projetos)
const FALLBACK_EMAIL = 'projetos@mytigency.com.br'

const CHANNELS = { email: atIcon, whatsapp: whatsappIcon }
const DEADLINES = ['none', 'weeks', 'months', 'urgent']
const NEEDS = ['site', 'store', 'redo', 'identity', 'unsure']
// Ordem em que os obrigatórios são cobrados (e o foco vai pro primeiro pendente)
const REQUIRED = ['name', 'channel', 'deadline', 'need']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SEAL_AUTO_CLOSE_MS = 3200

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

function getInvalid(v) {
  const contact = v.channel === 'email' ? EMAIL_RE.test(v.email.trim()) : isWhatsappValid(v.whatsapp)
  return {
    name: !v.name.trim(),
    channel: !v.channel || !contact,
    deadline: !v.deadline,
    need: v.interests.length === 0 && !v.message.trim(),
  }
}

// Setas do teclado percorrem um radiogroup (com roving tabindex)
function handleRadioKeys(e, keys, select) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
  if (!step) return
  e.preventDefault()
  const i = keys.indexOf(e.currentTarget.dataset.key)
  const next = keys[(i + step + keys.length) % keys.length]
  select(next)
  e.currentTarget.closest('[role="radiogroup"]').querySelector(`[data-key="${next}"]`)?.focus()
}

// Blur só conta quando o foco sai do grupo inteiro (não ao trocar de opção)
const leftGroup = (e) => !e.currentTarget.contains(e.relatedTarget)

function Star({ className }) {
  return (
    <svg className={className} viewBox="722.99 161.49 67.01 109.02" aria-hidden="true">
      <path d="M789.99 215.51L771.28 219.28C754.81 225.72 759.11 256.43 756.5 270.51C755.56 258.92 756.03 246.89 753.55 235.45C749.96 218.88 738.1 216.92 722.99 216C738.63 214.78 749.83 213.65 753.55 196.55C756.04 185.12 755.55 173.08 756.5 161.49L758.13 186.87C760.82 208.19 767.27 216.18 790 215.51H789.99Z" />
    </svg>
  )
}

function SmallStar({ className }) {
  return (
    <svg className={className} viewBox="1172.32 204.16 14.49 23.52" aria-hidden="true">
      <path d="M1186.81 215.816L1182.76 216.629C1179.2 218.018 1180.13 224.642 1179.57 227.679C1179.36 225.179 1179.47 222.584 1178.93 220.117C1178.15 216.543 1175.59 216.12 1172.32 215.922C1175.7 215.658 1178.13 215.415 1178.93 211.726C1179.47 209.261 1179.36 206.664 1179.57 204.164L1179.92 209.639C1180.5 214.237 1181.9 215.96 1186.81 215.816H1186.81Z" />
    </svg>
  )
}

function Label({ num, htmlFor, id, required, optional, children }) {
  const Tag = htmlFor ? 'label' : 'p'
  return (
    <Tag className="ct-label" htmlFor={htmlFor} id={id}>
      <span className="ct-num" aria-hidden="true">[{num}]</span>{children}
      {optional && <> <span className="ct-muted">{optional}</span></>}
      {required && <> <span className="ct-req" aria-hidden="true">*</span></>}
    </Tag>
  )
}

function DirectEmails({ t }) {
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
    <div className="ct-direct">
      <p className="ct-direct__title">{c.direct}</p>
      <ul className="ct-direct__list">
        {EMAILS.map(({ key, address }) => (
          <li key={key}>
            <div className="ct-direct__row">
              <a className="ct-direct__email" href={`mailto:${address}`}>{address}</a>
              <button type="button" className="ct-direct__copy" onClick={() => handleCopy(address)} aria-label={`${c.copyAria} ${address}`}>
                <img src={copyIcon} alt="" />
              </button>
              {copied === address && <span className="ct-direct__copied" aria-hidden="true">{c.copied}</span>}
            </div>
            <span className="ct-direct__desc">{t.footer.labels[key]}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">{copied ? `${copied} ${c.copied}` : ''}</p>
    </div>
  )
}

export function Contact() {
  const { t, lang } = useLanguage()
  const c = t.contact
  const id = useId()
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef(null)
  const successRef = useRef(null)
  const refs = {
    name: useRef(null),
    contact: useRef(null),
    channelGroup: useRef(null),
    deadlineGroup: useRef(null),
    message: useRef(null),
  }

  const [values, setValues] = useState({
    name: '', business: '', channel: null, email: '', whatsapp: '',
    budget: '', deadline: null, interests: [], message: '',
  })
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [sealOpen, setSealOpen] = useState(false)
  const [submittedName, setSubmittedName] = useState('')
  // A bolinha do [03] só nasce com scale 0→1 na primeira escolha; depois desliza
  const firstDot = useRef(true)
  useEffect(() => {
    if (values.channel) firstDot.current = false
  }, [values.channel])

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }))
  const touch = (key) => setTouched((s) => (s[key] ? s : { ...s, [key]: true }))

  const invalid = getInvalid(values)
  const missing = REQUIRED.filter((k) => invalid[k])
  const isValid = missing.length === 0
  // Erro por campo só depois do blur (ou de uma tentativa de envio)
  const show = (key) => invalid[key] && (touched[key] || attempted)
  const contactValue = values.channel ? values[values.channel] : ''
  const contactFormatError = values.channel && contactValue && invalid.channel && (touched.channel || attempted)

  function toggleInterest(key) {
    setValues((v) => ({
      ...v,
      interests: v.interests.includes(key) ? v.interests.filter((k) => k !== key) : [...v.interests, key],
    }))
  }

  function focusField(key) {
    const target = {
      name: refs.name.current,
      channel: values.channel ? refs.contact.current : refs.channelGroup.current?.querySelector('[tabindex="0"]'),
      deadline: refs.deadlineGroup.current?.querySelector('[tabindex="0"]'),
      need: refs.message.current,
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
    try {
      await submitContact({
        name: values.name.trim(),
        business: values.business.trim(),
        channel: values.channel,
        contact: contactValue.trim(),
        budget: values.budget.trim(),
        deadline: values.deadline,
        interests: values.interests,
        message: values.message.trim(),
        lang,
      })
      setSubmittedName(values.name.trim())
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
    sectionRef.current?.animate(
      [{ transform: 'none' }, { transform: 'translate(-2px, 1px)' }, { transform: 'translate(2px, -1px)' }, { transform: 'translate(-1px, 0)' }, { transform: 'none' }],
      { duration: 180, easing: 'linear' },
    )
  }

  const reveal = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }

  return (
    <main className="contact" ref={sectionRef}>
      <div className="ct-stage">
        <div className="ct-intro">
          {/* Título igual nos dois idiomas por enquanto (decisão do Figma) */}
          <h1 className="ct-title" lang="en">
            <span className="ct-title__l1">Want to</span>
            <span className="ct-title__l2">st<i>a</i>rt</span>
            <span className="ct-title__l3"><i>a</i> new.</span>
            <span className="ct-title__l4">project?</span>
          </h1>
          <p className="ct-hello" lang="en">Or just say hello.</p>
        </div>

        {status === 'success' ? (
          <div className="ct-success" ref={successRef} tabIndex={-1}>
            <img className="ct-success__seal" src={seal} alt="" />
            <p className="ct-success__text">{c.success(submittedName, c.channel.names[values.channel])}</p>
          </div>
        ) : (
          <form className="ct-form" onSubmit={handleSubmit} noValidate>
            {/* [01] nome — a linha dele é a que cruza a linha vertical (estrela) */}
            <div className="ct-name" data-invalid={show('name') || undefined}>
              <p className="ct-num" aria-hidden="true">[01]</p>
              <label className="ct-name__q" htmlFor={`${id}-name`}>{c.name.label}</label>
              <div className="ct-line ct-line--name">
                <input
                  ref={refs.name}
                  id={`${id}-name`}
                  type="text"
                  name="name"
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={show('name') || undefined}
                  value={values.name}
                  onChange={(e) => set('name')(e.target.value)}
                  onBlur={() => touch('name')}
                />
                {!values.name && (
                  <span className="ct-name__ph" aria-hidden="true">{c.name.placeholder} <span className="ct-req">*</span></span>
                )}
                <Star className="ct-star ct-star--cross" />
                <SmallStar className="ct-star ct-star--end" />
              </div>
            </div>

            {/* [02] negócio */}
            <div className="ct-field ct-field--business">
              <Label num="02" htmlFor={`${id}-business`} optional={c.optional}>{c.business.label}</Label>
              <div className="ct-line">
                <input
                  id={`${id}-business`}
                  type="text"
                  name="business"
                  autoComplete="organization"
                  placeholder={c.business.placeholder}
                  value={values.business}
                  onChange={(e) => set('business')(e.target.value)}
                />
              </div>
            </div>

            {/* [03] canal — radiogroup + campo revelado */}
            <div className="ct-field ct-field--channel" data-invalid={show('channel') || undefined}>
              <Label num="03" id={`${id}-channel`} required>{c.channel.label}</Label>
              <div
                ref={refs.channelGroup}
                className="ct-toggle"
                role="radiogroup"
                aria-labelledby={`${id}-channel`}
                aria-required="true"
                aria-invalid={(show('channel') && !values.channel) || undefined}
                onBlur={(e) => !values.channel && leftGroup(e) && touch('channel')}
              >
                {Object.entries(CHANNELS).map(([key, icon], i) => {
                  const checked = values.channel === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      data-key={key}
                      aria-checked={checked}
                      tabIndex={checked || (!values.channel && i === 0) ? 0 : -1}
                      className="ct-toggle__opt"
                      onClick={() => set('channel')(key)}
                      onKeyDown={(e) => handleRadioKeys(e, Object.keys(CHANNELS), set('channel'))}
                    >
                      {checked && (
                        <motion.span
                          layoutId={`${id}-dot`}
                          className="ct-toggle__dot"
                          initial={reduceMotion || !firstDot.current ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <img className="ct-toggle__icon" src={icon} alt="" />
                      <span className="ct-toggle__label">{c.channel.options[key]}</span>
                    </button>
                  )
                })}
              </div>

              <AnimatePresence initial={false}>
                {values.channel && (
                  <motion.div key="reveal" className="ct-reveal" {...reveal}>
                    <div className="ct-line ct-line--reveal">
                      <input
                        key={values.channel}
                        ref={refs.contact}
                        id={`${id}-contact`}
                        type={values.channel === 'email' ? 'email' : 'tel'}
                        name={values.channel}
                        inputMode={values.channel === 'email' ? 'email' : 'tel'}
                        autoComplete={values.channel === 'email' ? 'email' : 'tel'}
                        placeholder={c.channel.fields[values.channel]}
                        aria-label={c.channel.fields[values.channel]}
                        aria-required="true"
                        aria-invalid={show('channel') || undefined}
                        aria-describedby={contactFormatError ? `${id}-contact-err` : undefined}
                        value={contactValue}
                        onChange={(e) => set(values.channel)(values.channel === 'whatsapp' ? maskWhatsapp(e.target.value) : e.target.value)}
                        onBlur={() => touch('channel')}
                      />
                    </div>
                    {contactFormatError && (
                      <p className="ct-error" id={`${id}-contact-err`}>{c.channel.errors[values.channel]}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* [04] investimento */}
            <div className="ct-field ct-field--budget">
              <Label num="04" htmlFor={`${id}-budget`} optional={c.optional}>{c.budget.label}</Label>
              <div className="ct-line">
                <input
                  id={`${id}-budget`}
                  type="text"
                  name="budget"
                  placeholder={c.budget.placeholder}
                  value={values.budget}
                  onChange={(e) => set('budget')(e.target.value)}
                />
              </div>
            </div>

            {/* [05] prazo — radiogroup de pílulas */}
            <div className="ct-field ct-field--deadline" data-invalid={show('deadline') || undefined}>
              <Label num="05" id={`${id}-deadline`} required>{c.deadline.label}</Label>
              <div
                ref={refs.deadlineGroup}
                className="ct-pills"
                role="radiogroup"
                aria-labelledby={`${id}-deadline`}
                aria-required="true"
                aria-invalid={show('deadline') || undefined}
                onBlur={(e) => leftGroup(e) && touch('deadline')}
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

            {/* [06] o que busca — chips (múltiplos) + texto livre; basta um dos dois */}
            <div
              className="ct-field ct-field--need"
              data-invalid={show('need') || undefined}
              onBlur={(e) => leftGroup(e) && touch('need')}
            >
              <Label num="06" id={`${id}-need`} required>{c.need.label}</Label>
              <div className="ct-chips" role="group" aria-labelledby={`${id}-need`}>
                {NEEDS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="ct-chip"
                    data-key={key}
                    aria-pressed={values.interests.includes(key)}
                    onClick={() => toggleInterest(key)}
                  >
                    {c.need.options[key]}
                  </button>
                ))}
              </div>
              <div className="ct-msg">
                <textarea
                  ref={refs.message}
                  name="message"
                  data-lenis-prevent
                  aria-labelledby={`${id}-need`}
                  aria-invalid={show('need') || undefined}
                  placeholder={c.need.placeholder}
                  value={values.message}
                  onChange={(e) => set('message')(e.target.value)}
                />
              </div>
            </div>

            <div className="ct-legal">
              <p>
                {c.privacy}
                {/* Página de política ainda não existe */}
                <a className="ct-legal__link" href="#">{c.privacyLink}</a>
              </p>
              <p>
                {c.whoReads[0]}<b>{c.whoReads[1]}</b>{c.whoReads[2]}<b>{c.whoReads[3]}</b>{c.whoReads[4]}<strong>{c.whoReads[5]}</strong>
              </p>
            </div>

            <div className="ct-submit">
              <p className="ct-status" aria-live="polite">
                {attempted && !isValid && c.missing(missing.length)}
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
                {status === 'sending'
                  ? <span className="ct-send__label">{c.sending}</span>
                  : <><span className="ct-send__label">{c.submit}</span> <span className="ct-send__prompt">&gt;_</span></>}
              </button>
            </div>
          </form>
        )}

        <DirectEmails t={t} />

        <span className="ct-vline" aria-hidden="true" />
        <span className="ct-hline" aria-hidden="true" />
        <Star className="ct-star ct-star--bottom" />
      </div>

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
