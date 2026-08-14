import { useHeaderScroll } from '../hooks/useHeaderScroll'

export function Header(){
  const scrolled = useHeaderScroll()

  return (
      <header className={scrolled ? 'scrolled' : ''}>
        <a href="#top" className="brand"><span className="mark">&gt;_</span> RUNTIME.</a>
        <div className="nav-right">
          <nav>
            <ul>
              <li><a href="#top" className="active">Home</a></li>
              <li><a href="#trabalhos">Trabalhos</a></li>
              <li><a href="#carreiras">Carreiras</a></li>
            </ul>
          </nav>
          <a href="#contato" className="btn">Fale conosco →</a>
        </div>
      </header>
  )
}
