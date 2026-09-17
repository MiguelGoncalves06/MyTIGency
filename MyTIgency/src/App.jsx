import { Landing } from './components/Landing'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Services } from './components/Services'
import { Work } from './components/Work'
import { Footer } from './components/Footer'
import { ContextualCursor } from './components/ContextualCursor'
import { SmoothScroll } from './components/SmoothScroll'
import { SceneProvider } from './context/SceneContext'
import { LanguageProvider } from './context/LanguageContext'
import { AsciiStage } from './components/AsciiStage'
import { useRedPhysics } from './hooks/useRedPhysics'
import './App.css'

function App() {
  useRedPhysics()

  return (
    <SmoothScroll>
      <LanguageProvider>
        <SceneProvider>
          <ContextualCursor />
          <AsciiStage />
          <Landing />
          <Header />
          <div className="intro-scroll-space" aria-hidden="true" />
          <div className="app-shell">
            <Hero />
            <Marquee />
            <Services />
            <Work />
            <Footer />
          </div>
        </SceneProvider>
      </LanguageProvider>
    </SmoothScroll>
  )
}

export default App
