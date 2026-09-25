import { useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useMarqueeDecode } from '../hooks/useMarqueeDecode'
import computerIcon from '../assets/1marqueelogo.svg'
import floppyIcon from '../assets/2marqueelogo.svg'
import cupIcon from '../assets/3marqueelogo.svg'
import papersIcon from '../assets/4marqueelogo.svg'
import phoneIcon from '../assets/5marqueelogo.svg'
import signalIcon from '../assets/6marqueelogo.svg'

// Ícone por conteúdo da frase, não pela numeração dos arquivos (que é só ordem
// de criação). Índice = posição em marquee.phrases (src/i18n/strings.js),
// igual em PT/EN por serem arrays paralelos:
// 0 café → xícara · 1 mouse → computador · 2 bug → disquete ·
// 3 "a gente refaz" → páginas empilhadas · 4 ansiedade/resposta rápida → celular vibrando ·
// 5 "só mais um ajuste" → monitor com sinal
const PHRASE_ICONS = [cupIcon, computerIcon, floppyIcon, papersIcon, phoneIcon, signalIcon]

export function Marquee() {
  const { t } = useLanguage()
  const phrases = t.marquee.phrases
  const marqueeRef = useRef(null)
  const trackRef = useRef(null)
  useMarqueeDecode(marqueeRef, trackRef, [phrases])

  // Repete o array 4 vezes para fazer o loop infinito do Marquee
  const repeatedPhrases = Array(4).fill(phrases).flat()

  return (
    <div className="marquee" ref={marqueeRef}>
      {/* Leitores de tela leem as frases uma vez, nunca os estágios da decodificação */}
      <ul className="sr-only">
        {phrases.map((phrase) => <li key={phrase}>{phrase}</li>)}
      </ul>
      <div className="marquee-track" id="marqueeTrack" ref={trackRef} aria-hidden="true">
        {repeatedPhrases.map((phrase, index) => {
          const phraseIndex = index % phrases.length
          const num = `[${String(phraseIndex + 1).padStart(2, '0')}]`
          return (
            <span className="marquee-item" key={index}>
              <span className="marquee-num" data-decode={num}>{num}</span>
              <span data-decode={phrase}>{phrase}</span>
              <img src={PHRASE_ICONS[phraseIndex]} alt="" aria-hidden="true" className="marquee-icon" />
            </span>
          )
        })}
      </div>
    </div>
  )
}
