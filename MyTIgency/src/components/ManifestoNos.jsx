// Grupo da esquerda da seção 2 do Manifesto: "NÓS / conversamos e resolvemos
// tudo.", a prova miúda "Sem …" (mono) e a conversa direta (chat) — a promessa
// mostrada, não só dita. Validado no LAB (lab/manifesto-sem/, variação B).
// Mantém as classes-âncora do grupo anterior (s2-group--without, s2-item,
// s2-cue): useManifestoS2Enter dirige o decoder dos itens e o botão que enche;
// o pin lateral mede .s2-group. Motion: useManifestoNos. Posições em px de
// design (--g), como o resto da seção 2 (App.css → "Manifesto · seção 2").
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useManifestoNos } from '../hooks/useManifestoNos'
import { DecodeText } from './DecodeText'

// Auréola: elipse feita à mão, ~1,16 volta (o fim passa por cima do começo e
// as duas voltas não coincidem — o traço duplo). Um path só, para a caneta
// (drawSVG) desenhar de uma vez. viewBox 340×110.
const HALO_D = (() => {
  const pts = []
  for (let i = 0; i <= 140; i++) {
    const u = i / 140
    const a = Math.PI * 1.08 + u * 1.16 * Math.PI * 2 // começa à esquerda
    const grow = 1 + u * 0.07 // a 2ª volta abre um pouco
    pts.push(`${(170 + Math.cos(a) * 160 * grow).toFixed(1)} ${(56 + Math.sin(a) * 44 * grow - u * 6).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
})()
// Estrela y2k: 4 pontas com lados bem côncavos; k = quão fina fica a ponta.
const starD = (rx, ry, k) => {
  const c = (x, y) => `${(x * k).toFixed(2)} ${(y * k).toFixed(2)}`
  return `M0 ${-ry}C${c(rx, -ry)} ${c(rx, -ry)} ${rx} 0C${c(rx, ry)} ${c(rx, ry)} 0 ${ry}`
    + `C${c(-rx, ry)} ${c(-rx, ry)} ${-rx} 0C${c(-rx, -ry)} ${c(-rx, -ry)} 0 ${-ry}Z`
}
const SPARK_D = starD(46, 58, 0.1)
const GLINT_D = starD(38, 48, 0.035)

// Item "Sem …": entra com o mesmo decoder da Header quando
// useManifestoS2Enter dispara 's2:decode' nele (até lá fica escondido).
export function DecodeItem({ text, className }) {
  const ref = useRef(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const el = ref.current
    const onDecode = () => setActive(true)
    el.addEventListener('s2:decode', onDecode)
    return () => el.removeEventListener('s2:decode', onDecode)
  }, [])
  return <DecodeText ref={ref} value={text} active={active} className={className} />
}

export function NosGroup() {
  const { t } = useLanguage()
  const { big, lines, no, items, sentence, cue, chat } = t.manifesto.without
  const ref = useRef(null)
  useManifestoNos(ref)

  return (
    <div className="s2-group s2-group--without ls" ref={ref}>
      <h3 className="sr-only">{sentence}</h3>
      <div className="ls-art" aria-hidden="true">
        <svg className="ls-halo" viewBox="0 0 340 110" preserveAspectRatio="none"><path d={HALO_D} /></svg>
        {/* vermelha cortando a ponta direita da auréola; preta e fina sobre o acento */}
        <svg className="ls-spark" viewBox="-50 -60 100 120"><path d={SPARK_D} /></svg>
        <svg className="ls-glint" viewBox="-40 -50 80 100"><path d={GLINT_D} /></svg>
        <i className="ls-cross ls-cross--a" />
        <i className="ls-cross ls-cross--b" />
        <span className="ls-big"><b>{big}</b></span>
        <span className="ls-lines">
          {lines.map((l) => <span className="ls-line" key={l}><span><b>{l}</b></span></span>)}
        </span>
        <svg className="ls-under" viewBox="0 0 260 30" preserveAspectRatio="none">
          {/* passada e volta do pincel, abaixo da linha de base (sem encostar nas letras) */}
          <path className="ls-under-a" d="M4 20C80 13 170 8 256 5" />
          <path className="ls-under-b" d="M236 10C170 15 100 20 26 26" />
        </svg>
        <svg className="ls-star" viewBox="-20 -20 40 40">
          <path d="M0-17V17M-14.7-8.5 14.7 8.5M-14.7 8.5 14.7-8.5" />
        </svg>
        <span className="ls-no">
          {items.map((item) => <DecodeItem key={item} text={`${no} ${item}.`} className="s2-item ls-item" />)}
        </span>
        <svg className="ls-play" viewBox="0 0 84 30">
          {[0, 28, 56].map((x) => <path key={x} d={`M${x} 0h6v4h4v4h4v4h4v6h-4v4h-4v4h-4v4h-6z`} />)}
        </svg>
        {/* Conversa genérica (sem nome de cliente): o "…" dentro dos nossos
            balões é trocado pelo texto (useManifestoNos); padrão = texto. */}
        <div className="ls-chat">
          <div className="ls-chat-head"><i />{chat.head}<em>{chat.now}</em></div>
          <div className="ls-chat-body">
            {chat.messages.map(([who, text]) => (
              <p className={`ls-msg ls-msg--${who}`} key={text}>
                <span className="ls-msg-text">{text}</span>
                {who === 'out' && <span className="ls-dots"><i /><i /><i /></span>}
              </p>
            ))}
            <span className="ls-seen">{chat.seen} ✓✓</span>
          </div>
        </div>
        {/* Seta (papel do antigo traço B): entra pela borda, faz a laçada e
            segue reta até o asterisco da lista */}
        <svg className="ls-arrow" viewBox="0 0 300 210">
          <path className="ls-arrow-body" d="M-30 146C20 134 84 114 98 120C112 128 54 178 24 198C10 207 8 200 28 190L290 42" />
          <path className="ls-arrow-head" d="M256 44 290 42 268 70" />
        </svg>
      </div>
      {/* Botão = recipiente que enche (useManifestoS2Enter) */}
      <span className="s2-cue">
        <span className="s2-cue-label">
          {cue}
          <span className="s2-cue-arrow" aria-hidden="true" />
        </span>
        <span className="s2-cue-fill" aria-hidden="true">
          <span className="s2-cue-label">
            {cue}
            <span className="s2-cue-arrow" />
          </span>
        </span>
      </span>
    </div>
  )
}
