import { RedText } from './RedText'
import { useScene } from '../context/SceneContext'

export function Hero() {
  const { slotRef } = useScene()

  return (
    <div className="hero-pin-wrapper">
      <div className="hero-sticky-inner">
        <section className="hero" id="top">
          <div className="hero-left">
            <span className="eyebrow">Studio de produto digital — desde 2026</span>
            <h1 className="headline display">
              <span className="headline-line headline-line--1">FUNCIONAR</span>
              <span className="headline-line headline-line--2">É COMUM.</span>
              <span className="headline-line headline-line--3">VENCER</span>
              <span className="headline-line headline-line--4">
                <RedText className="accent" block>É RARO.</RedText>
              </span>
            </h1>
          </div>
          <div className="hero-right">
            <div id="ascii-logo-hero" ref={slotRef} aria-hidden="true" />
            <div className="hero-copy">
              <p>Produto que funciona é o mínimo. <b>Produto que vence</b> é o que muda o número no fim do trimestre — e isso não acontece por acidente.</p>
              <p>Somos um time de <b>design, engenharia e produto</b>, construindo para marcas que já sabem a diferença entre lançar e vencer. [Placeholder] Clientes: <b>[Cliente A], [Cliente B], [Cliente C]</b>.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
