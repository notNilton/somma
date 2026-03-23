import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  redirect,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { PrivacyProvider } from '../lib/privacy';
import { auth } from '../lib/auth';

import appCss from '../styles.css?url';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // O guard de autenticação APENAS no browser, nunca no servidor.
  beforeLoad: ({ location }) => {
    if (typeof window === 'undefined') return;

    const isPublic = ['/login', '/register'].includes(location.pathname);
    const isAuthenticated = auth.isAuthenticated();

    if (!isAuthenticated && !isPublic) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }

    if (isAuthenticated && location.pathname === '/login') {
      throw redirect({ to: '/' });
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'BudgetWise' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootDocument,
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <h2 className="text-2xl font-bold">Página não encontrada</h2>
      <p className="text-muted-foreground">Ops! O caminho que você tentou acessar não existe.</p>
      <a href="/" className="text-primary font-bold hover:underline">
        Voltar para o início
      </a>
    </div>
  ),
});

function RootDocument() {
  const location = useLocation();
  const { queryClient } = Route.useRouteContext();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)] h-screen overflow-hidden flex flex-col">
        <QueryClientProvider client={queryClient}>
          <PrivacyProvider>
            {!isAuthPage && <Header />}
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
            {!isAuthPage && <Footer />}

            <TanStackDevtools
              config={{ position: 'bottom-right' }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </PrivacyProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
