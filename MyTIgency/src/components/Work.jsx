import { RedText } from './RedText'
import { useLanguage } from '../context/LanguageContext'

export function Work(){
  const { t } = useLanguage()

  return (
        <section className="work" id="trabalhos">
        <div className="section-head reveal">
          <span className="eyebrow">{t.work.eyebrow}</span>
          <h2>{t.work.heading}</h2>
        </div>
        <div className="work-grid">
          {t.work.cases.map((item, i) => (
            <div className="work-card reveal" key={i}>
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
        <a href="#" className="btn solid">{t.work.ctaButton}</a>
      </section>
      </section>
    )
}