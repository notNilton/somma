import { Link } from 'react-router-dom'

const features = [
  {
    title: 'Lançamentos',
    text: 'Receitas e despesas no crédito, débito e PIX, com parcelamentos e recorrências.',
  },
  {
    title: 'Orçamentos',
    text: 'Limites por categoria e saldo restante do mês, atualizado a cada lançamento.',
  },
  {
    title: 'Relatórios',
    text: 'Balanço mensal, evolução do patrimônio e distribuição de despesas por categoria.',
  },
  {
    title: 'Privacidade',
    text: 'Oculte valores com uma tecla. Sem anúncios e sem venda de dados.',
  },
]

const shortcuts = [
  { key: 'N', desc: 'Nova despesa' },
  { key: 'P', desc: 'Modo privacidade' },
  { key: '/', desc: 'Buscar' },
  { key: 'Esc', desc: 'Fechar' },
]

const bars = [42, 58, 35, 71, 49, 64, 38, 55, 80, 46, 61, 52]

export default function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <span className="lp-logo">somma</span>
          <nav className="lp-nav">
            <Link to="/login" className="lp-link">Entrar</Link>
            <Link to="/register" className="lp-btn lp-btn-primary">Criar conta</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-text">
              <p className="lp-eyebrow">Finanças pessoais</p>
              <h1 className="lp-title">Suas contas, organizadas em um só lugar.</h1>
              <p className="lp-lead">
                Registre receitas e despesas, acompanhe cartões e orçamentos e veja para onde o seu dinheiro vai.
              </p>
              <div className="lp-actions">
                <Link to="/register" className="lp-btn lp-btn-primary">Começar grátis</Link>
                <Link to="/login" className="lp-btn">Já tenho conta</Link>
              </div>
            </div>

            <figure className="lp-preview" aria-label="Prévia do painel do Somma">
              <div className="lp-preview-bar">
                <span>Setembro 2026</span>
                <span className="lp-muted">Painel</span>
              </div>
              <div className="lp-stats">
                <div>
                  <span className="lp-stat-label">Receitas</span>
                  <strong className="lp-num">14.800,00</strong>
                </div>
                <div>
                  <span className="lp-stat-label">Despesas</span>
                  <strong className="lp-num">6.340,50</strong>
                </div>
                <div>
                  <span className="lp-stat-label">Saldo</span>
                  <strong className="lp-num lp-pos">8.459,50</strong>
                </div>
              </div>
              <div className="lp-chart" aria-hidden="true">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} className={i === 8 ? 'is-active' : undefined} />
                ))}
              </div>
              <table className="lp-table">
                <tbody>
                  <tr>
                    <td>02/09</td>
                    <td>Salário</td>
                    <td className="lp-num lp-pos">+12.000,00</td>
                  </tr>
                  <tr>
                    <td>05/09</td>
                    <td>Supermercado</td>
                    <td className="lp-num">−640,00</td>
                  </tr>
                  <tr>
                    <td>08/09</td>
                    <td>Assinaturas</td>
                    <td className="lp-num">−189,90</td>
                  </tr>
                </tbody>
              </table>
            </figure>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <h2 className="lp-h2">O que tem no Somma</h2>
            <div className="lp-features">
              {features.map((f, i) => (
                <article key={f.title} className="lp-feature">
                  <span className="lp-index">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container lp-split">
            <div className="lp-block">
              <h2 className="lp-h2">Atalhos de teclado</h2>
              <p className="lp-muted">Lance e navegue sem tirar as mãos do teclado.</p>
              <dl className="lp-keys">
                {shortcuts.map(s => (
                  <div key={s.key}>
                    <dt><kbd>{s.key}</kbd></dt>
                    <dd>{s.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="lp-block">
              <h2 className="lp-h2">Funciona offline</h2>
              <p className="lp-muted">
                Instale como app no celular ou no computador. Os lançamentos ficam salvos no aparelho e sincronizam quando a conexão volta.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-section lp-cta">
          <div className="lp-container lp-cta-inner">
            <h2 className="lp-h2">Comece agora. É gratuito.</h2>
            <Link to="/register" className="lp-btn lp-btn-primary">Criar conta</Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span>somma · {new Date().getFullYear()}</span>
          <nav className="lp-footer-links">
            <a href="https://git.nilbyte.com.br/nilbyte/somma" target="_blank" rel="noopener noreferrer">Código</a>
            <a href="/api/v1/healthz" target="_blank" rel="noopener noreferrer">Status</a>
            <a href="https://nilbyte.com.br" target="_blank" rel="noopener noreferrer">Privacidade</a>
            <a href="https://nilbyte.com.br" target="_blank" rel="noopener noreferrer">nilbyte</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
