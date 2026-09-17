import { useLanguage } from '../context/LanguageContext'

export function Footer(){
  const { t } = useLanguage()

  return (
        <footer id="carreiras">
        <div className="footer-grid">
          <div>
            <a href="#top" className="brand" style={{ marginBottom: '14px', display: 'inline-flex' }}>
              <span className="mark">&gt;_</span> {t.footer.brand}
            </a>
            <p style={{ color: 'var(--ink-dim)', fontSize: '13px', lineHeight: '1.6', maxWidth: '32ch', marginTop: '14px' }}>
              {t.footer.desc}
            </p>
          </div>
          <div>
            <h5>{t.footer.studioLabel}</h5>
            <ul>
              <li><a href="#servicos">{t.footer.navServices}</a></li>
              <li><a href="#trabalhos">{t.footer.navWork}</a></li>
              <li><a href="#carreiras">{t.footer.navCareers}</a></li>
            </ul>
          </div>
          <div>
            <h5>{t.footer.socialLabel}</h5>
            <ul>
              <li><a href="#">[Instagram]</a></li>
              <li><a href="#">[LinkedIn]</a></li>
            </ul>
          </div>
          <div>
            <h5>{t.footer.contactLabel}</h5>
            <ul>
              <li><a href="#">{t.footer.email}</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t.footer.copyright}</span>
          <span>{t.footer.tagline}</span>
        </div>
      </footer>
    )
}