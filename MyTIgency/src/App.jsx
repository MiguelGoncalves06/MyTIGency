// src/App.jsx
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Services } from './components/Services'
import { Work } from './components/Work'
import { Footer } from './components/Footer'
import { useRedPhysics } from './hooks/useRedPhysics'
import './App.css'

function App() {
  useRedPhysics()

  return (
    <div>
      <Header />
      <Hero />
      <Marquee />
      <Services />
      <Work />
      <Footer />
    </div>
  )
}

export default App