import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Services } from './components/Services'
import { Work } from './components/Work'
import { Footer } from './components/Footer'
import { ContextualCursor } from './components/ContextualCursor'
import { SmoothScroll } from './components/SmoothScroll'
import { LanguageProvider } from './context/LanguageContext'
import './App.css'

function App() {
  return (
    <SmoothScroll>
      <LanguageProvider>
        <ContextualCursor />
        <Header />
        <div className="app-shell">
          <Hero />
          <Marquee />
          <Services />
          <Work />
          <Footer />
        </div>
      </LanguageProvider>
    </SmoothScroll>
  )
}

export default App
