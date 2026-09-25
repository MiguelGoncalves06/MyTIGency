import { useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useMarqueeDecode } from '../hooks/useMarqueeDecode'

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
          const num = `[${String((index % phrases.length) + 1).padStart(2, '0')}]`
          return (
            <span className="marquee-item" key={index}>
              <span className="marquee-num" data-decode={num}>{num}</span>
              <span data-decode={phrase}>{phrase}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
