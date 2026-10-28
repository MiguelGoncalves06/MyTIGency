import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { Marquee } from '../components/Marquee'
import { Manifesto } from '../components/Manifesto'
import { Work } from '../components/Work'
import { Footer } from '../components/Footer'
import { LoadingScreen } from '../components/LoadingScreen'
import { useHeroMarqueeReveal } from '../hooks/useHeroMarqueeReveal'
import { useAppReady } from '../hooks/useAppReady'
import { hasNavigated, markPageReady } from '../utils/pageTransition'

// Chegando pela cortina de dither, a própria cortina é a tela de
// carregamento: segura com o mesmo gate (fontes + modelo 3D) e só então
// revela — o LoadingScreen fica só para a primeira página aberta.
function PageReadyGate() {
  const isReady = useAppReady()
  useEffect(() => {
    if (isReady) markPageReady()
  }, [isReady])
  return null
}

export default function HomePage() {
  useHeroMarqueeReveal()
  const [firstPage] = useState(() => !hasNavigated())

  return (
    <>
      <Header />
      <div className="app-shell">
        <Hero />
        <div className="reveal-spacer" aria-hidden="true" />
        <Marquee />
        <div className="reveal-panel">
          <Manifesto />
          {/* Serviços faz parte de Trabalhos (Work.jsx) */}
          <Work />
        </div>
        {/* Fora do .reveal-panel: o footer (z-index:-1) fica preso atrás dele e é revelado pelo scroll */}
        <Footer />
      </div>
      {firstPage ? <LoadingScreen /> : <PageReadyGate />}
    </>
  )
}
