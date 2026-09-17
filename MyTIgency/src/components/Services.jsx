import { useReveal } from '../hooks/useReveal'
import { RedText } from './RedText'
import { useLanguage } from '../context/LanguageContext'

export function Services() {
  useReveal()
  const { t } = useLanguage()

  return (
    <section className="services" id="servicos">
      <div className="section-head reveal">
        <span className="eyebrow">{t.services.eyebrow}</span>
        <h2><RedText>{t.services.headingAccent}</RedText> {t.services.headingLine1}<br />{t.services.headingLine2}</h2>
      </div>
      <div className="service-grid">
        {t.services.cards.map((card) => (
          <div className="service-card reveal" key={card.num}>
            <div className="num">{card.num}</div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
