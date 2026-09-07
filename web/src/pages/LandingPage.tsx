import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="landing-wrapper">
      {/* Top Navbar */}
      <header className="landing-header">
        <div className="landing-container landing-nav-container">
          <div className="landing-brand">
            <span className="brand-logo">somma</span>
            <span className="brand-tag">finanças inteligentes</span>
          </div>
          <nav className="landing-nav-links">
            <Link to="/login" className="btn-landing-login">
              Entrar
            </Link>
            <Link to="/register" className="btn-landing-cta">
              Começar Grátis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-content">
            <div className="landing-badge">
              <span>🚀 Gestão Financeira Pessoal Simplificada</span>
            </div>
            <h1 className="landing-title">
              Controle suas finanças com clareza, <span className="text-gradient">sem esforço.</span>
            </h1>
            <p className="landing-description">
              Cadastre suas receitas, acompanhe seus gastos no crédito, débito e PIX, e tenha total controle do seu orçamento em uma interface limpa, ultra rápida e focada na sua privacidade.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register" className="btn-landing-cta btn-large">
                Começar Agora
              </Link>
              <Link to="/login" className="btn-landing-secondary btn-large">
                Já tenho conta →
              </Link>
            </div>
            <div className="landing-hero-perks">
              <span>✓ 100% Gratuito</span>
              <span>✓ Rápido & Sem Anúncios</span>
              <span>✓ Focado em Privacidade</span>
            </div>
          </div>

          <div className="landing-hero-preview">
            <div className="preview-card-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="mockup-title">somma.nilbyte.com.br</div>
              </div>
              <div className="mockup-body">
                <div className="mockup-stats-grid">
                  <div className="mockup-stat-box positive">
                    <span className="stat-label">Receitas do Mês</span>
                    <strong className="stat-value">R$ 14.800,00</strong>
                  </div>
                  <div className="mockup-stat-box negative">
                    <span className="stat-label">Despesas Totais</span>
                    <strong className="stat-value">R$ 6.340,50</strong>
                  </div>
                  <div className="mockup-stat-box highlight">
                    <span className="stat-label">Saldo em Caixa</span>
                    <strong className="stat-value">R$ 8.459,50</strong>
                  </div>
                </div>

                <div className="mockup-transactions-list">
                  <div className="mockup-tx-row">
                    <div className="mockup-tx-info">
                      <span className="tx-dot income" />
                      <div>
                        <strong>Salário Mensal</strong>
                        <small>Renda Principal • 02 Set</small>
                      </div>
                    </div>
                    <span className="tx-amount positive">+ R$ 12.000,00</span>
                  </div>
                  <div className="mockup-tx-row">
                    <div className="mockup-tx-info">
                      <span className="tx-dot expense" />
                      <div>
                        <strong>Supermercado & Feira</strong>
                        <small>Alimentação • 05 Set</small>
                      </div>
                    </div>
                    <span className="tx-amount negative">- R$ 640,00</span>
                  </div>
                  <div className="mockup-tx-row">
                    <div className="mockup-tx-info">
                      <span className="tx-dot credit" />
                      <div>
                        <strong>Assinaturas & Nuvem</strong>
                        <small>Cartão de Crédito • 08 Set</small>
                      </div>
                    </div>
                    <span className="tx-amount credit-val">- R$ 189,90</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="landing-features">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Tudo o que você precisa para dominar suas contas</h2>
            <p className="section-subtitle">Construído com simplicidade, desempenho extremo e respeito aos seus dados.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💸</div>
              <h3>Entradas e Despesas</h3>
              <p>Gestão visual de despesas diárias, parcelamentos no cartão, pagamentos à vista e transações via PIX.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Orçamentos & Envelopes</h3>
              <p>Controle de limites por categoria e metas mensais com acompanhamento do saldo restante em tempo real.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Relatórios & Analytics</h3>
              <p>Visão clara da evolução do seu patrimônio, balanço mensal e distribuição detalhada de despesas.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Privacidade & Segurança</h3>
              <p>Modo de privacidade com ocultação de saldo num clique, criptografia e política rígida: seus dados nunca são vendidos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights / Demonstration (PWA + Shortcuts) */}
      <section className="landing-highlights">
        <div className="landing-container highlights-grid">
          <div className="highlight-card">
            <div className="highlight-badge">⚡ Alta Produtividade</div>
            <h3 className="highlight-title">Atalhos de Teclado Rápidos</h3>
            <p className="highlight-desc">
              Feito para quem prefere agilidade. Registre movimentações e navegue sem tirar as mãos do teclado.
            </p>
            <div className="shortcuts-preview-box">
              <div className="shortcut-row">
                <span className="shortcut-key">N</span>
                <span className="shortcut-desc">Nova despesa rápida</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-key">P</span>
                <span className="shortcut-desc">Alternar Modo Privacidade</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-key">/</span>
                <span className="shortcut-desc">Focar campo de busca</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-key">ESC</span>
                <span className="shortcut-desc">Fechar modal ou formulário</span>
              </div>
            </div>
          </div>

          <div className="highlight-card">
            <div className="highlight-badge">📱 Sempre Disponível</div>
            <h3 className="highlight-title">Suporte Offline e PWA</h3>
            <p className="highlight-desc">
              Instale o Somma como app nativo no celular ou computador. Seus lançamentos funcionam mesmo sem sinal de internet e sincronizam assim que reconectar.
            </p>
            <div className="pwa-status-box">
              <div className="pwa-indicator">
                <span className="pwa-pulse" />
                <strong>Operação Offline First & PWA Ready</strong>
              </div>
              <p className="pwa-hint">
                Sem tempo de espera ou telas de carregamento lentas. O Somma salva instantaneamente no cache local do seu navegador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="landing-cta-banner">
        <div className="landing-container cta-banner-inner">
          <h2>Pronto para assumir o controle do seu dinheiro?</h2>
          <p>Cadastre-se gratuitamente agora e comece a organizar sua vida financeira em menos de 1 minuto.</p>
          <div className="cta-banner-buttons">
            <Link to="/register" className="btn-landing-cta btn-large">
              Começar Agora
            </Link>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="footer-brand">
            <strong>somma</strong>
            <span>Gestão de finanças pessoais</span>
          </div>

          <div className="footer-links-group">
            <a href="https://git.nilbyte.com.br/nilbyte/somma" target="_blank" rel="noopener noreferrer" className="footer-nav-link">
              GitHub / Gitea
            </a>
            <span className="footer-sep">•</span>
            <a href="/api/v1/healthz" target="_blank" rel="noopener noreferrer" className="footer-nav-link">
              API Health
            </a>
            <span className="footer-sep">•</span>
            <a href="https://nilbyte.com.br" target="_blank" rel="noopener noreferrer" className="footer-nav-link">
              Privacidade & Termos
            </a>
          </div>

          <div className="footer-meta">
            <span>Desenvolvido com carinho por <a href="https://nilbyte.com.br" target="_blank" rel="noopener noreferrer">nilbyte</a></span>
            <span className="footer-sep">•</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
