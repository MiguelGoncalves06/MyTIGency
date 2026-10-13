// LAB: Manifesto real (seções 1, 2 e 3, pin lateral, PC) com o grupo da
// esquerda da seção 2 trocado pelo layout novo "NÓS conversamos e resolvemos
// tudo." — e um menu de variações (?v=0|a|b|c|d) para validar cada uma antes
// de ir para o site. Trocar de variação recarrega a página (os gatilhos de
// scroll do Manifesto são medidos de novo do zero).
import { createRoot } from 'react-dom/client'
import { useLenis } from 'lenis/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '../../src/index.css'
import '../../src/App.css'
import './sem.css'
import './variants.css'
import { SmoothScroll } from '../../src/components/SmoothScroll'
import { LanguageProvider } from '../../src/context/LanguageContext'
import { Manifesto } from '../../src/components/Manifesto'
import { SemGroup } from './SemGroup'
import { VARIANTS, CHAT_SCRIPTS } from './variants'

// Na home quem faz isso é useHeroMarqueeReveal (lenis.on('scroll', ScrollTrigger.update)).
function ScrollSync() {
  useLenis(() => ScrollTrigger.update())
  return null
}

const param = new URLSearchParams(location.search).get('v')
const variant = param in VARIANTS ? param : '0'
const scriptParam = new URLSearchParams(location.search).get('roteiro')
const script = scriptParam in CHAT_SCRIPTS ? scriptParam : '2'

function LabMenu() {
  return (
    <nav className="lab-menu" aria-label="Variações do LAB">
      <span>LAB · NÓS</span>
      {Object.entries(VARIANTS).map(([k, v]) => (
        <a key={k} href={`?v=${k}`} aria-current={k === variant ? 'page' : undefined}>{v.label}</a>
      ))}
      {variant === 'b' && <>
        <span>roteiro</span>
        {Object.entries(CHAT_SCRIPTS).map(([k, s]) => (
          <a key={k} href={`?v=b&roteiro=${k}`} aria-current={k === script ? 'page' : undefined}>{k} · {s.label}</a>
        ))}
      </>}
    </nav>
  )
}

import.meta.hot?.decline()

createRoot(document.getElementById('root')).render(
  <SmoothScroll>
    <ScrollSync />
    <LabMenu />
    <LanguageProvider>
      <Manifesto withoutGroup={<SemGroup variant={variant} />} />
      <div className="lab-tail">fim do LAB</div>
    </LanguageProvider>
  </SmoothScroll>,
)
