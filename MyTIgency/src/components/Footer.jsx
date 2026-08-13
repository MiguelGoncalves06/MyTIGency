export function Footer(){
  return (
        <footer id="carreiras">
        <div className="footer-grid">
          <div>
            <a href="#top" className="brand" style={{ marginBottom: '14px', display: 'inline-flex' }}>
              <span className="mark">&gt;_</span> RUNTIME.
            </a>
            <p style={{ color: 'var(--ink-dim)', fontSize: '13px', lineHeight: '1.6', maxWidth: '32ch', marginTop: '14px' }}>
              [Placeholder] Uma linha curta sobre o studio — quem somos e o que nos move.
            </p>
          </div>
          <div>
            <h5>Studio</h5>
            <ul>
              <li><a href="#servicos">Serviços</a></li>
              <li><a href="#trabalhos">Trabalhos</a></li>
              <li><a href="#carreiras">Carreiras</a></li>
            </ul>
          </div>
          <div>
            <h5>Social</h5>
            <ul>
              <li><a href="#">[Instagram]</a></li>
              <li><a href="#">[LinkedIn]</a></li>
            </ul>
          </div>
          <div>
            <h5>Contato</h5>
            <ul>
              <li><a href="#">placeholder@runtime.studio</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 RUNTIME. — placeholder</span>
          <span>Feito com café e commits tardios.</span>
        </div>
      </footer>
    )
}