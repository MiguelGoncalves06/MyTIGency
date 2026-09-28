import { Fragment, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useManifestoReveal } from '../hooks/useManifestoReveal'

// Papel de cada linha: "lead" = tese/fechamento (display, Archivo Black),
// "support" = bloco de explicação (mono, menor) — contraste de escala em
// vez de tratar as 7 linhas como unidades iguais.
const LEAD_INDICES = new Set([0, 5, 6])
// Respiro extra depois da abertura (0) e depois do bloco de explicação (4),
// agrupando por relação de sentido em vez de espaçamento uniforme.
const GAP_AFTER_INDICES = new Set([0, 4])

function ManifestoLine({ text, isLead, hasGapAfter, isAccent }) {
  const words = text.split(' ')
  const className = [
    'manifesto-line',
    isLead ? 'manifesto-line--lead' : 'manifesto-line--support',
    hasGapAfter ? 'manifesto-line--gap-after' : '',
    isAccent ? 'manifesto-line--accent' : '',
  ].filter(Boolean).join(' ')

  return (
    <p className={className} data-manifesto-line>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="manifesto-word" data-manifesto-word>{word}</span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </p>
  )
}

export function Manifesto() {
  const { t } = useLanguage()
  const lines = t.manifesto.lines
  const sectionRef = useRef(null)
  useManifestoReveal(sectionRef)

  return (
    <section className="manifesto" id="manifesto" ref={sectionRef}>
      <div className="manifesto-grid" aria-hidden="true" data-manifesto-grid-layer />
      <div className="manifesto-text">
        {lines.map((line, i) => (
          <ManifestoLine
            key={line}
            text={line}
            isLead={LEAD_INDICES.has(i)}
            hasGapAfter={GAP_AFTER_INDICES.has(i)}
            isAccent={i === lines.length - 1}
          />
        ))}
      </div>
      <span className="manifesto-counter" data-manifesto-counter aria-hidden="true">
        {`01 / ${String(lines.length).padStart(2, '0')}`}
      </span>
    </section>
  )
}
