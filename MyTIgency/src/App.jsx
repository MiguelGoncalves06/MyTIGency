import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Services } from './components/Services'
import { Work } from './components/Work'
import { Footer } from './components/Footer'
import { ContextualCursor } from './components/ContextualCursor'
import { SmoothScroll } from './components/SmoothScroll'
import { LanguageProvider } from './context/LanguageContext'
import { useHeroMarqueeReveal } from './hooks/useHeroMarqueeReveal'
import './App.css'

function AppShell() {
  useHeroMarqueeReveal()

  return (
    <div className="app-shell">
      <Hero />
      <div className="reveal-spacer" aria-hidden="true" />
      <Marquee />
      <div className="reveal-panel">
        <div className="marquee-dock-spacer" aria-hidden="true" />
        <Services />
        <Work />
        <Footer />
      </div>
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
      </LanguageProvider>
    </SmoothScroll>
  )
}

export default App
