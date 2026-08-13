import { useReveal } from '../hooks/useReveal'
import { RedText } from './RedText'

export function Services() {
  useReveal()

  return (
    <section className="services" id="servicos">
      <div className="section-head reveal">
        <span className="eyebrow">O que fazemos</span>
        <h2><RedText>Duas</RedText> pessoas.<br />Um único time.</h2>
      </div>
      <div className="service-grid">
        <div className="service-card reveal">
          <div className="num">01</div>
          <h3>Design</h3>
          <p>[Placeholder] Identidade visual, produto e interface — decisões de design que carregam a marca em cada pixel.</p>
        </div>
        <div className="service-card reveal">
          <div className="num">02</div>
          <h3>Engenharia</h3>
          <p>[Placeholder] Front-end, back-end e infraestrutura construídos para durar — sem gambiarra, sem dívida técnica escondida.</p>
        </div>
        <div className="service-card reveal">
          <div className="num">03</div>
          <h3>Produto</h3>
          <p>[Placeholder] Estratégia e priorização — o que construir, na ordem certa, com o motivo certo.</p>
        </div>
      </div>
    </section>
  )
}
