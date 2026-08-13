import { useRef } from 'react'
import { useAsciiDonut } from '../hooks/useAsciiDonut'
import { RedText } from './RedText'

export function Hero() {
  const donutRef = useRef(null)
  
  useAsciiDonut(donutRef)

  return (
    <section className="hero" id="top" style={{ paddingTop: '64px' }}>
      <div className="hero-left">
        <span className="eyebrow">Studio de produto digital — desde 2026</span>
        <h1 className="headline display">
          <span>FUNCIONAR</span>
          <span>É COMUM.</span>
          <span>VENCER</span>
          <RedText className="accent" block>É RARO.</RedText>
        </h1>
      </div>
      <div className="hero-right">
        <pre id="asciiDonut" ref={donutRef}></pre>
        <div className="hero-copy">
          <p>Produto que funciona é o mínimo. <b>Produto que vence</b> é o que muda o número no fim do trimestre — e isso não acontece por acidente.</p>
          {/* Adicionado o segundo parágrafo que faltava */}
          <p>Somos um time de <b>design, engenharia e produto</b>, construindo para marcas que já sabem a diferença entre lançar e vencer. [Placeholder] Clientes: <b>[Cliente A], [Cliente B], [Cliente C]</b>.</p>
        </div>
      </div>
    </section>
  )
}