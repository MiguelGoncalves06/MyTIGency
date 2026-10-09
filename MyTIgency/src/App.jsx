import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Manifesto } from './components/Manifesto'
import { Services } from './components/Services'
import { Work } from './components/Work'
import { Footer } from './components/Footer'
import { ContextualCursor } from './components/ContextualCursor'
import { LoadingScreen } from './components/LoadingScreen'
import { SmoothScroll } from './components/SmoothScroll'
import { LanguageProvider } from './context/LanguageContext'
import { useHeroMarqueeReveal } from './hooks/useHeroMarqueeReveal'
import { useEffect } from 'react'
import { useAppReady } from './hooks/useAppReady'
import { arrivedByTransition, markPageReady } from './utils/pageTransition'
import './App.css'

// Vindo de outra página pela cortina de dither, a própria cortina é a tela
// de carregamento: segura com o mesmo gate (fontes + modelo 3D) e só então
// revela — o LoadingScreen não aparece.
const arrivedCovered = arrivedByTransition()

function PageTransitionGate() {
  const isReady = useAppReady()
  useEffect(() => {
    if (isReady) markPageReady()
  }, [isReady])
  return null
}

function AppShell() {
  useHeroMarqueeReveal()

  return (
    <div className="app-shell">
      <Hero />
      <div className="reveal-spacer" aria-hidden="true" />
      <Marquee />
      <div className="reveal-panel">
        <Manifesto />
        <Services />
        <Work />
      </div>
      {/* Fora do .reveal-panel: o footer (z-index:-1) fica preso atrás dele e é revelado pelo scroll */}
      <Footer />
    </div>
  )
}

function App() {
  return (
    <SmoothScroll>
      <LanguageProvider>
        <ContextualCursor />
        <Header />
        <AppShell />
        {arrivedCovered ? <PageTransitionGate /> : <LoadingScreen />}
      </LanguageProvider>
    </SmoothScroll>
  )
}

export default App
