import { useLanguage } from '../context/LanguageContext'
import star from '../assets/star.svg'

export function Marquee() {
  const { t } = useLanguage()
  const phrases = t.marquee.phrases

  // Repete o array 4 vezes para fazer o loop infinito do Marquee
  const repeatedPhrases = Array(4).fill(phrases).flat()

  return (
    <div className="marquee">
      <div className="marquee-track" id="marqueeTrack">
        {repeatedPhrases.map((phrase, index) => (
          <span className="marquee-item" key={index}>
            <span>{phrase}</span>
            <img src={star} alt="" className="marquee-icon" />
          </span>
        ))}
      </div>
    </div>
  )
}