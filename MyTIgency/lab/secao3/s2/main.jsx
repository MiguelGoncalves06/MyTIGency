// LAB: seção 1 + 2 reais do site (componente Manifesto) com a seção 3 trocada
// pelo "Split + cursor 3D" — para ver a seção 2 caminhando para a 3.
import { createRoot } from 'react-dom/client'
import { useLenis } from 'lenis/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '../../../src/index.css'
import '../../../src/App.css'
import { SmoothScroll } from '../../../src/components/SmoothScroll'
import { LanguageProvider } from '../../../src/context/LanguageContext'
import { Manifesto } from '../../../src/components/Manifesto'
import { useLabHorizontal } from './useLabHorizontal'

// Na home quem faz isso é useHeroMarqueeReveal (lenis.on('scroll', ScrollTrigger.update)).
// Sem ele o pin por transform corrige a posição um quadro depois do scroll do
// Lenis: o bloco fixado treme/pisca a cada quadro.
function ScrollSync() {
  useLenis(() => ScrollTrigger.update())
  return null
}

// Entrada sem fronteira de HMR: editar este arquivo recarrega a página (senão
// o módulo roda de novo e cria uma segunda raiz React — tudo em dobro).
import.meta.hot?.decline()

createRoot(document.getElementById('root')).render(
  <SmoothScroll>
    <ScrollSync />
    <LanguageProvider>
      <Manifesto section3={<div className="s3x" />} useHorizontal={useLabHorizontal} />
      <div className="lab-tail">fim do LAB · <a href="../">voltar aos protótipos</a></div>
    </LanguageProvider>
  </SmoothScroll>,
)
