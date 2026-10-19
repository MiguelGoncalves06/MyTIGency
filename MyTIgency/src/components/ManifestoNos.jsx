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

// Aro (com o brilho e as estrelinhas), sublinhado e seta: traços do Figma
// (preenchimento, não stroke) — a entrada os revela com um "wipe" de
// clip-path (useManifestoNos).
import haloSrc from '../assets/s2-halo.svg'
import underSrc from '../assets/s2-under.svg'
import arrowSrc from '../assets/s2-arrow.svg'

// Estrela vermelha acima do NÓS: o "brilho" do kit (icone-brilho.svg).
const SPARK_D = 'M0-28C3.92-3.92 3.92-3.92 28 0 3.92 3.92 3.92 3.92 0 28-3.92 3.92-3.92 3.92-28 0-3.92-3.92-3.92-3.92 0-28Z'

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
        <img className="ls-halo" src={haloSrc} alt="" />
        <svg className="ls-spark" viewBox="-28 -28 56 56" preserveAspectRatio="none"><path d={SPARK_D} /></svg>
        <i className="ls-cross ls-cross--a" />
        <i className="ls-cross ls-cross--b" />
        <span className="ls-big"><b>{big}</b></span>
        <span className="ls-lines">
          {lines.map((l) => <span className="ls-line" key={l}><span><b>{l}</b></span></span>)}
        </span>
        <img className="ls-under" src={underSrc} alt="" />
        <svg className="ls-star" viewBox="-20 -20 40 40">
          <path d="M0-17V17M-14.7-8.5 14.7 8.5M-14.7 8.5 14.7-8.5" />
        </svg>
        <span className="ls-no">
          {items.map((item) => <DecodeItem key={item} text={`${no} ${item}.`} className="s2-item ls-item" />)}
        </span>
        <svg className="ls-play" viewBox="0 0 84 30">
          {[0, 28, 56].map((x) => <path key={x} d={`M${x} 0h6v4h4v4h4v4h4v6h-4v4h-4v4h-4v4h-6z`} />)}
        </svg>
        {/* Conversa genérica (sem nome de cliente) num celular: as nossas
            respostas são digitadas no campo de baixo e sobem como balão
            (useManifestoNos); padrão = conversa inteira, campo vazio. */}
        <div className="ls-chat">
          <div className="ls-chat-top">
            <div className="ls-status">
              <span>9:41</span>
              <i className="ls-island" />
              <span className="ls-status-r"><i className="ls-bars" /><i className="ls-batt" /></span>
            </div>
            <div className="ls-chat-head"><i />{chat.head} <b>&gt;_</b><em>{chat.now}</em></div>
          </div>
          <div className="ls-chat-body">
            <div className="ls-chat-scroll">
              {chat.messages.map(([who, text]) => (
                <p className={`ls-msg ls-msg--${who}`} key={text}>{text}</p>
              ))}
              <span className="ls-seen">{chat.seen} ✓✓</span>
            </div>
          </div>
          <div className="ls-input">
            <span className="ls-input-text" data-ph={chat.placeholder} />
            <b className="ls-send">↑</b>
          </div>
        </div>
        {/* Seta à mão: entra pela borda, faz a laçada embaixo da conversa e
            sobe reta até a ponta aberta, junto do asterisco — sem passar por
            baixo do card (que vai até y≈428). viewBox = coordenadas do grupo. */}
        <img className="ls-arrow" src={arrowSrc} alt="" />
      </div>
      {/* Botão = recipiente que enche em pixels (useManifestoS2Enter) */}
      <span className="s2-cue">
        <span className="s2-cue-label">
          {cue}
          <span className="s2-cue-arrow" aria-hidden="true" />
        </span>
        {/* recorte em pixels do preenchimento: useManifestoS2Enter reescreve
            o path a cada quadro (padrão = cheio) */}
        <svg className="s2-cue-clip" aria-hidden="true" width="0" height="0">
          <clipPath id="s2-cue-clip" clipPathUnits="objectBoundingBox"><path d="M0 0H1V1H0z" /></clipPath>
        </svg>
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
