import { RedText } from './RedText'
import { Services } from './Services'
import { useLanguage } from '../context/LanguageContext'

// giro de cada card ao assentar na folha (ciclo de 6, como no LAB v13)
const TILT = [-2.2, 1.6, -1.1, 2.4, -1.8, 1.2]

// Trabalhos: a folha branca onde o Manifesto termina (utils/manifestoPC.js).
// Serviços abre a seção; os cards caem e assentam quando entram (.reveal → .in, useReveal).
export function Work(){
  const { t } = useLanguage()

  return (
        <section className="work" id="trabalhos">
        <Services />
        <div className="section-head reveal">
          <span className="eyebrow">{t.work.eyebrow}</span>
          <h2>{t.work.heading}</h2>
        </div>
        <div className="work-grid">
          {t.work.cases.map((item, i) => (
            <div className="work-card reveal" key={i} style={{ '--r': `${TILT[i % TILT.length]}deg` }}>
              <div className="work-thumb">{item.thumb}</div>
              <div className="work-info">
                <div className="tag">{item.tag}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

              <section className="cta-band" id="contato">
        <h2>{t.work.ctaPre}<RedText>{t.work.ctaAccent}</RedText></h2>
        <a href="/contato" className="btn solid">{t.work.ctaButton}</a>
      </section>
      </section>
    )
}
