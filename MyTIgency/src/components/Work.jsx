import { RedText } from './RedText'

export function Work(){
  return (
        <section className="work" id="trabalhos">
        <div className="section-head reveal">
          <span className="eyebrow">Trabalhos selecionados</span>
          <h2>Alguns dos produtos que ajudamos a vencer.</h2>
        </div>
        <div className="work-grid">
          <div className="work-card reveal">
            <div className="work-thumb">[ CASE 01 ]</div>
            <div className="work-info">
              <div className="tag">Placeholder</div>
              <h3>[Nome do projeto]</h3>
              <p>[Placeholder] Descrição curta do case — problema, abordagem e resultado.</p>
            </div>
          </div>
          <div className="work-card reveal">
            <div className="work-thumb">[ CASE 02 ]</div>
            <div className="work-info">
              <div className="tag">Placeholder</div>
              <h3>[Nome do projeto]</h3>
              <p>[Placeholder] Descrição curta do case — problema, abordagem e resultado.</p>
            </div>
          </div>
          <div className="work-card reveal">
            <div className="work-thumb">[ CASE 03 ]</div>
            <div className="work-info">
              <div className="tag">Placeholder</div>
              <h3>[Nome do projeto]</h3>
              <p>[Placeholder] Descrição curta do case — problema, abordagem e resultado.</p>
            </div>
          </div>
        </div>

              <section className="cta-band" id="contato">
        <h2>Vamos construir algo que <RedText>vence?</RedText></h2>
        <a href="#" className="btn solid">Reach out →</a>
      </section>
      </section>
    )
}