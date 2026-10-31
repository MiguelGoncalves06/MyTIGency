import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../context/LanguageContext'
import { useSkipState, skipGo, manifestoSeen } from '../utils/manifestoSkip'

// Pular o Manifesto: fixo na ponta direita da régua, da seção 1 até a câmera
// inclinar para a folha (quem decide é o pin — utils/manifestoSkip.js). Uma
// ferramenta, não um convite a pular: na 1ª visita um aviso discreto aparece uma
// vez; quem já chegou ao cartaz vê o botão cheio, com o destino no texto.
// No body: dentro do Manifesto, o fixed ficaria preso aos transforms do painel.
const HINT_MS = 6000

export function ManifestoSkip() {
  const { t } = useLanguage()
  const s = t.skip
  const { visible, mode } = useSkipState()
  const [seen] = useState(manifestoSeen) // lido ao montar: quem acabou de ver só muda na próxima visita
  const [hint, setHint] = useState(false)
  const [said, setSaid] = useState('')
  const hinted = useRef(false)
  const wrapRef = useRef(null)
  const btnRef = useRef(null)

  // o aviso da 1ª visita: uma vez, quando o botão aparece pela primeira vez (o prazo
  // não depende do modo: trocar de modo cancelava o prazo e o aviso ficava na tela)
  const hintTimer = useRef(0)
  useEffect(() => {
    if (seen || !visible || mode !== 'skip' || hinted.current) return
    hinted.current = true
    setHint(true)
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS)
  }, [seen, visible, mode])
  useEffect(() => () => clearTimeout(hintTimer.current), [])

  // a régua encurta para o botão caber na ponta dela (App.css → .ms-ruler)
  useEffect(() => {
    const root = document.documentElement
    const btn = btnRef.current
    if (!visible || !btn) { root.style.removeProperty('--skip-w'); return undefined }
    const ro = new ResizeObserver(() => root.style.setProperty('--skip-w', `${btn.offsetWidth + 16}px`))
    ro.observe(btn)
    return () => { ro.disconnect(); root.style.removeProperty('--skip-w') }
  }, [visible])

  // o anúncio some depois de lido (o próximo salto anuncia de novo)
  useEffect(() => {
    if (!said) return undefined
    const id = setTimeout(() => setSaid(''), 4000)
    return () => clearTimeout(id)
  }, [said])

  const back = mode === 'back'
  const label = back ? s.back : seen ? s.toWork : s.skip
  const onClick = async () => {
    setHint(false)
    const r = btnRef.current.getBoundingClientRect()
    const done = await skipGo(mode, [r.left + r.width / 2, r.top + r.height / 2])
    if (done) setSaid(back ? s.announceBack : s.announce)
  }

  return createPortal(
    <>
      <div ref={wrapRef} className={['ms-skip', visible && 'on', seen && 'is-seen'].filter(Boolean).join(' ')} aria-hidden={visible ? undefined : true}>
        <p className={`ms-skip-hint${hint && !back ? ' on' : ''}`} aria-hidden="true">{s.hint}</p>
        <button ref={btnRef} type="button" className="ms-skip-btn" onClick={onClick} tabIndex={visible ? 0 : -1}>
          <span className="ms-skip-arrow" aria-hidden="true">{back ? '↑' : '→'}</span>
          <span>{label}</span>
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{said}</p>
    </>,
    document.body,
  )
}
