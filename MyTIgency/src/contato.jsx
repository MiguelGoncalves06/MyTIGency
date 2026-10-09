import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CSS antes dos componentes: a cortina da transição (pageTransition.js) é
// montada quando o módulo carrega e precisa do estilo dela já presente
import './index.css'
import './App.css'
import { Header } from './components/Header'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { ContextualCursor } from './components/ContextualCursor'
import { SmoothScroll } from './components/SmoothScroll'
import { LanguageProvider } from './context/LanguageContext'
import { markPageReady } from './utils/pageTransition'

// Página de contato (/contato). Sem LoadingScreen: chegando pela cortina de
// dither, ela revela a página quando as fontes estão prontas.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SmoothScroll>
      <LanguageProvider>
        <ContextualCursor />
        <Header page="contact" />
        <div className="app-shell">
          <Contact />
          <Footer />
        </div>
      </LanguageProvider>
    </SmoothScroll>
  </StrictMode>,
)
// fonts.ready sozinho resolve antes de as fontes serem pedidas: carrega as da
// primeira dobra explicitamente (o título não pode aparecer com fallback)
Promise.all([
  document.fonts.load('400 132px "Roslindale Display Condensed"'),
  document.fonts.load('400 15px "JetBrains Mono"'),
  document.fonts.load('400 30px "Roslindale Display Narrow"'),
]).catch(() => {}).then(() => document.fonts.ready).then(markPageReady)
