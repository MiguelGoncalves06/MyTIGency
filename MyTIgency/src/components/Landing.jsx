import { useScene } from '../context/SceneContext'
import { useLanguage } from '../context/LanguageContext'
import './Landing.css'

export function Landing() {
  const { phase, scrollToHero } = useScene()
  const { lang, setLang, t } = useLanguage()

  return (
    <section
      id="landing"
      aria-hidden={phase === 'hero'}
    >
      <div className="landing-ambient-glow" aria-hidden="true" />

      <div className="lang-toggle" role="group" aria-label={t.landing.langAria}>
        <button
          type="button"
          className={lang === 'pt' ? 'active' : ''}
          aria-pressed={lang === 'pt'}
          onClick={() => setLang('pt')}
        >
          PT
        </button>
        <span className="divider">/</span>
        <button
          type="button"
          className={lang === 'en' ? 'active' : ''}
          aria-pressed={lang === 'en'}
          onClick={() => setLang('en')}
        >
          EN
        </button>
      </div>

      <div className="landing-masthead">
        <div className="masthead-badge">
          <span className="badge-pulse" />
          <span className="badge-label">{t.landing.badge}</span>
          <span className="badge-divider">—</span>
          <span className="badge-year">2026</span>
        </div>

        <p className="landing-brand-name display">
          MyTigency<span className="brand-accent-dot">.</span>
        </p>
      </div>

      <button
        type="button"
        className="scroll-down"
        aria-label={t.landing.scrollAria}
        onClick={scrollToHero}
      >
        <svg className="progress-ring" viewBox="0 0 44 44" aria-hidden="true">
          <circle className="progress-ring-track" cx="22" cy="22" r="18" />
          <circle className="progress-ring-fill" cx="22" cy="22" r="18" />
        </svg>
        <svg
          className="scroll-chevron"
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </section>
  )
}
